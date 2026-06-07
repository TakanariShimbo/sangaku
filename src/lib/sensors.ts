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
  headingDeg: number | null; // 方位（0=北, 時計回り）
  betaDeg: number | null; // 前後傾き
  gammaDeg: number | null; // 左右傾き
};

// コンパス方位を購読。iOS は webkitCompassHeading（既に方位）、Android は absolute の alpha から算出。
export function subscribeOrientation(cb: (r: OrientationReading) => void): () => void {
  const handler = (e: DeviceOrientationEvent) => {
    const anyE = e as DeviceOrientationEvent & { webkitCompassHeading?: number };
    let heading: number | null = null;
    if (typeof anyE.webkitCompassHeading === "number") {
      heading = anyE.webkitCompassHeading; // iOS: 0=北で時計回り
    } else if (typeof e.alpha === "number") {
      // Android(absolute): alpha は反時計回り。端末を水平に持ったときの方位 ≒ 360 - alpha。
      heading = (360 - e.alpha + 360) % 360;
    }
    cb({ headingDeg: heading, betaDeg: e.beta, gammaDeg: e.gamma });
  };
  // absolute（地磁気基準）を優先。無ければ通常 deviceorientation。
  window.addEventListener("deviceorientationabsolute", handler as EventListener, true);
  window.addEventListener("deviceorientation", handler as EventListener, true);
  return () => {
    window.removeEventListener("deviceorientationabsolute", handler as EventListener, true);
    window.removeEventListener("deviceorientation", handler as EventListener, true);
  };
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
