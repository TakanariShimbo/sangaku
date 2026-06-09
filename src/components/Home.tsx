// アプリのホーム画面。入場時に出し、ここから用途別モードへ分岐する。
// 旧・各モードの☰メニューにあった表示設定も、ここの「表示設定」パネルで変更する。
import type { AppMode } from "../App";
import { CARDS } from "../modeCards";
import type { Settings } from "../settings";

type Props = {
  onSelect: (mode: AppMode) => void;
  settings: Settings;
  onChangeSettings: (next: Settings) => void;
};

export default function Home({ onSelect, settings, onChangeSettings }: Props) {
  // 設定の一部だけを差し替えて更新する。
  const set = (patch: Partial<Settings>) => onChangeSettings({ ...settings, ...patch });

  return (
    <div className="home">
      <div className="home-inner">
        <header className="home-head">
          <h1>Sangaku</h1>
          <p>日本の山を見て知る ― 3D地形・太陽と月・AR山名</p>
        </header>
        <div className="home-cards">
          {CARDS.map((c) => (
            <button key={c.mode} className="home-card" onClick={() => onSelect(c.mode)}>
              <span className="home-card-icon">{c.icon}</span>
              <span className="home-card-text">
                <span className="home-card-title">{c.title}</span>
                <span className="home-card-desc">{c.desc}</span>
              </span>
            </button>
          ))}
        </div>

        {/* 表示設定（旧・各モードの☰メニュー）。ここで変えた内容が各モードに引き継がれる。 */}
        <section className="home-settings">
          <div className="home-settings-head">
            <span className="home-settings-title">表示設定</span>
            <span className="home-settings-sub">各モードに引き継がれます</span>
          </div>
          <label className="switch-row">
            <span>中心マーカー</span>
            <input
              type="checkbox"
              className="switch"
              checked={settings.showCenter}
              onChange={(e) => set({ showCenter: e.target.checked })}
            />
          </label>
          <label className="switch-row">
            <span>山頂マーカー</span>
            <input
              type="checkbox"
              className="switch"
              checked={settings.showPeaks}
              onChange={(e) => set({ showPeaks: e.target.checked })}
            />
          </label>
          <label className="switch-row">
            <span>空のグラデーション</span>
            <input
              type="checkbox"
              className="switch"
              checked={settings.showSky}
              onChange={(e) => set({ showSky: e.target.checked })}
            />
          </label>
          <div className="slider-row">
            <span className="slider-label">
              標高の誇張（地図）
              <b>×{settings.mapVex.toFixed(1)}</b>
              {settings.mapVex === 1 ? " 実寸" : ""}
            </span>
            <input
              type="range"
              min={1}
              max={3}
              step={0.1}
              value={settings.mapVex}
              onChange={(e) => set({ mapVex: Number(e.target.value) })}
            />
          </div>
          <div className="slider-row">
            <span className="slider-label">
              標高の誇張（風景）
              <b>×{settings.camVex.toFixed(1)}</b>
              {settings.camVex === 1 ? " 実寸" : ""}
            </span>
            <input
              type="range"
              min={1}
              max={3}
              step={0.1}
              value={settings.camVex}
              onChange={(e) => set({ camVex: Number(e.target.value) })}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
