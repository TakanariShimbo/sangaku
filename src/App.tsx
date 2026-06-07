import { useState } from "react";
import Home from "./components/Home";
import MapView from "./components/MapView";

// 画面ルーター: ホーム → シミュレーション / AR。3Dエンジン(MapView)は共通で、
// appMode で用途別に振る舞いを切り替える。
export default function App() {
  const [screen, setScreen] = useState<"home" | "simulation" | "ar" | "live">("home");
  if (screen === "home") return <Home onSelect={setScreen} />;
  return <MapView appMode={screen} onHome={() => setScreen("home")} />;
}
