import './styles.css';
import './ui/crypto.css';
import * as THREE from 'three';
import { FaceTracker } from './faceTracker.js';
import { DebugOverlay } from './debugOverlay.js';
import { SettingsPanel } from './ui.js';
import { FilterGallery } from './filterGallery.js';
import { FilterManager } from './filters/FilterManager.js';
import { registerAllFilters } from './filters/index.js';
import { ResourceCache } from './core/cache.js';
import { MouthState } from './core/mouth.js';
import { loadGlobals, saveGlobals, LAST_FILTER_KEY } from './settingsStore.js';
import { EventBus } from './core/EventBus.js';
import { SoundFx } from './core/SoundFx.js';
import { ProgressStore } from './storage/ProgressStore.js';
import { createGameLayer } from './game/index.js';
import { ThemeManager } from './ui/ThemeManager.js';
import { AppUI } from './ui/AppUI.js';

// ---------------------------------------------------------------- DOM
const stage = document.getElementById('stage');
const video = document.getElementById('video');
const sceneCanvas = document.getElementById('scene');
const overlayCanvas = document.getElementById('overlay');
const debugCanvas = document.getElementById('debug');
const statusEl = document.getElementById('status');
const fpsEl = document.getElementById('fps');

function setStatus(text, isError = false) {
  statusEl.textContent = text || '';
  statusEl.classList.toggle('hidden', !text);
  statusEl.classList.toggle('error', isError);
}

// ---------------------------------------------------------------- Three.js
// Orthographic camera in SCREEN PIXELS: world x = screen x, world y = -screen y.
const renderer = new THREE.WebGLRenderer({
  canvas: sceneCanvas, alpha: true, antialias: true, powerPreference: 'high-performance',
});
renderer.setClearColor(0x000000, 0);
const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(0, 1, 0, -1, 0.1, 3000);
camera.position.set(0, 0, 1500);
scene.add(new THREE.AmbientLight(0xffffff, 1.1));
const key = new THREE.DirectionalLight(0xffffff, 2.2);
key.position.set(-0.5, 0.8, 1);
scene.add(key);
const rim = new THREE.DirectionalLight(0xffc48a, 0.8);
rim.position.set(0.8, 0.2, 0.6);
scene.add(rim);

// ---------------------------------------------------------------- shared context
const globals = loadGlobals();
const tracker = new FaceTracker(video);
const overlayG = overlayCanvas.getContext('2d');
const debug = new DebugOverlay(debugCanvas);

let shakeAmp = 0, shakeT = 0, shakeDur = 1, shaking = false;

/** Everything a filter may need. Filters never touch the DOM directly. */
const ctx = {
  renderer, scene, camera, tracker,
  events: new EventBus(),   // shared event bus (games, filters, UI)
  games: null,              // GameManager, assigned below (read-only for filters)
  face: tracker.state,
  faceVisible: false,
  mouth: new MouthState(),
  cache: new ResourceCache(),
  globals,
  viewport: { w: window.innerWidth, h: window.innerHeight, dpr: 1 },
  uiInsets: { top: 64, bottom: 100 }, // keep important stuff clear of the gallery / gear
  g: overlayG,
  fps: 60,
  clearOverlay() { overlayG.clearRect(0, 0, ctx.viewport.w, ctx.viewport.h); },
  /** Screen shake: strength in px, duration in seconds. */
  shake(strength, duration) {
    const current = shakeT > 0 ? shakeAmp * (shakeT / shakeDur) : 0;
    if (strength >= current) { shakeAmp = strength; shakeDur = duration; shakeT = duration; }
  },
};

const manager = new FilterManager(ctx);
registerAllFilters(manager);

// ---------------------------------------------------------------- game layer (UI -> FilterManager -> GameManager -> games)
const store = new ProgressStore();
const { games, badges } = createGameLayer({ filterManager: manager, bus: ctx.events, store });
ctx.games = games;
const sound = new SoundFx();
sound.setEnabled(!!store.getPref('sound'));
const theme = new ThemeManager(store);

// ---------------------------------------------------------------- resize
function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  ctx.viewport.w = w; ctx.viewport.h = h; ctx.viewport.dpr = dpr;
  renderer.setPixelRatio(dpr);
  renderer.setSize(w, h, false);
  camera.left = 0; camera.right = w; camera.top = 0; camera.bottom = -h;
  camera.updateProjectionMatrix();
  overlayCanvas.width = Math.round(w * dpr);
  overlayCanvas.height = Math.round(h * dpr);
  overlayG.setTransform(dpr, 0, 0, dpr, 0, 0);
  debug.resize(w, h, dpr);
  tracker.setViewport(w, h);
  manager.onResize(w, h, dpr);
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 200));
resize();

// ---------------------------------------------------------------- UI
const panel = new SettingsPanel(document.getElementById('panel-root'), globals, {
  onGlobal: (k) => {
    saveGlobals(globals);
    if (k === 'debug') {
      fpsEl.style.display = globals.debug ? 'block' : 'none';
      if (!globals.debug) debug.clear();
    }
  },
  onFilter: (k, v) => manager.setSetting(k, v),
  onReset: () => manager.resetSettings(),
});
const gallery = new FilterGallery(document.getElementById('gallery'), manager);
const appUI = new AppUI({ root: document.getElementById('app-ui'), gm: games, badges, store, bus: ctx.events, sound, theme });
fpsEl.style.display = globals.debug ? 'block' : 'none';

manager.on('change', (filter) => {
  if (filter) {
    const F = filter.constructor;
    panel.setFilter(F.meta, F.settings, filter.settings);
    try { localStorage.setItem(LAST_FILTER_KEY, F.meta.id); } catch { /* ignore */ }
  }
  // smooth transition: restart the fade-in animation on both render layers
  for (const el of [sceneCanvas, overlayCanvas]) {
    el.classList.remove('fx-enter');
    void el.offsetWidth;
    el.classList.add('fx-enter');
  }
});
manager.on('error', (e) => setStatus(`Filter error: ${e.message}`, true));

let startId = 'hookah';
try { const s = localStorage.getItem(LAST_FILTER_KEY); if (s && manager.has(s)) startId = s; } catch { /* ignore */ }
manager.activate(startId);

// ---------------------------------------------------------------- webcam
async function startWebcam() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw Object.assign(new Error('getUserMedia unavailable'), { name: 'InsecureContext' });
  }
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
    audio: false,
  });
  video.srcObject = stream;
  await video.play();
}

function describeError(err) {
  switch (err && err.name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
      return 'Camera permission denied. Allow camera access in the browser and reload the page.';
    case 'NotFoundError':
    case 'OverconstrainedError':
      return 'No camera found on this device.';
    case 'NotReadableError':
      return 'The camera is in use by another application.';
    case 'InsecureContext':
      return 'The camera needs a secure context: use http://localhost or HTTPS (npm run dev:https).';
    default:
      return `Startup error: ${(err && err.message) || err}`;
  }
}

// ---------------------------------------------------------------- loop
let last = performance.now();
let fpsFrames = 0, fpsTime = 0;

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  const time = now / 1000;

  const face = tracker.state;
  ctx.faceVisible = tracker.isFaceVisible(now) && face.faceWidth > 1;
  ctx.mouth.update(face.openness, globals.mouthThreshold, ctx.faceVisible, dt);

  games.update(dt);
  manager.update(dt, time);
  manager.render();
  renderer.render(scene, camera);

  setStatus(ctx.faceVisible || !tracker.running ? '' : 'Looking for your face…');

  // screen shake (video + all layers)
  if (shakeT > 0) {
    shakeT -= dt;
    const a = shakeAmp * Math.max(shakeT, 0) / shakeDur;
    stage.style.transform = `translate(${(Math.random() * 2 - 1) * a}px, ${(Math.random() * 2 - 1) * a}px)`;
    shaking = true;
  } else if (shaking) {
    stage.style.transform = '';
    shaking = false;
  }

  fpsTime += dt; fpsFrames++;
  if (fpsTime >= 0.5) { ctx.fps = fpsFrames / fpsTime; fpsFrames = 0; fpsTime = 0; }

  if (globals.debug) {
    if (ctx.faceVisible) debug.draw(face, ctx.mouth.open, manager.active);
    else debug.clear();
    const m = renderer.info.memory;
    fpsEl.textContent =
      `FPS  ${ctx.fps.toFixed(0)}   filter: ${manager.activeId}\n` +
      `open ${face.openness.toFixed(3)} / thr ${globals.mouthThreshold.toFixed(3)}\n` +
      `blink ${face.blinkSeq}  brow ${face.brow.toFixed(2)}  eye ${face.eyeOpen01.toFixed(2)}\n` +
      `GPU geometries ${m.geometries}  textures ${m.textures}  cache ${ctx.cache.size}`;
  }
}

// ---------------------------------------------------------------- boot
(async function boot() {
  try {
    setStatus('Requesting camera access…');
    await startWebcam();
    setStatus('Loading face tracking…');
    await tracker.init();
    tracker.start();
    setStatus('Looking for your face…');
    requestAnimationFrame(frame);
  } catch (err) {
    console.error(err);
    setStatus(describeError(err), true);
  }
})();
