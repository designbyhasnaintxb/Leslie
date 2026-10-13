/* =========================================================
   LESLIE MCCOY — PICKLEBALL — homepage behaviour
   Smooth scroll (Lenis) + GSAP/ScrollTrigger storytelling +
   "The Community Line": one ball travelling the whole page —
   landing on the hero image, riding Leslie's career path, running
   the experience timeline, parking on the gallery, moving between
   court-map zones, sitting on the future-pathway branch and riding
   the connect-form progress line.
   Technical foundation (nav, menu, cursor, magnetic buttons, rally
   controller, lightbox, form) preserved from the previous build.
   ========================================================= */
import { createBall } from './ball.js';

const html = document.documentElement;
const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const easeInOut = t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
/* getTotalLength() throws on SVG that CSS hides (display: none) — e.g. mobile-only hidden court lines */
const lengthOf = el => { try { return el.getTotalLength(); } catch { return 0; } };

if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
if (!location.hash) window.scrollTo(0, 0);

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = matchMedia('(pointer: fine)').matches;
const mqMobile = matchMedia('(max-width: 900px)');

/* ---------- Future business modules ----------
   The site is wired for these, but each stays OFF until it genuinely exists.
   Elements marked data-feature="<name>" are hidden while their flag is false.
   Never switch one on to make the site look busier than Leslie's business is. */
const FEATURES = {
  leagueRegistration: false,
  eventRegistration: false,
  membershipInterest: false,
  courtSchedule: false,
  facilityInfo: false,
  coachingPrograms: false,
  clinics: false,
  newsletter: false,
  payments: false,
};
$$('[data-feature]').forEach(el => { el.hidden = !FEATURES[el.dataset.feature]; });

/* Messages go to Leslie's form endpoint (the <form action>) once one is set.
   With no endpoint, or on a local preview, the form runs in demo mode so nothing is sent. */
const IS_LOCAL = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) || location.protocol === 'file:';
const FORM_ACTION = (document.getElementById('inquiry-form').getAttribute('action') || '').trim();
const FORM_ENDPOINT = IS_LOCAL || !/^https:\/\//.test(FORM_ACTION) ? '' : FORM_ACTION;

/* ---------- Wait for CDN libraries (fail open) ---------- */
function waitFor(test, timeout) {
  return new Promise(resolve => {
    const t0 = performance.now();
    const tick = () => (test() || performance.now() - t0 > timeout) ? resolve(test()) : setTimeout(tick, 25);
    tick();
  });
}
const libsOk = await waitFor(() => window.gsap && window.ScrollTrigger, 6000);
if (!libsOk) { html.classList.remove('js'); throw new Error('GSAP failed to load; static fallback shown.'); }
await waitFor(() => window.Lenis, 2500);

gsap.registerPlugin(ScrollTrigger);
ScrollTrigger.config({ ignoreMobileResize: true });
gsap.defaults({ overwrite: 'auto' });

/* ---------- Smooth scroll ---------- */
let lenis = null;
if (!reduceMotion && window.Lenis) {
  lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.95, smoothWheel: true, syncTouch: false });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(t => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}
function scrollToHash(hash) {
  const el = $(hash);
  if (!el) return;
  if (lenis) lenis.scrollTo(el, { duration: 1.5, easing: t => 1 - Math.pow(1 - t, 4) });
  else el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
}
/* In-page links. data-format picks a coaching zone, data-path a future pathway,
   data-interest / data-updates pre-select the connect form. */
document.addEventListener('click', e => {
  const a = e.target.closest('a[href^="#"]');
  if (!a) return;
  e.preventDefault();
  if (a.getAttribute('href').length < 2) return;
  if (a.dataset.format) coaching.set(a.dataset.format);
  if (a.dataset.path) whatsNext.set(a.dataset.path);
  if (a.dataset.interest) inquiry.pick('interest', a.dataset.interest);
  if (a.dataset.updates) inquiry.pick('updates', a.dataset.updates);
  closeMenu();
  scrollToHash(a.getAttribute('href'));
  history.replaceState(null, '', a.getAttribute('href'));
});

/* ---------- Nav theme per section ---------- */
const themed = $$('main > section[data-theme]');
function setNav(el) { html.dataset.nav = el.dataset.theme; }
themed.forEach((el, i) => ScrollTrigger.create({
  trigger: el, start: 'top 40px', end: 'top 40px',
  onEnter: () => setNav(el), onLeaveBack: () => setNav(themed[Math.max(0, i - 1)]),
}));

/* ---------- Header: section line, hopping ball, court rail, hide-on-scroll ---------- */
const nav = (() => {
  const header = $('.nav'), linksWrap = $('.nav__links'), navLinks = $$('.nav__links a');
  const ballEl = $('.nav__ball'), subIn = $('.nav__sub-in');
  const rail = $('.nav__rail'), railFill = $('.nav__rail-fill'), railBall = $('.nav__rail-ball');
  const XP_LABEL = ['~60 players a week', 'Two years', '24 courts', 'Tournament play'];
  const COACH_LABEL = { weekly: 'Weekly coaching', club: 'Club &amp; community', future: 'Coaching, later' };
  const NEXT_LABEL = { leagues: 'Leagues', events: 'Events + community', facility: 'Facility vision' };
  const SECTIONS = [
    ['#hero', 'Pickleball', -1],
    ['#about', '<b>02</b>About Leslie', 0],
    ['#experience', () => `<b>03</b>${XP_LABEL[+$('.xp').dataset.i] || 'Experience'}`, 1],
    ['#gallery', '<b>04</b>On the court', 2],
    ['#coaching', () => `<b>05</b>${COACH_LABEL[$('.cmap').dataset.format]}`, 3],
    ['#next', () => `<b>06</b>${NEXT_LABEL[$('.next').dataset.path]}`, 4],
    ['#connect', '<b>07</b>Connect', 5],
    ['#finale', '<b>08</b>The next chapter', -1],
  ].map(([sel, label, link]) => ({ el: $(sel), label, link })).filter(s => s.el);
  const val = v => (typeof v === 'function' ? v() : v);
  const linkOf = i => (SECTIONS[i] ? val(SECTIONS[i].link) : -1);

  let current = -1, shownLabel = '', hoverLink = null, ballShown = false;
  const hop = reduceMotion ? 0 : 1;

  function placeBall(linkIdx, instant) {
    if (linkIdx < 0 || !navLinks[linkIdx] || !linksWrap.offsetParent) {
      if (ballShown) gsap.to(ballEl, { opacity: 0, scale: 0, duration: 0.3 });
      ballShown = false;
      return;
    }
    const w = linksWrap.getBoundingClientRect(), r = navLinks[linkIdx].getBoundingClientRect();
    const x = r.left - w.left + r.width / 2, y = r.bottom - w.top - 5;
    if (!ballShown || instant || !hop) {
      gsap.set(ballEl, { x, y });
      gsap.to(ballEl, { opacity: 1, scale: 1, duration: 0.35, ease: 'back.out(3)' });
      ballShown = true;
      return;
    }
    gsap.to(ballEl, { x, duration: 0.55, ease: 'power1.inOut' });
    gsap.timeline()
      .to(ballEl, { y: y - 16, duration: 0.27, ease: 'power2.out' })
      .to(ballEl, { y, duration: 0.4, ease: 'bounce.out' });
  }

  function setSection(i, force) {
    if (i === current && !force) return;
    const dir = i >= current ? 1 : -1;
    const first = current === -1;
    current = i;
    const s = SECTIONS[i], link = linkOf(i), label = val(s.label);
    navLinks.forEach((a, k) => {
      a.classList.toggle('is-active', k === link);
      if (k === link) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current');
    });
    if (hoverLink === null) placeBall(link);
    if (label === shownLabel) return;
    shownLabel = label;
    if (first || reduceMotion) { subIn.innerHTML = label; return; }
    gsap.timeline()
      .to(subIn, { yPercent: -110 * dir, duration: 0.3, ease: 'power2.in' })
      .add(() => { subIn.innerHTML = label; })
      .fromTo(subIn, { yPercent: 110 * dir }, { yPercent: 0, duration: 0.5, ease: 'power3.out' });
  }

  SECTIONS.forEach((s, i) => ScrollTrigger.create({
    trigger: s.el, start: 'top 50%', end: 'bottom 50%',
    onToggle: self => { if (self.isActive) setSection(i); },
  }));
  setSection(0);

  navLinks.forEach((a, k) => a.addEventListener('pointerenter', () => { hoverLink = k; placeBall(k); }));
  linksWrap.addEventListener('pointerleave', () => { hoverLink = null; placeBall(linkOf(current)); });

  function buildTicks() {
    $$('.nav__tick', rail).forEach(t => t.remove());
    const max = Math.max(1, ScrollTrigger.maxScroll(window));
    SECTIONS.slice(1).forEach(s => {
      const t = document.createElement('i');
      t.className = 'nav__tick';
      t.dataset.at = (s.el.getBoundingClientRect().top + window.scrollY) / max;
      t.style.left = `${Math.min(100, t.dataset.at * 100)}%`;
      rail.appendChild(t);
    });
    placeBall(linkOf(current), true);
  }
  ScrollTrigger.addEventListener('refresh', buildTicks);

  let lastY = window.scrollY;
  function onScroll() {
    const y = window.scrollY, max = Math.max(1, ScrollTrigger.maxScroll(window)), p = clamp(y / max, 0, 1);
    railFill.style.transform = `scaleX(${p})`;
    railBall.style.left = `${p * 100}%`;
    $$('.nav__tick', rail).forEach(t => t.classList.toggle('is-passed', p >= +t.dataset.at - 0.001));
    header.classList.toggle('is-solid', y > 24);
    const dy = y - lastY;
    if (!html.classList.contains('menu-open') && !header.matches(':focus-within')) {
      if (dy > 6 && y > innerHeight * 0.9) header.classList.add('is-hidden');
      else if (dy < -6 || y < innerHeight * 0.5) header.classList.remove('is-hidden');
    }
    lastY = y;
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  header.addEventListener('focusin', () => header.classList.remove('is-hidden'));
  window.addEventListener('pointermove', e => { if (e.clientY < 24) header.classList.remove('is-hidden'); }, { passive: true });
  window.addEventListener('resize', () => placeBall(linkOf(current), true));
  onScroll();
  return { onScroll, refresh: () => setSection(current, true) };
})();

/* ---------- Mobile menu ---------- */
const menuToggle = $('.nav__toggle'), menu = $('.menu');
function openMenu() { html.classList.add('menu-open'); menuToggle.setAttribute('aria-expanded', 'true'); menu.setAttribute('aria-hidden', 'false'); lenis?.stop(); }
function closeMenu() { if (!html.classList.contains('menu-open')) return; html.classList.remove('menu-open'); menuToggle.setAttribute('aria-expanded', 'false'); menu.setAttribute('aria-hidden', 'true'); lenis?.start(); }
menuToggle.addEventListener('click', () => html.classList.contains('menu-open') ? closeMenu() : openMenu());
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });

/* ---------- Custom cursor (desktop only): VIEW / WATCH / EXPLORE / CONNECT ---------- */
const cursorPos = { x: innerWidth / 2, y: innerHeight / 2, inside: false };
const CURSOR_LABELS = { view: 'View', watch: 'Watch', coaching: 'Explore', ask: 'Connect' };
if (finePointer && !mqMobile.matches && !reduceMotion) {
  html.classList.add('has-cursor', 'cursor-hidden');
  const cursorEl = $('.cursor'), labelEl = $('.cursor__label');
  const cur = { x: cursorPos.x, y: cursorPos.y };
  window.addEventListener('pointermove', e => {
    cursorPos.x = e.clientX; cursorPos.y = e.clientY; cursorPos.inside = true;
    html.classList.remove('cursor-hidden');
  }, { passive: true });
  document.addEventListener('mouseleave', () => { cursorPos.inside = false; html.classList.add('cursor-hidden'); });
  gsap.ticker.add(() => {
    cur.x = lerp(cur.x, cursorPos.x, 0.4); cur.y = lerp(cur.y, cursorPos.y, 0.4);
    cursorEl.style.transform = `translate3d(${cur.x}px, ${cur.y}px, 0)`;
  });
  const setCursorState = target => {
    const t = target && target.closest ? target.closest('[data-cursor], a, button, [role="tab"], label, .cmap__zone') : null;
    let s = t ? (t.dataset.cursor || (t.classList?.contains('cmap__zone') ? 'coaching' : 'link')) : '';
    if (s === 'coaching' && t.getAttribute('aria-selected') === 'true') s = 'link';
    if (html.dataset.cursor !== s) { html.dataset.cursor = s; labelEl.textContent = CURSOR_LABELS[s] || ''; }
  };
  document.addEventListener('pointerover', e => setCursorState(e.target));
  document.addEventListener('click', e => setCursorState(e.target));
  window.addEventListener('scroll', () => { if (cursorPos.inside) setCursorState(document.elementFromPoint(cursorPos.x, cursorPos.y)); }, { passive: true });
} else {
  cursorPos.inside = false;
}

/* ---------- Magnetic buttons + photo tilt ---------- */
if (finePointer && !reduceMotion) {
  $$('[data-magnetic]').forEach(btn => {
    const xTo = gsap.quickTo(btn, 'x', { duration: 0.6, ease: 'power3.out' });
    const yTo = gsap.quickTo(btn, 'y', { duration: 0.6, ease: 'power3.out' });
    btn.addEventListener('pointermove', e => {
      const r = btn.getBoundingClientRect();
      xTo((e.clientX - (r.left + r.width / 2)) * 0.28);
      yTo((e.clientY - (r.top + r.height / 2)) * 0.32);
    });
    btn.addEventListener('pointerleave', () => gsap.to(btn, { x: 0, y: 0, duration: 0.9, ease: 'elastic.out(1, 0.45)' }));
  });
  $$('[data-tilt]').forEach(fig => {
    gsap.set(fig, { transformPerspective: 1000 });
    const rx = gsap.quickTo(fig, 'rotationX', { duration: 0.8, ease: 'power3.out' });
    const ry = gsap.quickTo(fig, 'rotationY', { duration: 0.8, ease: 'power3.out' });
    fig.addEventListener('pointermove', e => {
      const r = fig.getBoundingClientRect();
      const nx = (e.clientX - r.left) / r.width - 0.5, ny = (e.clientY - r.top) / r.height - 0.5;
      rx(-ny * 4); ry(nx * 6);
    });
    fig.addEventListener('pointerleave', () => { rx(0); ry(0); });
  });
}

/* ---------- Shared: photo cross-wipe (the outgoing shot stays underneath until the new one has opened) ---------- */
function swapShots(shots, key, attr) {
  const prev = shots.find(el => el.classList.contains('is-active'));
  const next = shots.find(el => el.dataset[attr] === key);
  if (!next || prev === next) return;
  shots.forEach(el => el.classList.remove('is-leaving'));
  if (prev) { prev.classList.remove('is-active'); prev.classList.add('is-leaving'); }
  next.classList.add('is-active');
  let done = false;
  const release = () => { if (done) return; done = true; if (prev && !prev.classList.contains('is-active')) prev.classList.remove('is-leaving'); };
  const onEnd = e => { if (e.target === next && e.propertyName === 'clip-path') { next.removeEventListener('transitionend', onEnd); release(); } };
  next.addEventListener('transitionend', onEnd);
  setTimeout(release, 2600);
}

/* Generic tab wiring: click / arrow keys → set() */
function wireTabs(tabs, key, set) {
  tabs.forEach((t, k) => {
    t.addEventListener('click', () => set(t.dataset[key]));
    t.addEventListener('keydown', e => {
      const dir = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
      if (!dir) return;
      e.preventDefault();
      set(tabs[(k + dir + tabs.length) % tabs.length].dataset[key], true);
    });
  });
}
function markTabs(tabs, panels, key, value, focus) {
  tabs.forEach(t => {
    const sel = t.dataset[key] === value;
    t.setAttribute('aria-selected', String(sel));
    t.tabIndex = sel ? 0 : -1;
    if (sel && focus) t.focus({ preventScroll: true });
  });
  panels.forEach(p => {
    const sel = p.dataset[key] === value;
    p.classList.toggle('is-active', sel);
    p.toggleAttribute('inert', !sel);
    p.setAttribute('aria-hidden', String(!sel));
  });
}

/* ---------- 03 Experience: one marker at a time ----------
   The active marker sets the photo (cross-wipe), the timeline ticks, the counter and the count-up. */
const xp = (() => {
  const sec = $('.xp'), items = $$('.xp__item'), shots = $$('.xp__shot'), ticks = $$('.xp__tick');
  const countN = $('.xp__count-n'), fill = $('.xp__rail-fill'), rail = $('.xp__rail');
  let cur = 0, progress = 0;
  const fmt = (el, v) => { el.textContent = (el.dataset.prefix || '') + Math.round(v); };
  function count(item) {
    const b = $('.xp__num b[data-count]', item);
    if (!b || reduceMotion) return;
    b._tw?.kill();
    const o = { v: 0 };
    b._tw = gsap.to(o, { v: +b.dataset.count, duration: 1.3, ease: 'power3.out', onUpdate: () => fmt(b, o.v) });
  }
  function set(i) {
    if (i === cur || !items[i]) return;
    cur = i;
    sec.dataset.i = i;
    items.forEach((it, k) => it.classList.toggle('is-on', k === i));
    ticks.forEach((t, k) => t.classList.toggle('is-on', k <= i));
    swapShots(shots, String(i), 'i');
    countN.textContent = String(i + 1).padStart(2, '0');
    count(items[i]);
    nav.refresh();
  }
  function setProgress(p) { progress = p; fill.style.transform = `scaleY(${p.toFixed(4)})`; }
  /* Where the ball rides: down the stage rail (desktop) */
  const railPoint = () => { const r = rail.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height * progress }; };
  ticks.forEach((t, k) => t.classList.toggle('is-on', k === 0));
  return { set, setProgress, railPoint, count, items, get index() { return cur; } };
})();

/* ---------- 05 Coaching experience court map: WEEKLY / CLUB / FUTURE ----------
   Selecting a zone moves the ball along the route, wipes the photo, swaps copy + CTA. */
const coaching = (() => {
  const sec = $('.cmap'), tabs = $$('.cmap__tab'), panels = $$('.cp'), shots = $$('.cm'), zones = $$('.cmap__zone');
  const svg = $('.cmap__court'), ballEl = $('.cmap__ball');
  const ZONES = { weekly: [162, 210], club: [440, 210], future: [718, 210] };
  const ORDER = ['weekly', 'club', 'future'];
  function set(format, focus = false) {
    if (!ZONES[format] || sec.dataset.format === format) { if (focus) tabs.find(t => t.dataset.format === format)?.focus({ preventScroll: true }); return; }
    const to = ZONES[format];
    sec.dataset.format = format;
    sec.style.setProperty('--zx', `${(ORDER.indexOf(format) + 0.5) * 33}%`);
    markTabs(tabs, panels, 'format', format, focus);
    /* Photo cross-wipe: outgoing stays under the incoming one */
    const prev = shots.find(s => s.classList.contains('is-leaving'));
    prev?.classList.remove('is-leaving');
    const leaving = shots.find(s => s.dataset.format !== format && getComputedStyle(s).clipPath === 'inset(0px)');
    leaving?.classList.add('is-leaving');
    setTimeout(() => leaving?.classList.remove('is-leaving'), 1200);
    /* SVG ball: a lob between zones */
    if (reduceMotion) { ballEl.setAttribute('cx', to[0]); ballEl.setAttribute('cy', to[1]); }
    else {
      gsap.timeline({ overwrite: true })
        .to(ballEl, { attr: { cx: to[0] }, duration: 0.7, ease: 'power2.inOut' }, 0)
        .to(ballEl, { attr: { cy: to[1] - 60 }, duration: 0.32, ease: 'power2.out' }, 0)
        .to(ballEl, { attr: { cy: to[1] }, duration: 0.42, ease: 'bounce.out' }, 0.32);
    }
    nav.refresh();
  }
  wireTabs(tabs, 'format', set);
  zones.forEach(z => z.addEventListener('click', () => set(z.dataset.format)));
  /* Screen position of the active zone's centre (the rally ball reads this) */
  const zonePoint = () => {
    const [x, y] = ZONES[sec.dataset.format];
    const m = svg.getScreenCTM();
    return { x: m.a * x + m.c * y + m.e, y: m.b * x + m.d * y + m.f };
  };
  const zoneR = () => Math.max(12, svg.getScreenCTM().a * 15);
  return { set, zonePoint, zoneR, get format() { return sec.dataset.format; } };
})();

/* ---------- 06 What's next: LEAGUES / EVENTS / FACILITY ----------
   The community line branches into three pathways; the abstract court map answers:
   leagues → one court fills with player markers · events → several courts connect ·
   facility → 1, then 4, then 6 court outlines (vision only). Mobile: accordion. */
const whatsNext = (() => {
  const sec = $('.next'), tabs = $$('.nx'), panels = $$('.nxp'), svg = $('.next__map');
  const readK = $('.next__readout-k'), readN = $('.next__readout-n'), readU = $('.next__readout-u');
  const NS = 'http://www.w3.org/2000/svg';
  const mk = (tag, attrs, parent) => { const el = document.createElementNS(NS, tag); for (const k in attrs) el.setAttribute(k, attrs[k]); parent.appendChild(el); return el; };
  /* Six court slots, top-down. 150 × 68 ≈ a 44 × 20 ft court; kitchen lines 7 ft either side of the net. */
  const W = 150, H = 68, K = 24;
  const COURTS = [[45, 104], [225, 104], [405, 104], [45, 254], [225, 254], [405, 254]];
  const mid = i => [COURTS[i][0] + W / 2, COURTS[i][1] + H / 2];
  const players = i => { const [x, y] = COURTS[i]; return [[x + W * 0.2, y + H * 0.28], [x + W * 0.2, y + H * 0.72], [x + W * 0.8, y + H * 0.28], [x + W * 0.8, y + H * 0.72]]; };

  const gLinks = mk('g', { class: 'vlinks' }, svg);
  const link = mk('path', { class: 'vlink', d: `M${mid(0)} L${mid(1)} L${mid(2)} M${mid(1)} L${mid(4)}`, pathLength: 1 }, gLinks);
  const courts = COURTS.map(([x, y], i) => {
    const g = mk('g', { class: 'vc', 'data-c': i }, svg);
    mk('rect', { class: 'vc__out', x, y, width: W, height: H, rx: 2 }, g);
    mk('line', { class: 'vc__k', x1: x + W / 2 - K, y1: y, x2: x + W / 2 - K, y2: y + H }, g);
    mk('line', { class: 'vc__k', x1: x + W / 2 + K, y1: y, x2: x + W / 2 + K, y2: y + H }, g);
    mk('line', { class: 'vc__c', x1: x, y1: y + H / 2, x2: x + W / 2 - K, y2: y + H / 2 }, g);
    mk('line', { class: 'vc__c', x1: x + W / 2 + K, y1: y + H / 2, x2: x + W, y2: y + H / 2 }, g);
    mk('line', { class: 'vc__net', x1: x + W / 2, y1: y - 5, x2: x + W / 2, y2: y + H + 5 }, g);
    return g;
  });
  const DOTS = 16;
  const dots = Array.from({ length: DOTS }, () => mk('circle', { class: 'vp', cx: 300, cy: 210, r: 0 }, svg));

  /* Each state: courts on, dot positions (+ waiting markers), readout */
  const STATES = {
    leagues: {
      courts: [1],
      dots: [...players(1), ...[0, 1, 2, 3].map(k => [262 + k * 25, 206])],
      wait: [4, 5, 6, 7],
      read: ['Leagues', '8', 'players'],
    },
    events: {
      courts: [0, 1, 2, 4],
      dots: [...players(0), ...players(1), ...players(2), ...players(4)],
      read: ['Events + community', '4', 'courts connected'],
    },
    facility: {
      steps: [[1], [0, 1, 3, 4], [0, 1, 2, 3, 4, 5]],
      dots: [],
      read: ['Facility vision', '4–6', 'courts · concept'],
    },
  };

  let seq = null;
  function showCourts(list) { courts.forEach((g, i) => g.classList.toggle('is-on', list.includes(i))); }
  function setRead(k, n, u) { readK.textContent = k; readN.textContent = n; readU.textContent = u; }
  function placeDots(st, instant) {
    dots.forEach((d, i) => {
      const p = st.dots[i];
      const isWait = st.wait?.includes(i);
      d.classList.toggle('is-wait', !!isWait);
      const attrs = p ? { cx: p[0], cy: p[1], r: isWait ? 5 : 6.5 } : { r: 0 };
      if (instant) Object.entries(attrs).forEach(([k, v]) => d.setAttribute(k, v));
      else gsap.to(d, { attr: attrs, duration: 0.7, delay: p ? 0.25 + i * 0.045 : 0, ease: p ? 'back.out(1.8)' : 'power2.in', overwrite: true });
    });
  }
  function apply(path, instant = false) {
    const st = STATES[path];
    seq?.kill(); seq = null;
    placeDots(st, instant);
    if (st.steps) {
      if (instant) { showCourts(st.steps[2]); setRead(...st.read); return; }
      /* Facility: 1 court → 4 → 6, then settle on the honest range */
      showCourts(st.steps[0]); setRead(st.read[0], '1', 'court');
      seq = gsap.timeline()
        .add(() => { showCourts(st.steps[1]); setRead(st.read[0], '4', 'courts'); }, 0.9)
        .add(() => { showCourts(st.steps[2]); setRead(st.read[0], '6', 'courts'); }, 1.8)
        .add(() => setRead(...st.read), 2.9);
    } else {
      showCourts(st.courts);
      setRead(...st.read);
    }
  }
  function set(path, focus = false) {
    if (!STATES[path] || sec.dataset.path === path) { if (focus) tabs.find(t => t.dataset.path === path)?.focus({ preventScroll: true }); return; }
    sec.dataset.path = path;
    markTabs(tabs, panels, 'path', path, focus);
    apply(path, reduceMotion);
    nav.refresh();
  }
  /* Entrance: markers arrive on the court */
  function replay() {
    if (reduceMotion) return;
    dots.forEach(d => d.setAttribute('r', 0));
    apply(sec.dataset.path);
  }
  wireTabs(tabs, 'path', set);
  apply(sec.dataset.path, true);
  /* The rally ball sits on the active branch's dot */
  const dotPoint = () => {
    const d = $('.nx[aria-selected="true"] .nx__dot');
    const r = d.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  };
  return { set, replay, dotPoint, link, get path() { return sec.dataset.path; } };
})();

/* ---------- 07 Connect: three short steps on top of the native form ----------
   Step 2 (the interest list) is optional, so it never blocks step 3. */
const inquiry = (() => {
  const form = $('#inquiry-form'), steps = $$('.inq__step', form), prog = $$('.inq__progress li', form), bar = $('.inq__bar', form);
  const rail = $('.inq__rail', form);
  const answered = name => !!form.querySelector(`input[name="${name}"]:checked`);
  const filled = () => form.elements.name.value.trim() !== '' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.elements.email.value);
  let step = 1;
  function render() {
    const a = answered('interest');
    step = !a ? 1 : filled() ? 3 : 2;
    form.dataset.step = step;
    steps.forEach(s => s.classList.toggle('is-waiting', step === 1 && +s.dataset.step > 1));
    prog.forEach(p => p.classList.toggle('is-on', +p.dataset.step <= step));
    bar.style.setProperty('--p', ((step - 1) / 2).toFixed(2));
    if (a) form.querySelector('input[name="interest"]').closest('.inq__chips').classList.remove('is-invalid');
  }
  form.addEventListener('change', render);
  form.addEventListener('input', e => { if (e.target.matches('.field__input')) render(); });
  function pick(name, value) {
    const input = form.querySelector(`input[name="${name}"][value="${CSS.escape(value)}"]`);
    if (!input) return;
    input.checked = true;
    render();
  }
  render();
  /* Where the ball sits on the progress rail */
  const railPoint = () => {
    const r = rail.getBoundingClientRect();
    return { x: r.left + r.width * ((step - 1) / 2), y: r.top + 1 };
  };
  return { pick, render, railPoint, get step() { return step; } };
})();

/* =========================================================
   THE COMMUNITY LINE — ball controller (preserved)
   ========================================================= */
const rally = (() => {
  const root = $('.ball'), shadow = $('.ball-shadow');
  let ball = null, anchors = [], intro = null, prev = null;
  const pathLen = new Map();
  const cur = { x: 0, y: 0, r: 40 };
  let hiddenByUI = false;

  function init() {
    if (reduceMotion) { root.remove(); shadow.remove(); return false; }
    ball = createBall({ root });
    html.classList.add('has-ball');
    ball.setVisible(false);
    window.addEventListener('resize', () => ball.resize());
    document.addEventListener('visibilitychange', () => { if (document.hidden) prev = null; });
    gsap.ticker.add(tick);
    return true;
  }

  function pathPoint(path, u) {
    const len = pathLen.has(path) ? pathLen.get(path) : (pathLen.set(path, lengthOf(path)), pathLen.get(path));
    const pt = path.getPointAtLength(clamp(u, 0, 1) * len);
    const m = path.getScreenCTM();
    return { x: m.a * pt.x + m.c * pt.y + m.e, y: m.b * pt.x + m.d * pt.y + m.f };
  }

  function sample(s) {
    const n = anchors.length;
    if (!n) return null;
    const ats = anchors.map(a => a.at());
    let i = 0;
    while (i < n - 1 && s >= ats[i + 1]) i++;
    const a = anchors[i], b = anchors[i + 1];
    const resting = p => ({ x: p.x, y: p.y, r: a.r(), alpha: a.alpha ?? 1, groundY: p.y, height: 0, squash: 1 });
    if (!b || s <= ats[i]) return resting(a.pos());

    const span = Math.max(1, ats[i + 1] - ats[i]);
    const u = clamp((s - ats[i]) / span, 0, 1);

    if (a.path) {
      const p = pathPoint(a.path, u * (a.pathEnd ?? 1));
      return { x: p.x, y: p.y, r: a.r(), alpha: 1, groundY: p.y + 2, height: 0, squash: 1, noShadow: !!a.noShadow };
    }

    const p0 = a.pos(), p1 = b.pos();
    const ue = easeInOut(u);
    const gx = lerp(p0.x, p1.x, ue), gy = lerp(p0.y, p1.y, ue);
    const arcH = (a.arc ?? 0.16) * innerHeight;
    const h = Math.sin(Math.PI * u);
    const edge = Math.min(u, 1 - u);
    const squash = edge < 0.07 && arcH ? 1 - 0.16 * (1 - edge / 0.07) : 1;
    return {
      x: gx, y: gy - arcH * h,
      r: lerp(a.r(), b.r(), ue),
      alpha: lerp(a.alpha ?? 1, b.alpha ?? 1, ue),
      groundY: gy, height: h * (arcH ? 1 : 0), squash,
    };
  }

  function tick(_, dtMs) {
    if (!ball) return;
    const dt = Math.min(0.05, dtMs / 1000);
    const st = sample(window.scrollY);
    if (!st || hiddenByUI) { ball.setVisible(false); ball.update(dt); shadow.style.opacity = 0; prev = null; return; }

    let tx = st.x, ty = st.y;
    if (intro) { tx += intro.x; ty += intro.y; }
    const k = 1 - Math.exp(-dt * (intro ? 40 : 12));
    if (!prev) { cur.x = tx; cur.y = ty; cur.r = st.r; }
    else { cur.x += (tx - cur.x) * k; cur.y += (ty - cur.y) * k; cur.r += (st.r - cur.r) * k; }
    const dx = prev ? cur.x - prev.x : 0, dy = prev ? cur.y - prev.y : 0;
    prev = { x: cur.x, y: cur.y };

    ball.roll(dx, dy);
    ball.setScreen(cur.x, cur.y, cur.r, st.squash);
    ball.setAlpha(st.alpha);
    ball.setVisible(st.alpha > 0.02);

    if (cursorPos.inside) {
      const nx = clamp((cursorPos.x - cur.x) / innerWidth * 2, -1, 1);
      const ny = clamp((cursorPos.y - cur.y) / innerHeight * 2, -1, 1);
      ball.lookToward(nx, -ny);
    }

    const lift = clamp(st.height, 0, 1);
    const shadowY = st.groundY + cur.r * 1.05;
    shadow.style.width = `${cur.r * 2.6}px`;
    shadow.style.height = `${cur.r * 0.5}px`;
    shadow.style.opacity = st.noShadow ? 0 : st.alpha * (0.85 - lift * 0.55);
    shadow.style.transform = `translate(${cur.x}px, ${shadowY}px) translate(-50%, -50%) scale(${1 - lift * 0.35})`;

    ball.update(dt);
  }

  return {
    init,
    pathPoint,
    setAnchors(list) { anchors = list; prev = null; },
    setHidden(v) { hiddenByUI = v; },
    /** Hero entrance: the ball drops in from the top-right with a real bounce and lands beside Leslie. */
    enter() {
      if (!ball) return;
      intro = { x: innerWidth * 0.35, y: -innerHeight * 0.75 };
      gsap.to(intro, { x: 0, duration: 1.5, ease: 'power2.out' });
      gsap.to(intro, { y: 0, duration: 1.5, ease: 'bounce.out', onComplete: () => { intro = null; } });
    },
    get active() { return !!ball; },
    get anchors() { return anchors; },
    sample,
  };
})();
const hasBall = rally.init();

/* ---------- Shared helpers for anchors ---------- */
const rectOf = el => el.getBoundingClientRect();
const center = el => { const r = rectOf(el); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };
const docTop = el => rectOf(el).top + window.scrollY;
const vh = () => innerHeight;
const baseR = () => (mqMobile.matches ? 20 : clamp(innerWidth * 0.026, 22, 42));
const A = Object.fromEntries($$('[data-ball]').map(el => [el.dataset.ball, el]));

/* ---------- Logo: LM — one court corner + a ball path ----------
   Intro: the kitchen line draws, the ball runs down the sideline, turns at the corner and its path
   writes L·M, then rests. Loop (~7s): the trace clears, the ball runs it again, a soft pulse, rest. */
const logo = (() => {
  const path = $('.nav__mark .lm-path'), ball = $('.nav__mark .lm-ball'), pulse = $('.nav__mark .lm-pulse'), kitchen = $('.nav__mark .lm-kitchen');
  const L = path.getTotalLength();
  const ride = { u: 1 };
  const place = () => {
    const p = path.getPointAtLength(L * ride.u);
    ball.setAttribute('cx', p.x.toFixed(2)); ball.setAttribute('cy', p.y.toFixed(2));
    path.style.strokeDashoffset = (L * (1 - ride.u)).toFixed(2);
  };
  let loop = null;
  function intro() {
    gsap.set(path, { strokeDasharray: L });
    ride.u = 0; place();
    return gsap.timeline({ defaults: { ease: 'power3.out' } })
      .fromTo(kitchen, { scaleX: 0, transformOrigin: '0% 50%' }, { scaleX: 1, duration: 0.7, ease: 'power2.inOut' }, 0)
      .fromTo(ball, { opacity: 0 }, { opacity: 1, duration: 0.3 }, 0.2)
      .to(ride, { u: 1, duration: 1.4, ease: 'power1.inOut', onUpdate: place }, 0.3)
      .fromTo(pulse, { scale: 1, opacity: 0.9, transformOrigin: '50% 50%' }, { scale: 2.4, opacity: 0, duration: 0.7, ease: 'power2.out' }, 1.7)
      .fromTo('.nav__name', { opacity: 0, x: -6 }, { opacity: 1, x: 0, duration: 0.6 }, 0.4)
      .to('.nav__sub-in', { y: 0, duration: 0.6 }, 0.6);
  }
  function makeLoop() {
    loop = gsap.timeline({ paused: true, repeat: -1, repeatDelay: 4.6, defaults: { overwrite: false } })
      .to([path, ball], { opacity: 0, duration: 0.3, ease: 'power1.in' }, 0)
      .add(() => { ride.u = 0; place(); }, 0.35)
      .set(path, { opacity: 1 }, 0.36)
      .to(ball, { opacity: 1, duration: 0.25 }, 0.4)
      .to(ride, { u: 1, duration: 1.5, ease: 'power1.inOut', onUpdate: place }, 0.45)
      .fromTo(pulse, { scale: 1, opacity: 0.9 }, { scale: 2.4, opacity: 0, duration: 0.7, ease: 'power2.out', immediateRender: false }, 1.95);
    return loop;
  }
  $('.nav__brand').addEventListener('pointerenter', () => {
    if (loop && (loop.time() >= loop.duration() - 0.05 || !loop.isActive())) loop.restart();
  });
  return { intro, makeLoop };
})();

/* ---------- Hero intro: logo → court lines draw → Leslie reveals via mask → trajectory → ball enters →
   headline → lede → CTAs → credibility line ---------- */
function heroIntro(isMobile) {
  const hero = $('.hero');
  const lines = $$('.hero__court .court-line');
  lines.forEach(l => { const len = lengthOf(l); gsap.set(l, { strokeDasharray: len, strokeDashoffset: len }); });
  const arc = $('.hero__arc-reveal'), arcLen = lengthOf(arc);
  gsap.set(arc, { strokeDasharray: arcLen, strokeDashoffset: arcLen });

  const loop = logo.makeLoop();
  const tl = gsap.timeline({ defaults: { ease: 'power3.out' }, onComplete: () => { hero.classList.add('is-ready'); loop.play(); } });
  tl.add(logo.intro(), 0)
    .to(lines, { strokeDashoffset: 0, duration: 1.3, stagger: 0.08, ease: 'power2.inOut' }, 0.15)
    .to('.hero__media', { clipPath: 'inset(0% 0 0 0)', duration: 1.35, ease: 'power4.inOut' }, 0.4)
    .to('.hero__media img', { scale: 1.02, duration: 2.4, ease: 'power3.out' }, 0.45)
    .to(arc, { strokeDashoffset: 0, duration: 1.5, ease: 'power2.inOut' }, 0.9)
    .add(() => rally.enter(), 1.15)
    .to('.hero__eyebrow', { opacity: 1, duration: 0.6 }, 0.8)
    .to('.hero__title .mask > span', { y: 0, duration: 1.05, stagger: 0.15, ease: 'power4.out' }, 0.95)
    .fromTo('.hero__lede', { y: 18 }, { y: 0, opacity: 1, duration: 0.9 }, 1.45)
    .fromTo('.hero__cta .btn', { y: 16 }, { y: 0, opacity: 1, duration: 0.8, stagger: 0.1, clearProps: 'y' }, 1.6)
    .fromTo('.hero__creds li', { y: 14 }, { y: 0, opacity: 1, duration: 0.8, stagger: 0.09 }, 1.8)
    .fromTo('.hero__now', { y: 14, scale: 0.9 }, { y: 0, scale: 1, opacity: 1, duration: 0.7, ease: 'back.out(2)' }, 2.0)
    .to('.hero__scroll', { opacity: 1, duration: 0.6 }, 2.4);

  /* Scroll-out: Leslie sinks slightly, the copy drifts; the ball (handled by anchors) travels on into the story */
  const out = { trigger: hero, start: 'top top', end: 'bottom top', scrub: true };
  gsap.to('.hero__visual', { yPercent: 8, ease: 'none', scrollTrigger: out });
  if (!isMobile) {
    gsap.to('.hero__intro', { yPercent: -6, ease: 'none', scrollTrigger: out });
    if (finePointer) {
      const vx = gsap.quickTo('.hero__visual', 'x', { duration: 1.1, ease: 'power3.out' }), vy = gsap.quickTo('.hero__visual', 'y', { duration: 1.1, ease: 'power3.out' });
      hero.addEventListener('pointermove', e => {
        const nx = e.clientX / innerWidth - 0.5, ny = e.clientY / innerHeight - 0.5;
        vx(nx * -14); vy(ny * -10);
      });
      hero.addEventListener('pointerleave', () => { vx(0); vy(0); });
    }
  }
  return tl;
}

/* ---------- Generic reveals ---------- */
function maskReveal(selector, trigger, start = 'top 80%') {
  return gsap.from(selector, {
    yPercent: 112, duration: 1.15, stagger: 0.12, ease: 'power4.out',
    scrollTrigger: { trigger, start, once: true },
  });
}
function fadeUp(selector, trigger, start = 'top 80%', stagger = 0.08) {
  return gsap.from(selector, { opacity: 0, y: 22, duration: 1, stagger, ease: 'power3.out', scrollTrigger: { trigger, start, once: true } });
}

/* =========================================================
   SECTIONS
   ========================================================= */
/* 02 About: kept layout + the community line as Leslie's career path
   (coaching → community → club → competition → next chapter), lighting each stop. */
function setupAbout(isDesktop, reduced = false) {
  const sec = $('.coach'), line = $('.path__line'), nodes = $$('.pn'), list = $('.path__nodes');
  const L = lengthOf(line);
  /* Path fraction where the line reaches each node's x (x is monotonic along this path).
     On mobile the SVG is hidden (L = 0) and the vertical list is used instead. */
  const F = !L ? nodes.map(() => 1) : nodes.map(n => {
    const tx = +n.dataset.x * 1200;
    let lo = 0, hi = L;
    for (let k = 0; k < 22; k++) { const m = (lo + hi) / 2; if (line.getPointAtLength(m).x < tx) lo = m; else hi = m; }
    return hi / L;
  });
  const drawLine = u => {
    line.style.strokeDashoffset = L * (1 - u);
    F.forEach((f, k) => nodes[k].classList.toggle('is-on', u >= f - 0.002));
  };
  const fillList = p => {
    list.style.setProperty('--fill', p.toFixed(3));
    nodes.forEach((n, k) => n.classList.toggle('is-on', p >= k / (nodes.length - 1) - 0.02));
  };
  gsap.set(line, { strokeDasharray: L, strokeDashoffset: L });
  if (reduced) { drawLine(1); fillList(1); return { line, st: null, endF: F[F.length - 1] }; }

  gsap.fromTo('.coach__lines-a', { x: -80 }, { x: 80, ease: 'none', scrollTrigger: { trigger: sec, start: 'top bottom', end: 'bottom top', scrub: true } });
  gsap.fromTo('.coach__lines-b', { y: 60 }, { y: -60, ease: 'none', scrollTrigger: { trigger: sec, start: 'top bottom', end: 'bottom top', scrub: true } });
  maskReveal('.coach__title .mask > span', '.coach__title');
  gsap.to('.coach__copy p', { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.1, stagger: 0.16, ease: 'power3.inOut', scrollTrigger: { trigger: '.coach__copy', start: 'top 85%', once: true } });
  gsap.to('.coach__media img', { scale: 1, ease: 'none', scrollTrigger: { trigger: '.coach__media', start: 'top bottom', end: 'center 45%', scrub: true } });
  gsap.fromTo('.coach__visual', { y: 60 }, { y: -36, ease: 'none', scrollTrigger: { trigger: sec, start: 'top bottom', end: 'bottom top', scrub: true } });
  gsap.from('.coach__inset', { yPercent: 28, opacity: 0, rotation: -4, duration: 1.2, ease: 'power3.out', scrollTrigger: { trigger: '.coach__visual', start: 'top 55%', once: true } });
  gsap.from('.coach__known-label, .coach__chips li', { opacity: 0, y: 14, duration: 0.8, stagger: 0.06, ease: 'power3.out', scrollTrigger: { trigger: '.coach__known', start: 'top 92%', once: true } });
  fadeUp('.path__label', '.path', 'top 90%');

  let st = null;
  if (isDesktop) {
    st = ScrollTrigger.create({ trigger: '.path', start: 'top 85%', end: 'bottom 45%', onUpdate: s => drawLine(s.progress * F[F.length - 1]) });
    drawLine(0);
  } else {
    ScrollTrigger.create({ trigger: list, start: 'top 75%', end: 'bottom 60%', onUpdate: s => fillList(s.progress) });
    fillList(0);
  }
  return { line, st, endF: F[F.length - 1] };
}

/* 03 Experience: each marker takes over as it crosses the middle of the screen; the rail fills with scroll. */
function setupXP(isDesktop, reduced = false) {
  const list = $('.xp__list');
  xp.items.forEach((it, k) => ScrollTrigger.create({
    trigger: it, start: 'top 58%', end: 'bottom 58%',
    onToggle: s => { if (s.isActive) xp.set(k); },
  }));
  const st = ScrollTrigger.create({ trigger: list, start: 'top 58%', end: 'bottom 58%', onUpdate: s => xp.setProgress(s.progress) });
  xp.setProgress(0);
  if (!reduced) {
    maskReveal('.xp__head .mask > span', '.xp__head');
    fadeUp('.xp__intro', '.xp__head', 'top 72%');
    gsap.from('.xp__frame', { clipPath: 'inset(0 0 100% 0 round 22px)', duration: 1.3, ease: 'power4.out', scrollTrigger: { trigger: '.xp__stage', start: 'top 80%', once: true } });
    ScrollTrigger.create({ trigger: list, start: 'top 70%', once: true, onEnter: () => xp.count(xp.items[xp.index]) });
    if (!isDesktop) gsap.utils.toArray('.xp__m').forEach(m => gsap.from(m, { clipPath: 'inset(0 0 100% 0 round 16px)', duration: 1.1, ease: 'power4.out', scrollTrigger: { trigger: m, start: 'top 85%', once: true } }));
  }
  fadeUp('.xp__next', '.xp__next', 'top 92%');
  /* Ball point: desktop rides the sticky stage rail; mobile rides the list rail at the middle of the screen */
  const point = isDesktop ? xp.railPoint : () => {
    const r = list.getBoundingClientRect();
    return { x: r.left + 11, y: clamp(innerHeight * 0.5, r.top + 20, r.bottom - 20) };
  };
  return { st, point };
}

function setupAction(isDesktop) {
  const fig = $('.action__video');
  const round = isDesktop ? 22 : 16;
  let hovering = false;
  gsap.set(fig, { clipPath: isDesktop ? `inset(0% 12% 0% 12% round ${round}px)` : `inset(0% 5% 0% 5% round ${round}px)`, scale: isDesktop ? 0.94 : 1 });
  gsap.to(fig, { clipPath: `inset(0% 0% 0% 0% round ${round}px)`, scale: 1, ease: 'none', scrollTrigger: { trigger: fig, start: 'top 88%', end: 'top 12%', scrub: true } });
  gsap.fromTo('.action__video img', { scale: 1.14 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: fig, start: 'top bottom', end: 'bottom top', scrub: true } });
  maskReveal('.action__head .mask > span', '.action__head');
  if (isDesktop) {
    $$('.collage__item').forEach(el => {
      const sp = parseFloat(el.dataset.speed || '1');
      gsap.fromTo(el, { y: (sp - 1) * -200 }, { y: (sp - 1) * 200, ease: 'none', scrollTrigger: { trigger: '.action__collage', start: 'top bottom', end: 'bottom top', scrub: true } });
    });
    gsap.fromTo('.collage__item', { clipPath: `inset(100% 0% 0% 0% round ${round}px)` }, { clipPath: `inset(0% 0% 0% 0% round ${round}px)`, duration: 1.3, stagger: 0.12, ease: 'power4.out', scrollTrigger: { trigger: '.action__collage', start: 'top 82%', once: true } });
  } else {
    gsap.from('.collage__item', { opacity: 0, x: 40, duration: 1, stagger: 0.1, ease: 'power3.out', scrollTrigger: { trigger: '.action__collage', start: 'top 88%', once: true } });
  }
  const enter = () => { hovering = true; }, leave = () => { hovering = false; };
  if (isDesktop) { fig.addEventListener('pointerenter', enter); fig.addEventListener('pointerleave', leave); }
  return {
    fig,
    cleanup: () => { fig.removeEventListener('pointerenter', enter); fig.removeEventListener('pointerleave', leave); },
    pos: () => (isDesktop && hovering && cursorPos.inside) ? { x: cursorPos.x, y: cursorPos.y } : center(A['action-park']),
    followR: () => (isDesktop && hovering && cursorPos.inside) ? baseR() * 0.42 : baseR() * 0.78,
  };
}

/* 05 Coaching experience: the court draws in, the zones settle */
function setupCoaching() {
  maskReveal('.cmap__head .mask > span', '.cmap__head');
  fadeUp('.cmap__intro', '.cmap__head', 'top 72%');
  const lines = $$('.cmap__line, .cmap__net');
  lines.forEach(l => { const len = lengthOf(l); gsap.set(l, { strokeDasharray: len, strokeDashoffset: len }); });
  gsap.timeline({ scrollTrigger: { trigger: '.cmap__stage', start: 'top 78%', once: true } })
    .to(lines, { strokeDashoffset: 0, duration: 1.3, stagger: 0.07, ease: 'power2.inOut' })
    .from('.cmap__tab', { opacity: 0, y: 14, duration: 0.8, stagger: 0.1, ease: 'power3.out' }, 0.5)
    .from('.cmap__ball', { scale: 0, transformOrigin: '50% 50%', duration: 0.6, ease: 'back.out(3)' }, 1.0);
  fadeUp('.cmap__media', '.cmap__media', 'top 88%');
  fadeUp('.cmap__panels', '.cmap__panels', 'top 88%');
}

/* 06 What's next: the branches grow, the court map wakes up and the markers arrive */
function setupNext() {
  maskReveal('.next__head .mask > span', '.next__head');
  fadeUp('.next__intro', '.next__head', 'top 72%');
  gsap.from('.nx', { opacity: 0, x: -18, duration: 0.9, stagger: 0.12, ease: 'power3.out', scrollTrigger: { trigger: '.next__list', start: 'top 82%', once: true } });
  gsap.from('.next__trunk', { scaleY: 0, transformOrigin: '50% 0%', duration: 1.2, ease: 'power2.inOut', scrollTrigger: { trigger: '.next__list', start: 'top 82%', once: true } });
  gsap.from('.next__stage', { opacity: 0, y: 30, duration: 1.1, ease: 'power3.out', scrollTrigger: { trigger: '.next__stage', start: 'top 82%', once: true } });
  ScrollTrigger.create({ trigger: '.next__stage', start: 'top 70%', once: true, onEnter: () => whatsNext.replay() });
}

function setupInquire() {
  maskReveal('.inquire__intro .mask > span', '.inquire__intro');
  gsap.from('.reconnect path', { strokeDashoffset: 1, duration: 1.3, stagger: 0.12, ease: 'power2.inOut', scrollTrigger: { trigger: '.reconnect', start: 'top 85%', once: true } });
  fadeUp('.inquire__copy, .inquire__facts li', '.inquire__intro', 'top 75%', 0.07);
  gsap.from('.inq__progress, .inq__step, .form__actions', { opacity: 0, y: 22, duration: 0.9, stagger: 0.1, ease: 'power3.out', clearProps: 'opacity,transform', scrollTrigger: { trigger: '.form', start: 'top 82%', once: true } });
}

function setupFinale() {
  gsap.from('.footer__big .mask > span', { yPercent: 110, duration: 1.3, stagger: 0.14, ease: 'power4.out', scrollTrigger: { trigger: '.footer__big', start: 'top 85%', once: true } });
  gsap.from('.finale__side > *', { opacity: 0, y: 20, duration: 1, stagger: 0.12, ease: 'power3.out', scrollTrigger: { trigger: '.finale__side', start: 'top 90%', once: true } });
  gsap.from('.footer__legal', { opacity: 0, y: 16, duration: 1, scrollTrigger: { trigger: '.footer__legal', start: 'top 98%', once: true } });
  const court = $('.court');
  ScrollTrigger.create({ trigger: court, start: 'top 82%', once: true, onEnter: () => court.classList.add('is-drawn') });
  gsap.from('.score__num', { yPercent: 60, opacity: 0, rotateX: -80, duration: 0.9, stagger: 0.14, ease: 'back.out(2)', delay: 0.9, scrollTrigger: { trigger: court, start: 'top 82%', once: true } });

  const track = $('.marquee__track');
  const loop = gsap.to(track, { xPercent: -50, duration: 36, ease: 'none', repeat: -1, paused: true });
  let dir = 1;
  const marqueeST = ScrollTrigger.create({
    trigger: '.marquee', start: 'top bottom', end: 'bottom top',
    onToggle: s => (s.isActive ? loop.play() : loop.pause()),
    onUpdate: s => {
      const v = s.getVelocity();
      if (Math.abs(v) > 20) dir = v > 0 ? 1 : -1;
      const boost = clamp(Math.abs(v) / 250, 0, 6);
      gsap.to(loop, { timeScale: dir * (1 + boost), duration: 0.25, overwrite: true });
      gsap.to(loop, { timeScale: dir, duration: 1.4, delay: 0.25, ease: 'power2.out' });
    },
  });

  const cleanups = [() => { loop.kill(); marqueeST.kill(); }];
  const words = $$('[data-letters]');
  if (words.length && !words[0].querySelector('.ch')) {
    words.forEach(w => {
      const text = w.textContent;
      w.textContent = '';
      [...text].forEach(c => {
        const s = document.createElement('span');
        s.className = c === ' ' ? 'ch ch--space' : 'ch';
        s.textContent = c === ' ' ? ' ' : c;
        s.setAttribute('aria-hidden', 'true');
        w.appendChild(s);
      });
    });
  }
  if (finePointer) {
    const big = $('.footer__big'), chars = $$('.footer__word .ch:not(.ch--space)');
    let raf = 0, px = 0, py = 0;
    const paint = () => {
      raf = 0;
      chars.forEach(ch => {
        const r = ch.getBoundingClientRect();
        const d = Math.hypot(px - (r.left + r.width / 2), py - (r.top + r.height / 2));
        const t = clamp(1 - d / 260, 0, 1);
        ch.style.setProperty('--w', Math.round(600 + 200 * t * t));
      });
    };
    const move = e => { px = e.clientX; py = e.clientY; if (!raf) raf = requestAnimationFrame(paint); };
    const leave = () => chars.forEach(ch => ch.style.removeProperty('--w'));
    big.addEventListener('pointermove', move);
    big.addEventListener('pointerleave', leave);
    cleanups.push(() => { big.removeEventListener('pointermove', move); big.removeEventListener('pointerleave', leave); leave(); });
  }
  return () => cleanups.forEach(f => f());
}

/* ---------- Gallery lightbox (preserved) — now plays real video when a trigger carries data-video ---------- */
(function lightbox() {
  const dlg = $('#lightbox'), view = $('.lightbox__img'), vid = $('.lightbox__video'), cap = $('.lightbox__cap'), count = $('.lightbox__count');
  const triggers = $$('[data-gallery]').sort((a, b) => a.dataset.gallery - b.dataset.gallery);
  const items = triggers.map(t => {
    const img = $('img', t.closest('figure'));
    if (t.dataset.video) {
      t.dataset.cursor = 'watch';
      const ring = $('.action__play-ring span', t);
      if (ring) ring.textContent = 'Watch';
    }
    return { img, video: t.dataset.video || '', poster: t.dataset.poster || '', caption: img.dataset.caption || img.alt };
  });
  let i = 0;
  function show(k) {
    i = (k + items.length) % items.length;
    const it = items[i];
    if (it.video) {
      view.hidden = true;
      vid.hidden = false;
      if (vid.getAttribute('src') !== it.video) { vid.src = it.video; if (it.poster) vid.poster = it.poster; }
      vid.play?.().catch(() => {});
    } else {
      vid.pause(); vid.hidden = true;
      view.hidden = false;
      view.src = it.img.currentSrc || it.img.src;
      view.alt = it.img.alt;
    }
    cap.textContent = it.caption;
    count.textContent = `${i + 1} / ${items.length}`;
  }
  const open = k => { show(k); dlg.showModal(); lenis?.stop(); rally.setHidden(true); };
  const close = () => { if (dlg.open) dlg.close(); };
  triggers.forEach(t => t.addEventListener('click', () => open(+t.dataset.gallery)));
  $$('.lightbox__step').forEach(b => b.addEventListener('click', () => show(i + +b.dataset.step)));
  $('.lightbox__close').addEventListener('click', close);
  dlg.addEventListener('click', e => { if (e.target === dlg) close(); });
  dlg.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight') show(i + 1);
    if (e.key === 'ArrowLeft') show(i - 1);
  });
  dlg.addEventListener('close', () => { vid.pause(); lenis?.start(); rally.setHidden(false); });
})();

/* ---------- Form submit (preserved mechanics, new fields) ---------- */
(function form() {
  const form = $('#inquiry-form'), status = $('.form__status');
  form.addEventListener('submit', async e => {
    e.preventDefault();
    let bad = false;
    const interestOk = !!form.querySelector('input[name="interest"]:checked');
    form.querySelector('input[name="interest"]').closest('.inq__chips').classList.toggle('is-invalid', !interestOk);
    if (!interestOk) bad = true;
    ['name', 'email'].map(n => form.elements[n]).forEach(f => {
      const ok = f.name === 'email' ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.value) : f.value.trim() !== '';
      f.classList.toggle('is-invalid', !ok);
      if (!ok) bad = true;
    });
    if (bad) { status.textContent = "Pick what you're reaching out about, then add your name and a valid email so Leslie can reply."; return; }
    const fd = new FormData(form);
    const data = { ...Object.fromEntries(fd), updates: fd.getAll('updates') };
    status.textContent = 'Sending…';
    try {
      if (FORM_ENDPOINT) {
        const res = await fetch(FORM_ENDPOINT, { method: 'POST', headers: { Accept: 'application/json' }, body: fd });
        if (!res.ok) throw new Error(res.statusText);
        status.textContent = 'Thank you. Leslie has your message.';
      } else {
        console.info('[form] Demo mode — set the connect form action in index.html. Payload:', data);
        status.textContent = "Thanks. This preview isn't connected to an inbox yet, so nothing was sent.";
      }
      form.classList.add('is-sent');
      ScrollTrigger.refresh();
    } catch (err) {
      status.textContent = 'Something went wrong sending that. Please try again in a moment.';
    }
  });
})();

/* =========================================================
   BUILD — responsive contexts
   ========================================================= */
const mm = gsap.matchMedia();
mm.add({ isDesktop: '(min-width: 901px)', isMobile: '(max-width: 900px)', reduce: '(prefers-reduced-motion: reduce)' }, ctx => {
  const { isDesktop, reduce } = ctx.conditions;
  if (reduce) return setupReduced(isDesktop);

  const isMobile = !isDesktop;
  heroIntro(isMobile);
  const about = setupAbout(isDesktop);
  const xpSec = setupXP(isDesktop);
  const action = setupAction(isDesktop);
  setupCoaching();
  setupNext();
  setupInquire();
  const finaleCleanup = setupFinale();

  /* ---- The community line: hero → career path → experience timeline → gallery →
     court-map zone → future branch → connect progress line → footer ---- */
  const riders = [];
  if (hasBall) {
    const R = baseR;
    const aboutSec = $('.coach'), xpEl = $('.xp'), xpList = $('.xp__list'), cmapSec = $('.cmap'), nextSec = $('.next'), inquireIntro = $('.inquire__intro');
    const anchors = [
      { name: 'hero', at: () => 0, pos: () => center(A.hero), r: () => R(), arc: 0.22 },
      /* About: the ball rides Leslie's career path and lands on "next chapter" */
      ...(about.st ? [
        { name: 'path-ride', at: () => about.st.start, pos: () => rally.pathPoint(about.line, 0), r: () => R() * 0.42, path: about.line, pathEnd: about.endF },
        { name: 'path-out', at: () => about.st.end, pos: () => rally.pathPoint(about.line, about.endF), r: () => R() * 0.42, arc: 0.3 },
      ] : [
        { name: 'about', at: () => docTop(aboutSec) - vh() * 0.3, pos: () => center(A.about), r: () => R() * 0.6, arc: 0.24 },
      ]),
      /* Experience: the ball rides the timeline rail as the markers change */
      { name: 'xp-in', at: () => docTop(xpList) - vh() * 0.58, pos: xpSec.point, r: () => R() * 0.42, arc: 0 },
      { name: 'xp-out', at: () => docTop(xpList) + xpList.offsetHeight - vh() * 0.58, pos: xpSec.point, r: () => R() * 0.42, arc: 0.3 },
      { name: 'action-in', at: () => docTop(action.fig) - vh() * 0.75, pos: action.pos, r: action.followR, arc: 0 },
      { name: 'action-out', at: () => docTop(action.fig) + action.fig.offsetHeight - vh() * 0.55, pos: action.pos, r: action.followR, arc: 0.3 },
      /* Coaching experience: the ball sits in the selected zone and lobs across when it changes */
      { name: 'coaching-in', at: () => docTop(cmapSec) - vh() * 0.05, pos: coaching.zonePoint, r: coaching.zoneR, arc: 0 },
      { name: 'coaching-out', at: () => docTop(cmapSec) + cmapSec.offsetHeight - vh() * 0.95, pos: coaching.zonePoint, r: coaching.zoneR, arc: 0.3 },
      /* What's next: the ball sits on the active branch */
      { name: 'next-in', at: () => docTop(nextSec) - vh() * 0.05, pos: whatsNext.dotPoint, r: () => R() * 0.4, arc: 0 },
      { name: 'next-out', at: () => docTop(nextSec) + nextSec.offsetHeight - vh() * 0.9, pos: whatsNext.dotPoint, r: () => R() * 0.4, arc: 0.3 },
      { name: 'inquire-in', at: () => docTop(inquireIntro) - vh() * 0.3, pos: inquiry.railPoint, r: () => R() * 0.4, arc: 0 },
      { name: 'inquire-out', at: () => docTop(inquireIntro) + inquireIntro.offsetHeight - vh() * 0.4, pos: inquiry.railPoint, r: () => R() * 0.4, arc: 0.25 },
      { name: 'footer-start', at: () => Math.min(docTop(A['footer-start']) - vh() * 0.85, ScrollTrigger.maxScroll(window) - vh() * 0.35), pos: () => { const p = center(A['footer-start']); return { x: p.x, y: p.y - R() * 0.8 }; }, r: () => R() * 0.8, arc: 0.12 },
      { name: 'footer-end', at: () => ScrollTrigger.maxScroll(window), pos: () => ({ x: innerWidth + R() * 2.6, y: center(A['footer-start']).y - R() * 0.8 }), r: () => R() * 0.8, arc: 0 },
    ];
    riders.push(xpEl, cmapSec, nextSec);
    if (about.st) riders.push(aboutSec);
    riders.forEach(el => el.classList.add('has-rider'));
    rally.setAnchors(anchors);
  } else {
    html.classList.add('no-ball');
  }

  return () => { action.cleanup(); finaleCleanup(); riders.forEach(el => el.classList.remove('has-rider')); rally.setAnchors([]); };
});

/* ---------- Reduced motion: everything visible, interaction only ---------- */
function setupReduced(isDesktop) {
  setupAbout(isDesktop, true);
  setupXP(isDesktop, true);
  gsap.set('.action__video', { clipPath: 'inset(0% 0% 0% 0% round 22px)', scale: 1 });
  $('.hero').classList.add('is-ready', 'is-shown');
  $('.court').classList.add('is-drawn');
  $$('[data-letters]').forEach(w => w.removeAttribute('data-letters'));
  return () => {};
}

document.fonts?.ready.then(() => ScrollTrigger.refresh());
window.addEventListener('load', () => ScrollTrigger.refresh());

window.__rally = { rally, lenis, cursorPos, xp, coaching, whatsNext, inquiry, FEATURES, anchorsOf: () => rally.anchors.map(a => ({ name: a.name, at: Math.round(a.at()), pos: a.pos(), r: Math.round(a.r()) })) };
