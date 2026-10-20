import * as THREE from "three";

/** Spam guard between two pets. */
export const PET_COOLDOWN_MS = 250;
/** Head / ear / tail reaction length. */
const PET_REACTION_SECONDS = 0.8;
/** Idle "cuddle" (butt wiggle + head sway + tail) length; every Nth pet while the cat stands still. */
const PET_CUDDLE_SECONDS = 1.5;
export const PET_CUDDLE_EVERY = 4;
/** Invisible pick sphere around the cat (cheap ray-vs-sphere test instead of raycasting the skinned mesh). */
export const PET_PROXY_LIFT = 0.16;
export const PET_PROXY_RADIUS = 0.3;

const HEART_POOL = 12;
const HEART_LIFE = 1.0;
const HEART_RISE = 0.34;
const HEART_SIZE = 0.075;

export type PetBones = {
  pelvis: THREE.Bone | null;
  spine: THREE.Bone | null;
  head: THREE.Bone | null;
  ears: THREE.Bone[];
  tail: THREE.Bone[];
};

type Applied = { bone: THREE.Bone; axis: THREE.Vector3; angle: number };

/** Pet reaction state: offsets added on top of the mixer pose each frame, undone before the next update. */
export type PetState = {
  t: number;
  cuddleT: number;
  running: boolean;
  lastAt: number;
  applied: Applied[];
};

/** "Long ago" for reaction timers: finite, so the oscillator terms below never become NaN. */
const PET_IDLE_TIME = 1e3;

export function createPetState(): PetState {
  return { t: PET_IDLE_TIME, cuddleT: PET_IDLE_TIME, running: false, lastAt: -Infinity, applied: [] };
}

export function findPetBones(model: THREE.Object3D, tail: THREE.Bone[]): PetBones {
  const bones: PetBones = { pelvis: null, spine: null, head: null, ears: [], tail };
  model.traverse((child) => {
    if (!(child instanceof THREE.Bone)) return;
    const n = child.name.toLowerCase();
    if (!bones.pelvis && /^pelvis/.test(n)) bones.pelvis = child;
    else if (!bones.spine && /^body_1_/.test(n)) bones.spine = child;
    else if (!bones.head && /^head_/.test(n)) bones.head = child;
    else if (/^ear_(left|right)_\d+$/.test(n)) bones.ears.push(child);
  });
  return bones;
}

/** Start a reaction. Returns true when the idle cuddle starts too. */
export function startPet(state: PetState, opts: { idle: boolean; cuddle: boolean; reducedMotion: boolean }) {
  state.t = 0;
  state.running = !opts.idle;
  const cuddle = opts.cuddle && opts.idle && !opts.reducedMotion && state.cuddleT >= PET_CUDDLE_SECONDS;
  if (cuddle) state.cuddleT = 0;
  return cuddle;
}

export function undoPetPose(state: PetState) {
  for (let k = state.applied.length - 1; k >= 0; k -= 1) {
    const a = state.applied[k];
    a.bone.rotateOnAxis(a.axis, -a.angle);
  }
  state.applied = [];
}

const smooth = (x: number) => {
  const c = THREE.MathUtils.clamp(x, 0, 1);
  return c * c * (3 - 2 * c);
};
const tmpQ = new THREE.Quaternion();
const WORLD_UP = new THREE.Vector3(0, 1, 0);

/**
 * Add this frame's pet offsets (call after the mixer update and the other additive offsets; matrices of the cat
 * must be current). Rotations about world axes are converted to each bone's local frame once and remembered, so
 * undoPetPose restores the exact mixer pose.
 */
export function applyPetPose(
  state: PetState,
  bones: PetBones,
  delta: number,
  ctx: { heading: number; runWeight: number; reducedMotion: boolean; tailAxis: THREE.Vector3 }
) {
  state.t = Math.min(state.t + delta, PET_IDLE_TIME);
  state.cuddleT = Math.min(state.cuddleT + delta, PET_IDLE_TIME);
  const reaction = state.t < PET_REACTION_SECONDS ? Math.sin((Math.PI * state.t) / PET_REACTION_SECONDS) : 0;
  // A started cuddle fades out at once if the cat starts moving.
  const ct = state.cuddleT;
  const cuddle =
    ct < PET_CUDDLE_SECONDS ? smooth(ct / 0.25) * smooth((PET_CUDDLE_SECONDS - ct) / 0.3) * (1 - ctx.runWeight) : 0;
  if (reaction <= 1e-4 && cuddle <= 1e-4) return;

  const h = ctx.heading;
  const forward = new THREE.Vector3(Math.sin(h), 0, Math.cos(h));
  const lateral = new THREE.Vector3(Math.cos(h), 0, -Math.sin(h));
  const plan: [THREE.Bone | null, THREE.Vector3 | null, number][] = [];
  const small = state.running || ctx.reducedMotion;
  // Head tilt (sideways), swaying left / right during the cuddle.
  // (Each oscillation only when its envelope is on.)
  const sway = cuddle > 0 ? cuddle * Math.sin(ct * 4.2) : 0;
  plan.push([bones.head, forward, reaction * (small ? 0.16 : 0.3) + sway * 0.28]);
  if (!state.running) {
    // Ears flick back a little; tail wags faster.
    const ear = reaction > 0 ? -reaction * (0.28 + 0.1 * Math.sin(state.t * 18)) : 0;
    for (const earBone of bones.ears) plan.push([earBone, lateral, ear]);
    const wag =
      (reaction > 0 ? reaction * 0.38 * Math.sin(state.t * 16) : 0) + (cuddle > 0 ? cuddle * 0.5 * Math.sin(ct * 18) : 0);
    for (const tailBone of bones.tail) plan.push([tailBone, null, wag]);
    // Cuddle: butt wiggle (pelvis yaw), the front body turned back so the head stays on the cat's heading.
    const wiggle = cuddle > 0 ? cuddle * 0.16 * Math.sin(ct * 13) : 0;
    plan.push([bones.pelvis, WORLD_UP, wiggle]);
    plan.push([bones.spine, WORLD_UP, -wiggle]);
  }
  // Local axes from the current (mixer) pose, computed before any of these rotations are applied.
  const local = plan.map(([bone, worldAxis]) =>
    bone && worldAxis ? worldAxis.clone().applyQuaternion(bone.getWorldQuaternion(tmpQ).invert()).normalize() : null
  );
  plan.forEach(([bone, , angle], i) => {
    if (!bone || !Number.isFinite(angle) || Math.abs(angle) < 1e-5) return;
    const axis = local[i] ?? ctx.tailAxis;
    bone.rotateOnAxis(axis, angle);
    state.applied.push({ bone, axis, angle });
  });
}

let heartTexture: THREE.CanvasTexture | null = null;
function getHeartTexture() {
  if (heartTexture) return heartTexture;
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const g = canvas.getContext("2d");
  if (g) {
    g.translate(size / 2, size / 2 + 3);
    g.beginPath();
    g.moveTo(0, 18);
    g.bezierCurveTo(-26, 2, -24, -22, -11, -22);
    g.bezierCurveTo(-4, -22, 0, -16, 0, -12);
    g.bezierCurveTo(0, -16, 4, -22, 11, -22);
    g.bezierCurveTo(24, -22, 26, 2, 0, 18);
    g.closePath();
    g.fillStyle = "#ff7fa9";
    g.fill();
    g.lineWidth = 3;
    g.strokeStyle = "rgba(255,255,255,0.9)";
    g.stroke();
  }
  heartTexture = new THREE.CanvasTexture(canvas);
  heartTexture.colorSpace = THREE.SRGBColorSpace;
  return heartTexture;
}

type Heart = { sprite: THREE.Sprite; age: number; sway: number; phase: number; base: THREE.Vector3 };

/** Fixed pool of heart sprites (one shared canvas texture), recycled oldest-first. */
export function createHeartPool(parent: THREE.Object3D) {
  const texture = getHeartTexture();
  const hearts: Heart[] = [];
  for (let i = 0; i < HEART_POOL; i += 1) {
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false, opacity: 0 });
    const sprite = new THREE.Sprite(material);
    sprite.visible = false;
    sprite.renderOrder = 5;
    sprite.raycast = () => {};
    parent.add(sprite);
    hearts.push({ sprite, age: HEART_LIFE, sway: 0, phase: 0, base: new THREE.Vector3() });
  }
  let active = 0;
  return {
    spawn(at: THREE.Vector3, count: number) {
      for (let k = 0; k < count; k += 1) {
        let heart = hearts.find((h) => h.age >= HEART_LIFE);
        if (!heart) heart = hearts.reduce((a, b) => (a.age > b.age ? a : b));
        else active += 1;
        // Stagger a little so they do not pop out together.
        heart.age = -k * 0.07;
        heart.sway = (Math.random() - 0.5) * 0.12;
        heart.phase = Math.random() * Math.PI * 2;
        heart.base
          .copy(at)
          .add(new THREE.Vector3((Math.random() - 0.5) * 0.12, Math.random() * 0.04, (Math.random() - 0.5) * 0.12));
        heart.sprite.visible = false;
      }
    },
    update(delta: number) {
      if (active === 0) return;
      active = 0;
      for (const heart of hearts) {
        if (heart.age >= HEART_LIFE) continue;
        heart.age += delta;
        const material = heart.sprite.material;
        if (heart.age >= HEART_LIFE) {
          heart.sprite.visible = false;
          material.opacity = 0;
          continue;
        }
        active += 1;
        if (heart.age < 0) continue;
        const u = heart.age / HEART_LIFE;
        heart.sprite.visible = true;
        heart.sprite.position.set(
          heart.base.x + Math.sin(heart.phase + u * 6) * heart.sway,
          heart.base.y + HEART_RISE * (1 - (1 - u) * (1 - u)),
          heart.base.z + Math.cos(heart.phase + u * 6) * heart.sway * 0.5
        );
        heart.sprite.scale.setScalar(HEART_SIZE * (0.7 + 0.5 * smooth(u * 3)));
        material.opacity = smooth(u / 0.12) * (1 - smooth((u - 0.55) / 0.45));
      }
    },
    dispose() {
      for (const heart of hearts) {
        parent.remove(heart.sprite);
        heart.sprite.material.dispose();
      }
      hearts.length = 0;
      active = 0;
    },
  };
}
