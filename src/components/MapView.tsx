import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { MapControls } from "three/examples/jsm/controls/MapControls.js";
import { QuadtreeTerrain, type TerrainStats } from "../terrain/QuadtreeTerrain";

// 3Dビュー本体。Three.js のセットアップ、地図的なカメラ操作（MapControls＋画面ボタン）、
// 毎フレームのクアッドツリー更新を行う。月/太陽/カメラFOVなどは持たない単機能。

// 画面ボタンで保持する操作状態（押している間 1/-1、毎フレーム適用）。
type Nav = {
  panX: number;
  panZ: number;
  orbit: number;
  tilt: number;
  dolly: number;
  home: boolean;
};

// nav の数値フィールド（押下解除でゼロに戻す対象）。
type NavNumKey = "panX" | "panZ" | "orbit" | "tilt" | "dolly";

// 1フレームあたりの操作量。
const PAN_SPEED = 0.015; // 注視点までの距離に対する割合
const ORBIT_SPEED = 0.025; // rad
const TILT_SPEED = 0.022; // rad
const DOLLY_BASE = 1.04; // 倍率

export default function MapView() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [stats, setStats] = useState<TerrainStats | null>(null);
  // 画面ボタンとレンダリングループで共有する操作状態（.current は callback/effect 内でのみ触る）。
  const navRef = useRef<Nav>({ panX: 0, panZ: 0, orbit: 0, tilt: 0, dolly: 0, home: false });

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const nav = navRef.current;

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

    // --- 画面ボタンによるカメラ操作（毎フレーム nav を反映） --- //
    const UP = new THREE.Vector3(0, 1, 0);
    const initPos = camera.position.clone();
    const initTarget = controls.target.clone();
    const applyNav = () => {
      if (nav.home) {
        camera.position.lerp(initPos, 0.15);
        controls.target.lerp(initTarget, 0.15);
        if (camera.position.distanceTo(initPos) < 1 && controls.target.distanceTo(initTarget) < 1) {
          camera.position.copy(initPos);
          controls.target.copy(initTarget);
          nav.home = false;
        }
        return; // 復帰アニメ中は他操作を無視
      }
      // ズーム（注視点に寄る/離れる）。
      if (nav.dolly) {
        const offset = camera.position.clone().sub(controls.target);
        const factor = nav.dolly > 0 ? 1 / DOLLY_BASE : DOLLY_BASE;
        const d = THREE.MathUtils.clamp(
          offset.length() * factor,
          controls.minDistance,
          controls.maxDistance,
        );
        camera.position.copy(controls.target).add(offset.setLength(d));
      }
      // 回転（注視点まわりに方位を回す）。
      if (nav.orbit) {
        const offset = camera.position.clone().sub(controls.target);
        offset.applyAxisAngle(UP, ORBIT_SPEED * nav.orbit);
        camera.position.copy(controls.target).add(offset);
      }
      // 傾き（俯角＝極角を変える）。
      if (nav.tilt) {
        const offset = camera.position.clone().sub(controls.target);
        const r = offset.length();
        const az = Math.atan2(offset.x, offset.z);
        let polar = Math.acos(THREE.MathUtils.clamp(offset.y / r, -1, 1));
        polar = THREE.MathUtils.clamp(polar + TILT_SPEED * nav.tilt, 0.08, controls.maxPolarAngle);
        const sp = Math.sin(polar);
        offset.set(r * sp * Math.sin(az), r * Math.cos(polar), r * sp * Math.cos(az));
        camera.position.copy(controls.target).add(offset);
      }
      // パン（視線方向＝前後、右方向＝左右に地面を平行移動）。
      if (nav.panX || nav.panZ) {
        const step = camera.position.distanceTo(controls.target) * PAN_SPEED;
        const forward = new THREE.Vector3();
        camera.getWorldDirection(forward);
        forward.y = 0;
        if (forward.lengthSq() < 1e-6) forward.set(0, 0, -1);
        forward.normalize();
        const right = new THREE.Vector3().crossVectors(forward, UP).normalize();
        const move = new THREE.Vector3()
          .addScaledVector(forward, nav.panZ * step)
          .addScaledVector(right, nav.panX * step);
        camera.position.add(move);
        controls.target.add(move);
      }
    };

    let raf = 0;
    let statsTick = 0;
    const loop = () => {
      applyNav();
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

  // ボタンのプレス/リリース（押下中だけ nav を立てる）。
  const start = (patch: Partial<Nav>) => (e: React.PointerEvent) => {
    e.preventDefault();
    Object.assign(navRef.current, patch);
  };
  const stop = (...keys: NavNumKey[]) => () => {
    for (const k of keys) navRef.current[k] = 0;
  };
  const hold = (patch: Partial<Nav>, ...keys: NavNumKey[]) => ({
    onPointerDown: start(patch),
    onPointerUp: stop(...keys),
    onPointerLeave: stop(...keys),
    onPointerCancel: stop(...keys),
  });

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

      <div className="nav-controls">
        {/* 傾き */}
        <div className="nav-row">
          <button className="nav-btn" title="水平に近づける" {...hold({ tilt: 1 }, "tilt")}>
            <span className="nav-ico nav-ico--tilt-up" />
          </button>
          <button className="nav-btn" title="見下ろす" {...hold({ tilt: -1 }, "tilt")}>
            <span className="nav-ico nav-ico--tilt-down" />
          </button>
        </div>
        {/* 回転 */}
        <div className="nav-row">
          <button className="nav-btn" title="左に回す" {...hold({ orbit: 1 }, "orbit")}>↺</button>
          <button className="nav-btn" title="右に回す" {...hold({ orbit: -1 }, "orbit")}>↻</button>
        </div>
        {/* パン（十字）＋中央ホーム */}
        <div className="nav-pad">
          <button className="nav-btn nav-up" title="前へ" {...hold({ panZ: 1 }, "panZ")}>▲</button>
          <button className="nav-btn nav-left" title="左へ" {...hold({ panX: -1 }, "panX")}>◀</button>
          <button
            className="nav-btn nav-home"
            title="日本全体に戻す"
            onClick={() => {
              navRef.current.home = true;
            }}
          >
            ⌂
          </button>
          <button className="nav-btn nav-right" title="右へ" {...hold({ panX: 1 }, "panX")}>▶</button>
          <button className="nav-btn nav-down" title="後ろへ" {...hold({ panZ: -1 }, "panZ")}>▼</button>
        </div>
        {/* ズーム */}
        <div className="nav-zoom">
          <button className="nav-btn" title="ズームイン" {...hold({ dolly: 1 }, "dolly")}>＋</button>
          <button className="nav-btn" title="ズームアウト" {...hold({ dolly: -1 }, "dolly")}>−</button>
        </div>
      </div>

      <div className="attribution">地図・航空写真・標高: 国土地理院（GSI）タイル</div>
    </div>
  );
}
