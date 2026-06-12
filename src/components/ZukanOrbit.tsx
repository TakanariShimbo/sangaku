// 図鑑の詳細ページ用ヒーロー3Dビュー。写真の代わりに、山頂のまわりを
// ゆっくり周回し続けるカメラで実地形（QuadtreeTerrain）を映す。
// MapView とは独立した小さな専用エンジン（自前 renderer/scene/ループ）。
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { QuadtreeTerrain } from "../terrain/QuadtreeTerrain";
import { elevToWorldY, lonToMercX, latToMercY, mercXToWorld, mercYToWorld } from "../lib/mercator";

type Props = {
  lat: number;
  lon: number;
  elevationM: number;
};

export default function ZukanOrbit({ lat, lon, elevationM }: Props) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    // --- 最小構成の3Dエンジン（MapView の見た目と揃えた背景・霧・ライト） ---
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75)); // 図鑑は軽さ優先
    mount.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0d12);
    scene.fog = new THREE.Fog(0x0a0d12, 2000, 7000);
    scene.add(new THREE.AmbientLight(0xffffff, 0.85));
    const sun = new THREE.DirectionalLight(0xffffff, 1.1);
    sun.position.set(0.6, 1, 0.4).normalize().multiplyScalar(1000);
    scene.add(sun);
    const camera = new THREE.PerspectiveCamera(50, 1, 0.05, 20000);
    const terrain = new QuadtreeTerrain(renderer);
    scene.add(terrain.group);

    // 注視点 = 山頂（の少し下。山体が画面中央に収まりやすい）。
    const tx = mercXToWorld(lonToMercX(lon));
    const tz = mercYToWorld(latToMercY(lat));
    const ty = elevToWorldY(Math.max(0, elevationM - 250));
    const target = new THREE.Vector3(tx, ty, tz);
    // 周回半径・高さは標高でゆるくスケール（高山ほど引いて全景）。単位はおよそ km。
    const R = 6.5 + (elevationM / 3800) * 4.5;
    const camH = elevToWorldY(elevationM) + R * 0.42;

    let raf = 0;
    const t0 = performance.now();
    const setSize = () => {
      const w = mount.clientWidth || 1;
      const h = mount.clientHeight || 1;
      renderer.setSize(w, h, false);
      renderer.domElement.style.width = "100%";
      renderer.domElement.style.height = "100%";
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    setSize();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(setSize) : null;
    ro?.observe(mount);

    const loop = () => {
      raf = requestAnimationFrame(loop);
      const t = (performance.now() - t0) / 1000;
      // ゆっくり一定速で周回（1周 ≈ 95秒）＋ごく薄い呼吸（半径・高さ）で単調さを消す。
      const az = t * (Math.PI * 2 / 95) + Math.PI * 0.25;
      const r = R * (1 + 0.06 * Math.sin(t * 0.21));
      const h = camH + R * 0.05 * Math.sin(t * 0.13);
      camera.position.set(target.x + Math.cos(az) * r, h, target.z + Math.sin(az) * r);
      camera.lookAt(target);
      terrain.update(camera, mount.clientHeight || 1, camera.position.distanceTo(target));
      renderer.render(scene, camera);
    };
    loop();

    return () => {
      cancelAnimationFrame(raf);
      ro?.disconnect();
      terrain.dispose();
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, [lat, lon, elevationM]);

  return <div ref={mountRef} className="zukan-orbit" aria-label="山の3Dビュー（自動周回）" />;
}
