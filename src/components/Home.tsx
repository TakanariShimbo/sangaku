// アプリのホーム画面。入場時に出し、ここから用途別モードへ分岐する。
import { IconMountain, IconSun, IconImage, IconCamera, IconDownload } from "./icons";
import type { AppMode } from "../App";

type Props = { onSelect: (mode: AppMode) => void };

const CARDS: { mode: AppMode; icon: React.ReactNode; title: string; desc: string }[] = [
  {
    mode: "terrain",
    icon: <IconMountain size={26} />,
    title: "地形を見る",
    desc: "日本の地形を3Dで俯瞰。好きな地点に立って自由に見回せます",
  },
  {
    mode: "celestial",
    icon: <IconSun size={26} />,
    title: "太陽・月の動きを見る",
    desc: "日時を変えて、その地点から見た太陽・月の方位／高度や日の出・日の入りを確かめます",
  },
  {
    mode: "ar",
    icon: <IconImage size={26} />,
    title: "写真に山名をのせる",
    desc: "撮った山の写真に山名を重ね、合成画像を書き出せます（AR）",
  },
  {
    mode: "live",
    icon: <IconCamera size={26} />,
    title: "カメラで山名を見る",
    desc: "今いる場所からカメラ越しに、見えている山へ名前を重ねます（GPS・方位）",
  },
  {
    mode: "offline",
    icon: <IconDownload size={26} />,
    title: "オフライン保存",
    desc: "見たい範囲をあらかじめ保存。通信がなくてもその範囲を3D表示できます",
  },
];

export default function Home({ onSelect }: Props) {
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
      </div>
    </div>
  );
}
