// ホーム画面のカード定義（一覧と、画面遷移の暗転カードで共用）。
// 用途別モード（MapView）に加え、表示設定・図鑑の専用画面もカードから入る。
import { IconMountain, IconSun, IconImage, IconCamera, IconDownload, IconSettings, IconBook } from "./components/icons";
import type { AppMode } from "./App";

export const CARDS: { mode: AppMode | "settings" | "zukan"; icon: React.ReactNode; title: string; desc: string }[] = [
  {
    mode: "terrain",
    icon: <IconMountain size={26} />,
    title: "地形を見る",
    desc: "好きな場所の地形や山並みを立体的に眺め、その場に立った景色を見渡せます",
  },
  {
    mode: "celestial",
    icon: <IconSun size={26} />,
    title: "太陽・月の動きを見る",
    desc: "選んだ場所と日時で、太陽や月が見える方角・高さや、日の出・日の入りの時刻を確かめられます",
  },
  {
    mode: "ar",
    icon: <IconImage size={26} />,
    title: "写真に山名をのせる",
    desc: "撮った山の写真に名前を重ねて、「あの山は何？」を確かめ、名入りの一枚に仕上げます",
  },
  {
    mode: "live",
    icon: <IconCamera size={26} />,
    title: "カメラで山名を見る",
    desc: "目の前の山にカメラを向けると、見えている山の名前がその場でわかります",
  },
  {
    mode: "zukan",
    icon: <IconBook size={26} />,
    title: "山の図鑑",
    desc: "日本の山 1,061座。標高や地域、タグで絞り込み、3D地形と解説で山を知れます",
  },
  {
    mode: "offline",
    icon: <IconDownload size={26} />,
    title: "オフライン保存",
    desc: "電波が届かない場所でも見られるよう、必要な範囲を前もって保存しておけます",
  },
  {
    mode: "settings",
    icon: <IconSettings size={26} />,
    title: "表示設定",
    desc: "中心・山頂マーカーや空のグラデーション、標高の誇張を切り替えます。各モードに引き継がれます",
  },
];
