// 端末センサー（方位コンパス・背面カメラ）のラッパ。ライブAR（カメラでその場AR）で使用。
// いずれも端末/ブラウザ差が大きく、HTTPS かつユーザー操作起点が必要なことが多い。

// DeviceOrientation の利用許可（iOS 13+ は明示要求が必要。Android は通常不要）。
export async function requestOrientationPermission(): Promise<boolean> {
  const D = (window as unknown as { DeviceOrientationEvent?: { requestPermission?: () => Promise<string> } })
    .DeviceOrientationEvent;
  if (D && typeof D.requestPermission === "function") {
    try {
      return (await D.requestPermission()) === "granted";
    } catch {
      return false;
    }
  }
  return true;
}

export type OrientationReading = {
  headingDeg: number | null; // 方位（0=北, 時計回り）。スムージング済み
  betaDeg: number | null; // 前後傾き
  gammaDeg: number | null; // 左右傾き
};

// 円环量(0..360)の指数移動平均。0/360 のラップを跨いでも最短角で平滑化する。
function makeHeadingSmoother(alpha: number) {
  let s: number | null = null;
  return (h: number): number => {
    if (s == null) {
      s = h;
      return h;
    }
    const d = ((h - s + 540) % 360) - 180; // 最短角差 -180..180
    s = (((s + alpha * d) % 360) + 360) % 360;
    return s;
  };
}

type AbsSensor = {
  quaternion?: number[];
  start: () => void;
  stop: () => void;
  addEventListener: (t: string, h: () => void) => void;
  removeEventListener: (t: string, h: () => void) => void;
};

// 方位センサを購読。使える中で最も「融合された」方位源を選び、角度スムージングして返す。
//   Android Chrome 等: AbsoluteOrientationSensor（地磁気+加速度+ジャイロ融合＝最も安定）
//   iOS Safari:        webkitCompassHeading（CoreMotion 融合）
//   その他:             deviceorientationabsolute / deviceorientation の alpha（近似）
// 生の地磁気だけだとチラつくため、融合源＋EMA でネイティブ（地図アプリ）の安定感に近づける。
export function subscribeOrientation(cb: (r: OrientationReading) => void, smoothAlpha = 0.2): () => void {
  const smooth = makeHeadingSmoother(smoothAlpha);
  const emit = (rawHeading: number, beta: number | null = null, gamma: number | null = null) => {
    if (!Number.isFinite(rawHeading)) return;
    const h = ((rawHeading % 360) + 360) % 360;
    cb({ headingDeg: smooth(h), betaDeg: beta, gammaDeg: gamma });
  };

  let cleanup = () => {};

  // フォールバック: deviceorientation 系イベント（iOS=webkitCompassHeading / Android=absolute alpha）。
  const subscribeEvents = () => {
    const handler = (e: DeviceOrientationEvent) => {
      const anyE = e as DeviceOrientationEvent & { webkitCompassHeading?: number };
      if (typeof anyE.webkitCompassHeading === "number") {
        emit(anyE.webkitCompassHeading, e.beta, e.gamma); // iOS: 既に方位(0=北,時計回り)
      } else if (typeof e.alpha === "number") {
        emit(360 - e.alpha, e.beta, e.gamma); // 端末水平時の近似方位
      }
    };
    window.addEventListener("deviceorientationabsolute", handler as EventListener, true);
    window.addEventListener("deviceorientation", handler as EventListener, true);
    cleanup = () => {
      window.removeEventListener("deviceorientationabsolute", handler as EventListener, true);
      window.removeEventListener("deviceorientation", handler as EventListener, true);
    };
  };

  // 優先: AbsoluteOrientationSensor（融合センサー）。生成/許可に失敗したらイベント方式へ。
  const Ctor = (window as unknown as { AbsoluteOrientationSensor?: new (o?: { frequency?: number }) => AbsSensor })
    .AbsoluteOrientationSensor;
  if (typeof Ctor === "function") {
    try {
      const sensor = new Ctor({ frequency: 30 });
      const onReading = () => {
        const q = sensor.quaternion;
        if (!q || q.length < 4) return;
        const [x, y, z, w] = q;
        // デバイスY軸(上端)をワールドENUへ回し、方位 = atan2(East, North)（0=北, 時計回り）。
        const east = 2 * (x * y - w * z);
        const north = 1 - 2 * (x * x + z * z);
        emit((Math.atan2(east, north) * 180) / Math.PI);
      };
      const onError = () => {
        // 許可なし等 → センサーを畳んでイベント方式にフォールバック。
        sensor.removeEventListener("reading", onReading);
        sensor.removeEventListener("error", onError);
        try {
          sensor.stop();
        } catch {
          /* noop */
        }
        subscribeEvents();
      };
      sensor.addEventListener("reading", onReading);
      sensor.addEventListener("error", onError);
      sensor.start();
      cleanup = () => {
        sensor.removeEventListener("reading", onReading);
        sensor.removeEventListener("error", onError);
        try {
          sensor.stop();
        } catch {
          /* noop */
        }
      };
      return () => cleanup();
    } catch {
      // 構築不可（Permissions Policy 等） → イベント方式
    }
  }
  subscribeEvents();
  return () => cleanup();
}

// 背面カメラのライブ映像ストリームを取得。
export async function startRearCamera(): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("このブラウザ／接続ではカメラを利用できません（HTTPSが必要）");
  }
  return navigator.mediaDevices.getUserMedia({
    video: { facingMode: { ideal: "environment" } },
    audio: false,
  });
}

// ストリームの全トラックを停止（カメラを解放）。
export function stopStream(stream: MediaStream | null): void {
  stream?.getTracks().forEach((t) => t.stop());
}
