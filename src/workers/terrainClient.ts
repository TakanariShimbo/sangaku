// 地形ワーカープールのクライアント。タイルの標高グリッド生成を複数ワーカーに振り分ける。
// Promise ベースの API（sampleTile）でクアッドツリー側から使う。

type Pending = {
  resolve: (elev: Float32Array) => void;
  reject: (err: Error) => void;
};

const workers: Worker[] = [];
let nextWorker = 0;
let nextReqId = 1;
const pending = new Map<number, Pending>();

function ensurePool(): Worker[] {
  if (workers.length) return workers;
  const hc = typeof navigator !== "undefined" ? navigator.hardwareConcurrency || 4 : 4;
  const count = Math.max(2, Math.min(4, hc - 1));
  for (let i = 0; i < count; i++) {
    const w = new Worker(new URL("./terrain.worker.ts", import.meta.url), { type: "module" });
    w.addEventListener("message", (e: MessageEvent) => {
      const m = e.data;
      const p = pending.get(m.reqId);
      if (!p) return;
      pending.delete(m.reqId);
      if (m.type === "tile") p.resolve(m.elev as Float32Array);
      else p.reject(new Error(m.message ?? "terrain worker error"));
    });
    workers.push(w);
  }
  return workers;
}

/** タイル(z,x,y) の標高グリッド（(gridN+1)^2）を取得。 */
export function sampleTile(
  z: number,
  x: number,
  y: number,
  gridN: number,
): Promise<Float32Array> {
  const pool = ensurePool();
  const reqId = nextReqId++;
  const w = pool[nextWorker];
  nextWorker = (nextWorker + 1) % pool.length;
  return new Promise<Float32Array>((resolve, reject) => {
    pending.set(reqId, { resolve, reject });
    w.postMessage({ type: "tile", reqId, z, x, y, gridN });
  });
}
