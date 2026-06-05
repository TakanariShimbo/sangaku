/// <reference lib="webworker" />
// 地形タイルワーカー。タイル(z,x,y)を受け取り、標高グリッドを生成して返す。
// DEMの取得・パース・サンプリングという重い処理をメインスレッドから切り離す。

import { sampleTileElevations } from "../lib/tileSampler";

type Req = {
  type: "tile";
  reqId: number;
  z: number;
  x: number;
  y: number;
  gridN: number;
};

const ctx = self as unknown as DedicatedWorkerGlobalScope;

ctx.addEventListener("message", (e: MessageEvent<Req>) => {
  const m = e.data;
  if (m.type !== "tile") return;
  void (async () => {
    try {
      const elev = await sampleTileElevations(m.z, m.x, m.y, m.gridN);
      ctx.postMessage(
        { type: "tile", reqId: m.reqId, z: m.z, x: m.x, y: m.y, gridN: m.gridN, elev },
        [elev.buffer],
      );
    } catch (err) {
      ctx.postMessage({ type: "error", reqId: m.reqId, message: (err as Error).message });
    }
  })();
});
