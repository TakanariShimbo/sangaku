# gsi-3dmap — 国土地理院タイルによる Google Earth 風 3D地形ビュー

`mount-photo-sim` から派生した単機能アプリ。**DEM（標高）＋ 航空写真**を使い、
日本全体から街レベルまで**シームレスにズーム詳細化**する3D地形だけに専念する。
月・太陽・カメラFOVなどの機能は持たない。

元アプリとの本質的な違いは描画方式:

- **mount-photo-sim**: 観測者中心・固定半径の「単一ディスクメッシュ＋1枚の合成テクスチャ」。
  半径100kmの上限があり、ズームは離散段階（`ZOOM_RADII_KM`）。
- **gsi-3dmap**: **XYZタイルのクアッドツリーLOD**。タイルごとにDEMメッシュ＋航空写真を持ち、
  カメラ距離（画面上の見かけサイズ）に応じて4分割/統合し、非同期にストリーミングする。
  100km制限は無し。日本（ルートタイルのbbox）に限定。

## 動作の仕組み

平面 Web メルカトル（EPSG:3857）にタイルを並べ、原点（日本中心）相対の「km相当」座標で3D化する。

1. **ルート**: 日本bboxに重なる z5 タイル群（十数枚）をクアッドツリーの根とする。
2. **LOD選択（毎フレーム）**: 各タイルの画面上の大きさ(px)を見積もり、`SPLIT_PX` を超えれば
   4つの子タイル（z+1）へ分割。視錐台外のタイルは描画しない（少し外側まで先読み）。
3. **ストリーミング**: 子のDEM/航空写真が揃うまで親を表示し、揃ったら一斉に差し替える
   （常に隙間なく描画＝プログレッシブ詳細化）。スカートでLOD境界のひび割れを隠す。
4. **メモリ**: 一定フレーム未使用のタイルは mesh/texture を破棄。

DEMは z14 がネイティブ（約10m）。航空写真は z16 まで使うので、拡大すると地形より先に
**画像が高精細化**していく（Google Earth と同様）。

## データ出典（国土地理院・APIキー不要・CORS開放）

- 標高(DEM): `xyz/dem`（`.txt`、z0〜14）
- 航空写真: `xyz/seamlessphoto`（`.jpg`、z2〜18）

> 出典表記: 「地図・航空写真・標高データ：国土地理院タイル」。

## 主な構成

- `src/lib/mercator.ts` — メルカトル/経緯度/タイル/ワールド座標の変換（DOM非依存・ワーカー共有）
- `src/lib/demTiles.ts` — DEMタイル取得＋Cache APIキャッシュ
- `src/lib/aerialTiles.ts` — 航空写真タイル取得（ImageBitmap）＋Cache APIキャッシュ
- `src/lib/tileSampler.ts` — 1タイルの標高グリッド生成（ワーカー実行）
- `src/workers/terrain.worker.ts` / `terrainClient.ts` — 地形サンプリングのワーカープール
- `src/terrain/QuadtreeTerrain.ts` — クアッドツリーLODエンジン（中核）
- `src/components/MapView.tsx` — Three.js セットアップ＋地図的カメラ操作（MapControls）

## 操作

- 左ドラッグ: パン　/　右ドラッグ: 回転・傾き　/　ホイール・ピンチ: ズーム

## 開発

```bash
nvm install && nvm use
npm install
npm run dev        # 開発サーバ
npm run build      # tsc -b && vite build
npm run typecheck
npm run lint
```

## 今後（v1では未実装）

- **登山用の事前ダウンロード**: 範囲指定で対象タイル（DEM＋航空写真）を Cache API へ一括保存し、
  オフラインで3D地形を閲覧。`demTiles.ts` / `aerialTiles.ts` は既に同じ永続キャッシュを使うため、
  プリフェッチ関数を足すだけで土台は流用できる。
- 地名・等高線・GPS現在地などのオーバーレイ
- 将来的なグローバル化（ECEF球体への置き換え）
