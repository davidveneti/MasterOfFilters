// Central place for every tunable value.

// Global (filter-independent) settings
export const DEFAULT_GLOBALS = {
  mouthThreshold: 0.035, // lip gap / face height needed to count as "open"
  debug: false,
};

// MediaPipe FaceMesh landmark indices (468-point topology)
export const LM = {
  NOSE_TIP: 1,
  FOREHEAD: 10,
  CHIN: 152,
  UPPER_LIP: 13,    // inner upper lip
  LOWER_LIP: 14,    // inner lower lip
  MOUTH_LEFT: 61,
  MOUTH_RIGHT: 291,
  CHEEK_L: 234,
  CHEEK_R: 454,
  EYE_L_OUTER: 33,
  EYE_R_OUTER: 263,
  // eyes: [outer, inner, upper lid, lower lid]
  EYE_SCREEN_RIGHT: [33, 133, 159, 145],  // subject's right eye (screen-right in the mirrored view)
  EYE_SCREEN_LEFT: [263, 362, 386, 374],
  BROW_SCREEN_RIGHT: 105,
  BROW_SCREEN_LEFT: 334,
};

// One-Euro filter presets (minCutoff in Hz, beta = speed coefficient)
export const TRACKING = {
  faceLostMs: 500,
  position: { minCutoff: 1.2, beta: 0.03 },  // px
  size: { minCutoff: 0.8, beta: 0.01 },      // px
  angle: { minCutoff: 1.2, beta: 0.6 },      // rad
  openness: { minCutoff: 5.0, beta: 0.0 },   // ratio, must stay snappy
  mouthCloseHysteresis: 0.75,                // close when below threshold * this
  ear: { minCutoff: 8.0, beta: 0.0 },        // eye aspect ratio (blink detection)
  brow: { minCutoff: 3.0, beta: 0.0 },
};

export const HOOKAH = {
  modelHeight: 135,     // procedural model height in local units
  heightFactor: 2.5,    // hookah height = faceWidth * this * scale
  sideOffset: 1.65,     // horizontal distance from face center, in face widths
  baseDrop: 1.75,       // base position below face center, in face widths
  posLambda: 9,         // follow speed (higher = snappier)
  scaleLambda: 5,
  sideSwitchHigh: 0.62, // face.x / screenW above which hookah flips to the left
  sideSwitchLow: 0.38,
};

export const HOSE = {
  segments: 48,
  radialSegments: 10,
  radiusFactor: 0.034,  // hose radius = faceWidth * this
  lengthFactor: 3.0,    // rest length in face widths (controls sag)
  stiffness: 220,       // spring constant for the flexible control points
  damping: 16,
  stripeCount: 34,      // corrugation repeats along the hose
};

export const SMOKE = {
  maxParticles: 2000,
  baseRate: 70,         // particles / second at density 1
  maxSpawnPerFrame: 24,
  textureSize: 128,
  zDepth: 300,
};
