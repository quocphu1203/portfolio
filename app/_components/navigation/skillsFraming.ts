import * as THREE from "three";

/** Boat + roof crates + the skill-visit bird circle fit in a sphere of this radius around FRAME_CENTER_Y. */
const FRAME_RADIUS = 4.5;
const FRAME_CENTER_Y = 3.5;
/** Fraction of the free area the sphere may fill (leaves breathing room around the boat). */
const FRAME_FILL = 0.88;
/** Camera direction from the boat: ocean side (outward), slightly along the coast, ~20° above. */
const DIR_OUTWARD = 13.5;
const DIR_TANGENT = 4.2;
const DIR_UP = 5.2;
/** OrbitControls clamp the camera-target distance; keep the look-at point within that range. */
const MAX_TARGET_DIST = 30;
const GAP_PX = 16;

/**
 * Screen area the skills panel covers, mirroring PortfolioInfoPanel's classes: a right-hand side panel
 * (md: min(46vw, 42rem) + 1rem, lg: min(40vw, 42rem) + 1.5rem) or a bottom sheet (min(72vh, 40rem) + 0.75rem).
 */
function skillsPanelInset(width: number, height: number) {
  const rem = 16;
  const sheet = window.matchMedia("(max-width: 767px), (pointer: coarse)").matches;
  if (sheet) return { right: 0, bottom: Math.min(0.72 * height, 40 * rem) + 0.75 * rem + GAP_PX };
  const panel = width >= 1024 ? Math.min(0.4 * width, 42 * rem) + 1.5 * rem : Math.min(0.46 * width, 42 * rem) + rem;
  return { right: panel + GAP_PX, bottom: 0 };
}

/** Same rule as FantasyIslandCanvas. */
function cameraFovFor(width: number) {
  return width < 768 ? 40 : width < 1024 ? 37 : 34;
}

/**
 * Camera pose for the Skills view: the boat (with its open crates and the birds circling above) is centred in
 * the part of the screen the skills panel leaves free (left of the side panel, or above the bottom sheet).
 */
export function computeSkillsFraming(boat: [number, number, number]) {
  const [bx, by, bz] = boat;
  const width = Math.max(1, window.innerWidth);
  const height = Math.max(1, window.innerHeight);
  const inset = skillsPanelInset(width, height);
  const tanV = Math.tan(THREE.MathUtils.degToRad(cameraFovFor(width)) / 2);
  const tanH = tanV * (width / height);
  // Free area in NDC: x in [-1, 1 - 2p], y in [-1 + 2q, 1]; its centre is (-p, q).
  const p = THREE.MathUtils.clamp(inset.right / width, 0, 0.7);
  const q = THREE.MathUtils.clamp(inset.bottom / height, 0, 0.8);
  const halfTan = Math.min((1 - p) * tanH, (1 - q) * tanV) * FRAME_FILL;
  const dist = FRAME_RADIUS / Math.sin(Math.atan(halfTan));

  const outward = new THREE.Vector2(bx, bz);
  if (outward.lengthSq() < 1e-4) outward.set(1, 0);
  outward.normalize();
  const tangent = new THREE.Vector2(outward.y, -outward.x);
  const toCam = new THREE.Vector3(
    outward.x * DIR_OUTWARD + tangent.x * DIR_TANGENT,
    DIR_UP,
    outward.y * DIR_OUTWARD + tangent.y * DIR_TANGENT
  ).normalize();
  const center = new THREE.Vector3(bx, by + FRAME_CENTER_Y, bz);
  const cameraPos = center.clone().addScaledVector(toCam, dist);

  // Turn the view so the boat lands at the free area's centre instead of the screen centre.
  const forward = toCam.clone().negate();
  const right = new THREE.Vector3().crossVectors(forward, THREE.Object3D.DEFAULT_UP).normalize();
  const up = new THREE.Vector3().crossVectors(right, forward).normalize();
  const look = forward.addScaledVector(right, p * tanH).addScaledVector(up, -q * tanV).normalize();
  const target = cameraPos.clone().addScaledVector(look, Math.min(dist, MAX_TARGET_DIST));
  return { cameraPos, target };
}
