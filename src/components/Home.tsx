// アプリのホーム画面（ランディング）。入場時に出し、ここから用途別モード／表示設定へ分岐する。
// 黒地・大きいタイポグラフィ・広い余白・控えめな半透明カードで「作品っぽい」見え方に寄せる。
import type { Screen } from "../App";
import { CARDS } from "../modeCards";

type Props = { onSelect: (target: Exclude<Screen, "home">) => void };

export default function Home({ onSelect }: Props) {
  return (
    <div className="home home--landing">
      <div className="home-inner">
        <header className="home-hero">
          {/* ブランドマーク：山をファインダー枠で切り取る（＝Find Your Frame）。 */}
          <svg className="home-mark" width="68" height="68" viewBox="0 0 64 64" aria-hidden="true">
            <polygon points="10,48 26,28 42,48" fill="rgba(243,240,233,0.28)" />
            <polygon points="22,48 40,16 56,48" fill="#d6b46a" />
            <polygon points="34,26 40,16 46,26 43,24 40,25 37,23" fill="#f3f0e9" />
            <g fill="none" stroke="rgba(243,240,233,0.85)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 7 H7 V18" />
              <path d="M46 7 H57 V18" />
              <path d="M18 57 H7 V46" />
              <path d="M46 57 H57 V46" />
            </g>
          </svg>
          <h1 className="home-title">Trace</h1>
          <p className="home-tagline">Find Your Frame</p>
          <p className="home-lead">山で写真を撮る人のための、撮影計画・AR・作品づくり。</p>
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
      </div>
    </div>
  );
}
