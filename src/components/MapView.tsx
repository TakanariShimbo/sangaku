import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { MapControls } from "three/examples/jsm/controls/MapControls.js";
import { QuadtreeTerrain, type TerrainStats } from "../terrain/QuadtreeTerrain";

// 3Dビュー本体。Three.js のセットアップ、地図的なカメラ操作（MapControls）、
// 毎フレームのクアッドツリー更新を行う。月/太陽/カメラFOVなどは持たない単機能。

export default function MapView() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [stats, setStats] = useState<TerrainStats | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      logarithmicDepthBuffer: true, // 数km〜数千kmの広いレンジで z-fighting を防ぐ
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0d12);
    scene.fog = new THREE.Fog(0x0a0d12, 2000, 7000); // 遠景をなじませる

    const camera = new THREE.PerspectiveCamera(
      55,
      mount.clientWidth / mount.clientHeight,
      0.05,
      9000,
    );
    // 起動時は日本全体を斜め上空から見下ろす。
    camera.position.set(0, 2200, 2600);

    const controls = new MapControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.screenSpacePanning = false; // 地面(XZ平面)に沿ってパン
    controls.minDistance = 0.3;
    controls.maxDistance = 6000;
    controls.maxPolarAngle = THREE.MathUtils.degToRad(85); // 地平より下に潜らない
    controls.target.set(0, 0, 0);

    scene.add(new THREE.AmbientLight(0xffffff, 0.85));
    const sun = new THREE.DirectionalLight(0xffffff, 1.1);
    sun.position.set(0.6, 1, 0.4).normalize().multiplyScalar(1000);
    scene.add(sun);

    const terrain = new QuadtreeTerrain(renderer);
    scene.add(terrain.group);

    let raf = 0;
    let statsTick = 0;
    const loop = () => {
      controls.update();
      const camDist = camera.position.distanceTo(controls.target);
      terrain.update(camera, mount.clientHeight, camDist);
      renderer.render(scene, camera);
      if (++statsTick % 20 === 0) setStats(terrain.getStats());
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const onResize = () => {
      if (!mount.clientWidth || !mount.clientHeight) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener("resize", onResize);
    const ro = new ResizeObserver(onResize);
    ro.observe(mount);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      ro.disconnect();
      controls.dispose();
      terrain.dispose();
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div className="mapview">
      <div className="mapview-canvas" ref={mountRef} />
      {stats && (
        <div className="hud">
          <span>tiles {stats.loaded}</span>
          <span>load {stats.loading}</span>
          <span>queue {stats.queued}</span>
          <span>draw {stats.visible}</span>
        </div>
      )}
      <div className="attribution">
        地図・航空写真・標高: 国土地理院（GSI）タイル
      </div>
    </div>
  );
}
