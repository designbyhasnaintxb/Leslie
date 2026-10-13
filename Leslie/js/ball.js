/* =========================================================
   THE BALL — one lightweight pickleball (DOM + CSS)
   Same API as the previous Three.js ball, so the rally-line
   controller in main.js is unchanged — but no WebGL, no 600KB
   library, and it renders identically on low-end phones.
   Perforations live on a "skin" layer that rotates as the ball
   rolls; a fixed shading layer keeps the light source stable.
   ========================================================= */
const SIZE = 100; // base px diameter; scaled to the requested radius

export function createBall({ root }) {
  root.innerHTML = '<div class="ball__body"><div class="ball__skin"></div><div class="ball__shade"></div></div>';
  const body = root.firstElementChild;
  const skin = body.firstElementChild;
  const shade = body.lastElementChild;

  const state = { x: -9999, y: -9999, r: 40, squash: 1, visible: true, alpha: 1, tiltX: 0, tiltY: 0, targetTiltX: 0, targetTiltY: 0 };
  let angle = 0;
  let idleSpin = 0.32;

  return {
    resize() {},
    /** Screen-space placement. r = radius in CSS px. */
    setScreen(x, y, r, squash = 1) { state.x = x; state.y = y; state.r = r; state.squash = squash; },
    setVisible(v) { state.visible = v; },
    setAlpha(a) { state.alpha = Math.max(0, Math.min(1, a)); },
    /** Rolling spin: dx/dy in CSS px since last frame. */
    roll(dx, dy) { angle += ((dx + dy * 0.6) / Math.max(8, state.r)) * 57.2958; },
    /** Gentle reaction to the cursor: the highlight drifts toward it. */
    lookToward(nx, ny) { state.targetTiltX = nx; state.targetTiltY = -ny; },
    setIdleSpin(v) { idleSpin = v; },
    update(dt) {
      if (!state.visible) { body.style.opacity = '0'; return; }
      angle += idleSpin * dt * 40;
      state.tiltX += (state.targetTiltX - state.tiltX) * Math.min(1, dt * 4);
      state.tiltY += (state.targetTiltY - state.tiltY) * Math.min(1, dt * 4);
      const s = (state.r * 2) / SIZE;
      const sq = state.squash;
      body.style.opacity = String(state.alpha);
      body.style.transform = `translate3d(${state.x.toFixed(1)}px, ${state.y.toFixed(1)}px, 0) translate(-50%, -50%) scale(${(s / Math.sqrt(sq)).toFixed(4)}, ${(s * sq).toFixed(4)})`;
      skin.style.transform = `rotate(${(angle % 360).toFixed(2)}deg)`;
      shade.style.setProperty('--lx', `${(state.tiltX * 10).toFixed(1)}%`);
      shade.style.setProperty('--ly', `${(state.tiltY * 10).toFixed(1)}%`);
    },
    dispose() { root.innerHTML = ''; },
  };
}
