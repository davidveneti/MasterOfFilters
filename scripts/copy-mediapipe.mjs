// Copies the MediaPipe FaceMesh runtime (JS + WASM + model) from node_modules
// into public/ so the app is 100% self-hosted: no CDN, no cloud, no API keys.
import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'node_modules', '@mediapipe', 'face_mesh');
const dst = join(root, 'public', 'mediapipe', 'face_mesh');

if (!existsSync(src)) {
  console.warn('[copy-mediapipe] @mediapipe/face_mesh not found, run `npm install` first.');
  process.exit(0);
}
mkdirSync(dst, { recursive: true });
cpSync(src, dst, {
  recursive: true,
  filter: (p) => !/(\.d\.ts|package\.json|README\.md|LICENSE)$/i.test(p),
});
console.log('[copy-mediapipe] FaceMesh assets copied to public/mediapipe/face_mesh');
