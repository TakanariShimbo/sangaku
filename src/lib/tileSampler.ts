// 1枚のXYZタイルに対応する標高グリッドを作る（ワーカーで実行）。
//
// タイル(z,x,y)の地理範囲を (gridN+1)×(gridN+1) 点でサンプルし、各点の標高(m)を返す。
// DEM のサンプル元ズームは demZ = min(z, DEM_MAX_Z)。z>14 のタイルは z14 DEM から
// アップサンプルされる（標高はそれ以上細かくならないが、航空写真は高ズームで高精細化する）。

import { fetchDemTile, DEM_MAX_Z } from "./demTiles";
import {
  TILE_SIZE,
  tileMercBounds,
  mercXToLon,
  mercYToLat,
  lonLatToGlobalPixel,
} from "./mercator";

/** タイルの標高グリッド（行優先、長さ (gridN+1)^2、欠測/海域は 0）。 */
export async function sampleTileElevations(
  z: number,
  x: number,
  y: number,
  gridN: number,
): Promise<Float32Array> {
  const demZ = Math.min(z, DEM_MAX_Z);
  const { mxMin, mxMax, myMin, myMax } = tileMercBounds(z, x, y);
  const verts = gridN + 1;

  // 各グリッド点のグローバルピクセル座標（demZ）を求め、必要なDEMタイルを集計。
  const gpx = new Float64Array(verts * verts);
  const gpy = new Float64Array(verts * verts);
  const need = new Map<string, { tx: number; ty: number }>();

  for (let j = 0; j < verts; j++) {
    const v = j / gridN; // 0=北
    const my = myMax - v * (myMax - myMin);
    const lat = mercYToLat(my);
    for (let i = 0; i < verts; i++) {
      const u = i / gridN; // 0=西
      const mx = mxMin + u * (mxMax - mxMin);
      const lon = mercXToLon(mx);
      const { gx, gy } = lonLatToGlobalPixel(lat, lon, demZ);
      const idx = j * verts + i;
      gpx[idx] = gx;
      gpy[idx] = gy;
      // バイリニア補間に必要な4近傍が属するDEMタイルを登録。
      const fx0 = Math.floor(gx - 0.5);
      const fy0 = Math.floor(gy - 0.5);
      for (const [ox, oy] of [[0, 0], [1, 0], [0, 1], [1, 1]] as const) {
        const tx = Math.floor((fx0 + ox) / TILE_SIZE);
        const ty = Math.floor((fy0 + oy) / TILE_SIZE);
        need.set(`${tx}/${ty}`, { tx, ty });
      }
    }
  }

  // 必要DEMタイルを並列取得（dem キャッシュで重複取得は抑制される）。
  const resolved = new Map<string, Float32Array | null>();
  await Promise.all(
    [...need.entries()].map(async ([key, { tx, ty }]) => {
      resolved.set(key, await fetchDemTile(demZ, tx, ty));
    }),
  );

  const pixel = (gx: number, gy: number): number => {
    const g = resolved.get(`${Math.floor(gx / TILE_SIZE)}/${Math.floor(gy / TILE_SIZE)}`);
    if (!g) return NaN;
    const px = ((Math.floor(gx) % TILE_SIZE) + TILE_SIZE) % TILE_SIZE;
    const py = ((Math.floor(gy) % TILE_SIZE) + TILE_SIZE) % TILE_SIZE;
    return g[py * TILE_SIZE + px];
  };

  const elev = new Float32Array(verts * verts);
  for (let k = 0; k < elev.length; k++) {
    const fx = gpx[k] - 0.5;
    const fy = gpy[k] - 0.5;
    const x0 = Math.floor(fx);
    const y0 = Math.floor(fy);
    const dx = fx - x0;
    const dy = fy - y0;
    let sum = 0;
    let w = 0;
    const cs: [number, number, number][] = [
      [x0, y0, (1 - dx) * (1 - dy)],
      [x0 + 1, y0, dx * (1 - dy)],
      [x0, y0 + 1, (1 - dx) * dy],
      [x0 + 1, y0 + 1, dx * dy],
    ];
    for (const [cx, cy, wt] of cs) {
      const val = pixel(cx, cy);
      if (!Number.isNaN(val)) {
        sum += val * wt;
        w += wt;
      }
    }
    elev[k] = w === 0 ? 0 : sum / w; // 欠測・海域は海面0
  }
  return elev;
}
