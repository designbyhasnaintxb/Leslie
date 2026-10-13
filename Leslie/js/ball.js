/* =========================================================
   THE BALL — one realistic 3D pickleball (Three.js)
   A single sphere with procedurally generated perforation
   maps (color / bump / roughness) rendered into a fixed,
   transparent canvas. Positioned in screen pixels by main.js.
   ========================================================= */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const BALL_YELLOW = '#DCEB55';
const HOLE_COUNT = 40; // outdoor balls carry 40 holes

/** Fibonacci-distributed points on the unit sphere, poles trimmed to avoid UV smear. */
function holeCenters(n) {
  const pts = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2;
    const lat = Math.asin(y);
    if (Math.abs(lat) > THREE.MathUtils.degToRad(68)) continue;
    const r = Math.sqrt(1 - y * y);
    const theta = golden * i;
    pts.push({ lon: Math.atan2(Math.sin(theta) * r, Math.cos(theta) * r), lat });
  }
  return pts;
}

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

/** Draw an ellipse, duplicating across the seam so holes wrap cleanly. */
function ellipseWrapped(ctx, cx, cy, rx, ry, W, draw) {
  for (const dx of [0, -W, W]) {
    const x = cx + dx;
    if (x + rx < 0 || x - rx > W) continue;
    ctx.beginPath();
    ctx.ellipse(x, cy, rx, ry, 0, 0, Math.PI * 2);
    draw(x, cy);
  }
}

function buildMaps(size) {
  const W = size, H = size / 2;
  const color = makeCanvas(W, H), bump = makeCanvas(W, H), rough = makeCanvas(W, H);
  const cc = color.getContext('2d'), bc = bump.getContext('2d'), rc = rough.getContext('2d');

  // Base surfaces
  cc.fillStyle = BALL_YELLOW; cc.fillRect(0, 0, W, H);
  bc.fillStyle = '#808080'; bc.fillRect(0, 0, W, H);
  rc.fillStyle = '#7a7a7a'; rc.fillRect(0, 0, W, H);

  // Fine material speckle so the plastic doesn't read as flat vector
  const speck = Math.floor(W * H * 0.004);
  for (let i = 0; i < speck; i++) {
    const x = Math.random() * W, y = Math.random() * H, s = 1 + Math.random() * 2;
    cc.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(40,60,20,0.05)';
    cc.fillRect(x, y, s, s);
    bc.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
    bc.fillRect(x, y, s, s);
    rc.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)';
    rc.fillRect(x, y, s, s);
  }

  // Perforations
  const holeRad = 0.145; // radians on the unit sphere (~0.4in on a 2.9in ball)
  for (const { lon, lat } of holeCenters(HOLE_COUNT)) {
    const u = (lon / (Math.PI * 2) + 0.5) * W;
    const v = (0.5 - lat / Math.PI) * H;
    const rx = (holeRad / (Math.PI * 2)) * W / Math.max(0.25, Math.cos(lat));
    const ry = (holeRad / Math.PI) * H;

    // Color: dark interior with a light top rim (light from above)
    ellipseWrapped(cc, u, v, rx, ry, W, (x, y) => {
      const g = cc.createRadialGradient(x, y + ry * 0.25, ry * 0.1, x, y, ry);
      g.addColorStop(0, '#1F1A16');
      g.addColorStop(0.75, '#2E2A1C');
      g.addColorStop(1, '#4E4A24');
      cc.fillStyle = g; cc.fill();
    });
    ellipseWrapped(cc, u, v, rx, ry, W, () => {
      cc.lineWidth = Math.max(1.5, ry * 0.12);
      cc.strokeStyle = 'rgba(255,255,255,0.28)';
      cc.stroke();
    });
    ellipseWrapped(cc, u, v + ry * 0.06, rx * 0.98, ry * 0.98, W, () => {
      cc.lineWidth = Math.max(1, ry * 0.08);
      cc.strokeStyle = 'rgba(80,80,20,0.35)';
      cc.stroke();
    });

    // Bump: hole is recessed, rim slightly raised
    ellipseWrapped(bc, u, v, rx * 1.08, ry * 1.08, W, () => { bc.fillStyle = '#c8c8c8'; bc.fill(); });
    ellipseWrapped(bc, u, v, rx, ry, W, () => { bc.fillStyle = '#000000'; bc.fill(); });

    // Roughness: interior is matte
    ellipseWrapped(rc, u, v, rx, ry, W, () => { rc.fillStyle = '#e6e6e6'; rc.fill(); });
  }

  const tex = (c, srgb) => {
    const t = new THREE.CanvasTexture(c);
    t.wrapS = THREE.RepeatWrapping;
    t.anisotropy = 4;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.needsUpdate = true;
    return t;
  };
  return { map: tex(color, true), bumpMap: tex(bump, false), roughnessMap: tex(rough, false) };
}

export function createBall({ canvas, quality = 'high' }) {
  const low = quality === 'low';
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, low ? 1.5 : 2));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const FOV = 28, DIST = 12;
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 100);
  camera.position.set(0, 0, DIST);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();

  const key = new THREE.DirectionalLight(0xfff7e6, 2.4);
  key.position.set(3, 6, 7);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xd9ffef, 0.5);
  fill.position.set(-5, -2, 4);
  scene.add(fill);
  scene.add(new THREE.AmbientLight(0xffffff, 0.15));

  const maps = buildMaps(low ? 1024 : 2048);
  const material = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    map: maps.map,
    bumpMap: maps.bumpMap,
    bumpScale: low ? 0.6 : 0.9,
    roughnessMap: maps.roughnessMap,
    roughness: 0.62,
    metalness: 0.0,
    clearcoat: 0.22,
    clearcoatRoughness: 0.42,
    envMapIntensity: 0.85,
  });
  const geometry = new THREE.SphereGeometry(1, low ? 48 : 96, low ? 32 : 64);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.set(0.4, -0.6, 0.15);
  const tilt = new THREE.Group();
  tilt.add(mesh);
  scene.add(tilt);

  let vw = 1, vh = 1, worldH = 1, worldW = 1;
  function resize() {
    vw = window.innerWidth; vh = window.innerHeight;
    renderer.setSize(vw, vh, false);
    camera.aspect = vw / vh;
    camera.updateProjectionMatrix();
    worldH = 2 * Math.tan(THREE.MathUtils.degToRad(FOV / 2)) * DIST;
    worldW = worldH * camera.aspect;
  }
  resize();

  const state = { x: -9999, y: -9999, r: 40, squash: 1, visible: true, alpha: 1, targetTiltX: 0, targetTiltY: 0 };
  const Z = new THREE.Vector3(0, 0, 1), X = new THREE.Vector3(1, 0, 0), Y = new THREE.Vector3(0, 1, 0);
  let idleSpin = 0.32;
  let needsRender = true;

  return {
    resize,
    /** Screen-space placement. r = radius in CSS px. */
    setScreen(x, y, r, squash = 1) {
      state.x = x; state.y = y; state.r = r; state.squash = squash;
      needsRender = true;
    },
    setVisible(v) { if (state.visible !== v) { state.visible = v; needsRender = true; } },
    setAlpha(a) { a = THREE.MathUtils.clamp(a, 0, 1); if (material.opacity !== a) { material.transparent = a < 1; material.opacity = a; needsRender = true; } },
    /** Rolling spin: dx/dy in CSS px since last frame. */
    roll(dx, dy) {
      const r = Math.max(8, state.r);
      if (dx) mesh.rotateOnWorldAxis(Z, -dx / r);
      if (dy) mesh.rotateOnWorldAxis(X, dy / r * 0.6);
      if (dx || dy) needsRender = true;
    },
    /** Gentle reaction to the cursor: tilt toward it. */
    lookToward(nx, ny) { state.targetTiltX = ny * 0.35; state.targetTiltY = nx * 0.35; },
    setIdleSpin(v) { idleSpin = v; },
    update(dt) {
      if (!state.visible) { renderer.clear(); return; }
      mesh.rotateOnWorldAxis(Y, idleSpin * dt);
      tilt.rotation.x += (state.targetTiltX - tilt.rotation.x) * Math.min(1, dt * 4);
      tilt.rotation.y += (state.targetTiltY - tilt.rotation.y) * Math.min(1, dt * 4);
      const px = (state.x / vw - 0.5) * worldW;
      const py = -(state.y / vh - 0.5) * worldH;
      tilt.position.set(px, py, 0);
      const s = (state.r / vh) * worldH;
      tilt.scale.set(s / Math.sqrt(state.squash), s * state.squash, s);
      renderer.render(scene, camera);
      needsRender = false;
    },
    dispose() {
      geometry.dispose(); material.dispose();
      Object.values(maps).forEach(t => t.dispose());
      renderer.dispose();
    },
  };
}
