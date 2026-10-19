"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Html } from "@react-three/drei";
import { useGLTF } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useLocale, useTranslations } from "next-intl";
import { RigidBody, type RapierRigidBody, useRapier } from "@react-three/rapier";
import * as THREE from "three";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";

import { getExperienceMilestones } from "../../../mock/experienceData";
import type { AppLocale } from "../../../mock/locale";
import { exploreRuntime } from "../navigation/exploreRuntime";
import { usePortfolioNav } from "../navigation/PortfolioNavContext";
import { useReducedMotion } from "../performance/useReducedMotion";
import { resolveWaterLevel } from "./waterLevel";
import { MilestonePennant } from "./MilestonePennant";

const CAT_SCALE = 1 / 80;
const CAT_WALL_CLEARANCE = 0;
const CAT_COLLISION_RADIUS = 0.05;
const DOC_SURFACE_OFFSET_Y = 0.005;
const FLAG_OUTER_OFFSET = 0.55;
const FLAG_SURFACE_OFFSET_Y = 0.05;
const FIRST_FLAG_PROGRESS = 0.14;
const LAST_FLAG_PROGRESS = 0.92;
const FINAL_APPROACH_WINDOW = 0.12;
const CAT_STOP_SIDE_OFFSET = 0.55;
const CAT_POSE_UPDATE_INTERVAL_MS = 50;
const CAT_MOVE_SMOOTHNESS = 14;
const CAT_ROTATE_SMOOTHNESS = 9;
// Extra body dip / head lift layered on the run clip (scaled by run weight, so idle is unaffected).
// Body dip is 0: it rotates pelvis_01, which carries the front legs but not the back legs, so any dip
// pushed the front paws into the ground.
const CAT_BODY_DIP_X = 0;
const CAT_HEAD_LIFT_X = 0.18;
// Journey speed profile (world units / seconds): smooth accelerate -> cruise -> decelerate to a stop.
const CAT_CRUISE_SPEED = 1.3;
const CAT_ACCEL_SECONDS = 0.7;
const CAT_DECEL_SECONDS = 1.0;
const CAT_START_DELAY_SECONDS = 0.35;
// Ground speed of the bounding run clip at timeScale 1 (stance paws ~3.5 model units/frame @24fps, at CAT_SCALE).
const CAT_CLIP_GROUND_SPEED = 1.05;
// Speed below which the run clip blends into Idle_Stand (~0.5s blend during the decel ramp).
const CAT_WALK_BLEND_SPEED = 0.6;
const CAT_LOOKAHEAD = 0.18;
// Paw grounding: keep the lowest front/back paw vertices on the terrain (world units / radians).
const CAT_PAW_GROUND_EPS = 0.003;
const CAT_GROUND_MAX_OFFSET = 0.1;
const CAT_GROUND_MAX_PITCH = 0.2;
// Resting offset while running: cancels the clip's floor height (lowest paw ~0.75 model units) + DOC_SURFACE_OFFSET_Y.
const CAT_RUN_GROUND_BASE = -(DOC_SURFACE_OFFSET_Y + 0.75 * CAT_SCALE - CAT_PAW_GROUND_EPS);
const CAT_TURN_LEAN = 0.05;
const CAT_MAX_LEAN = 0.09;
// Explore mode (player-driven cat).
const CAT_EXPLORE_SPEED = 1.25;
const CAT_EXPLORE_ACCEL = 3.2;
const CAT_EXPLORE_DECEL = 4.0;
const CAT_EXPLORE_ARRIVE_RADIUS = 0.06;
const CAT_EXPLORE_SLOW_RADIUS = 0.7;
const CAT_EXPLORE_MAX_STEP_UP = 0.32;
const CAT_EXPLORE_MAX_STEP_DOWN = 0.45;
const CAT_EXPLORE_MIN_NORMAL_Y = 0.5;
const CAT_EXPLORE_WATER_MARGIN = 0.12;
const MILESTONE_PROMPT_RADIUS = 0.85;
// Intro (About): the cat runs into the camera view, sits facing the camera and wags its tail.
const INTRO_SCREEN_SAMPLES: [number, number][] = [
  [-0.1, -0.25],
  [0.1, -0.3],
  [-0.3, -0.2],
  [0.3, -0.2],
  [0, -0.05],
  [-0.2, -0.45],
  [0.2, -0.45],
  [-0.45, 0],
  [0.45, 0],
  [0, 0.15],
];
const INTRO_CAM_DIST = 3.0;
const INTRO_LOOK_HEIGHT = 0.18;
const INTRO_RUN_DISTANCES = [2.0, 1.4, 0.9];
const INTRO_RUN_TIMEOUT = 5;
const INTRO_SIT_SECONDS = 0.9;
const INTRO_INIT_TIMEOUT = 1.5;
// Bone-local Y swings the tail sideways for this rig (measured: mostly lateral displacement).
const TAIL_WAG_AXIS = new THREE.Vector3(0, 1, 0);
const TAIL_WAG_AMPLITUDE = 0.2;
const TAIL_WAG_SPEED = 7.5;
const WORLD_UP = new THREE.Vector3(0, 1, 0);
const WORLD_DOWN = new THREE.Vector3(0, -1, 0);
const PENNANT_OFFSET: [number, number, number] = [0.16, 0, 0.1];
const TORCH_SCALE = 0.35;
const TORCH_FLAME_OFFSET: [number, number, number] = [0, 0.23, 0];
const FIXED_TORCH_OFFSETS: [number, number, number][] = [
  [-0.2, 0, -0.12],
  [-0.18, 0, -0.1],
  [-0.16, 0, -0.08],
  [-0.15, 0, -0.08],
  [-0.14, 0, -0.06],
];
const FALLBACK_PATH: [number, number, number][] = [
  [3.2, 2.1, 2.2],
  [2.4, 2.9, 1.3],
  [1.6, 3.8, 0.55],
  [0.9, 4.7, -0.05],
  [0.25, 5.6, -0.45],
];

function lerpPath(points: THREE.Vector3[], progress: number) {
  const clamped = Math.min(1, Math.max(0, progress));
  const scaled = clamped * (points.length - 1);
  const i = Math.min(points.length - 2, Math.floor(scaled));
  const t = scaled - i;
  const a = points[i];
  const b = points[i + 1];
  return new THREE.Vector3().lerpVectors(a, b, t);
}

function extractCenterlineByTriangleWalk(mesh: THREE.Mesh) {
  const geometry = mesh.geometry as THREE.BufferGeometry | undefined;
  const posAttr = geometry?.getAttribute("position");
  if (!posAttr) return [] as THREE.Vector3[];

  const verts: THREE.Vector3[] = [];
  const wp = new THREE.Vector3();
  for (let i = 0; i < posAttr.count; i += 1) {
    wp.fromBufferAttribute(posAttr, i);
    mesh.localToWorld(wp);
    verts.push(wp.clone());
  }

  const indexAttr = geometry?.getIndex();
  const triCount = indexAttr ? indexAttr.count / 3 : posAttr.count / 3;
  if (triCount < 1) return [] as THREE.Vector3[];

  const triVerts = (ti: number): [number, number, number] => {
    if (indexAttr) {
      return [indexAttr.getX(ti * 3), indexAttr.getX(ti * 3 + 1), indexAttr.getX(ti * 3 + 2)];
    }
    return [ti * 3, ti * 3 + 1, ti * 3 + 2];
  };

  const centroids: THREE.Vector3[] = [];
  for (let ti = 0; ti < triCount; ti += 1) {
    const [a, b, c] = triVerts(ti);
    centroids.push(
      new THREE.Vector3(
        (verts[a].x + verts[b].x + verts[c].x) / 3,
        (verts[a].y + verts[b].y + verts[c].y) / 3,
        (verts[a].z + verts[b].z + verts[c].z) / 3
      )
    );
  }

  const edgeKey = (a: number, b: number) => (a < b ? `${a}_${b}` : `${b}_${a}`);
  const edgeToTris = new Map<string, number[]>();
  for (let ti = 0; ti < triCount; ti += 1) {
    const [a, b, c] = triVerts(ti);
    for (const ek of [edgeKey(a, b), edgeKey(b, c), edgeKey(c, a)]) {
      if (!edgeToTris.has(ek)) edgeToTris.set(ek, []);
      edgeToTris.get(ek)!.push(ti);
    }
  }

  const triAdj: Set<number>[] = Array.from({ length: triCount }, () => new Set());
  for (const tris of edgeToTris.values()) {
    if (tris.length === 2) {
      triAdj[tris[0]].add(tris[1]);
      triAdj[tris[1]].add(tris[0]);
    }
  }

  let startTri = 0;
  for (let ti = 1; ti < triCount; ti += 1) {
    if (centroids[ti].y < centroids[startTri].y) startTri = ti;
  }

  const visited = new Set<number>();
  const path: number[] = [startTri];
  visited.add(startTri);

  let current = startTri;
  let prevDir = new THREE.Vector3(0, 1, 0);

  for (let step = 0; step < triCount; step += 1) {
    const neighbors = triAdj[current];
    let bestTri = -1;
    let bestScore = -Infinity;

    for (const n of neighbors) {
      if (visited.has(n)) continue;
      const dir = centroids[n].clone().sub(centroids[current]);
      const dist = dir.length();
      if (dist < 0.0001) continue;
      dir.normalize();
      const continuity = dir.dot(prevDir);
      const upward = dir.y;
      const score = continuity * 0.55 + upward * 0.45;
      if (score > bestScore) {
        bestScore = score;
        bestTri = n;
      }
    }

    if (bestTri < 0) break;
    prevDir = centroids[bestTri].clone().sub(centroids[current]).normalize();
    visited.add(bestTri);
    path.push(bestTri);
    current = bestTri;
  }

  if (path.length < 2) return [] as THREE.Vector3[];

  const raw = path.map((ti) => centroids[ti]);

  const decimated: THREE.Vector3[] = [raw[0]];
  const minSeg = 0.2;
  for (let i = 1; i < raw.length; i += 1) {
    if (raw[i].distanceTo(decimated[decimated.length - 1]) >= minSeg) {
      decimated.push(raw[i]);
    }
  }
  if (decimated.length > 1 && decimated[decimated.length - 1].distanceTo(raw[raw.length - 1]) > 0.05) {
    decimated.push(raw[raw.length - 1]);
  }

  for (let pass = 0; pass < 3; pass += 1) {
    for (let i = 1; i < decimated.length - 1; i += 1) {
      const prev = decimated[i - 1];
      const cur = decimated[i];
      const next = decimated[i + 1];
      cur.x = prev.x * 0.25 + cur.x * 0.5 + next.x * 0.25;
      cur.y = prev.y * 0.25 + cur.y * 0.5 + next.y * 0.25;
      cur.z = prev.z * 0.25 + cur.z * 0.5 + next.z * 0.25;
    }
  }
  return decimated;
}

function pointsFromPathObject(pathObj: THREE.Object3D) {
  const candidates: THREE.Vector3[][] = [];
  pathObj.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) return;
    const centerline = extractCenterlineByTriangleWalk(mesh);
    if (centerline.length >= 2) candidates.push(centerline);
  });
  if (candidates.length === 0) {
    const mesh = pathObj as THREE.Mesh;
    if (mesh.isMesh) {
      const centerline = extractCenterlineByTriangleWalk(mesh);
      if (centerline.length >= 2) candidates.push(centerline);
    }
  }
  if (candidates.length === 0) return [] as THREE.Vector3[];
  candidates.sort((a, b) => b.length - a.length);
  return candidates[0];
}

function smoothPath(points: THREE.Vector3[]) {
  if (points.length < 4) return points;
  const curve = new THREE.CatmullRomCurve3(points, false, "centripetal");
  const sampledCount = Math.max(90, points.length * 6);
  return curve.getPoints(sampledCount);
}

function tangentAt(points: THREE.Vector3[], progress: number) {
  if (points.length < 2) return new THREE.Vector3(0, 0, 1);
  const p1 = lerpPath(points, Math.max(0, progress - 0.01));
  const p2 = lerpPath(points, Math.min(1, progress + 0.01));
  return p2.sub(p1).normalize();
}

function offsetOutward(point: THREE.Vector3, tangent: THREE.Vector3, amount: number) {
  const radial = new THREE.Vector3(point.x, 0, point.z).normalize();
  const side = new THREE.Vector3(tangent.z, 0, -tangent.x).normalize();
  const outward = radial.lengthSq() > 0.0001 ? radial : side;
  return point.clone().add(outward.multiplyScalar(amount));
}

function flagProgressMarks(count: number) {
  if (count <= 1) return [FIRST_FLAG_PROGRESS];
  const start = FIRST_FLAG_PROGRESS;
  const end = LAST_FLAG_PROGRESS;
  return Array.from({ length: count }, (_, i) => {
    const t = i / (count - 1);
    return THREE.MathUtils.lerp(start, end, t);
  });
}

function smoothstep01(x: number) {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
}

function wrapAngle(a: number) {
  return Math.atan2(Math.sin(a), Math.cos(a));
}

type JourneyPath = { points: THREE.Vector3[]; cum: number[]; length: number; stop: THREE.Vector3 | null };

function samplePolyline(path: JourneyPath, distance: number) {
  const { points, cum } = path;
  if (points.length === 0) return new THREE.Vector3();
  if (distance <= 0) return points[0].clone();
  if (distance >= path.length) return points[points.length - 1].clone();
  let lo = 0;
  let hi = cum.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (cum[mid] <= distance) lo = mid;
    else hi = mid;
  }
  const seg = cum[hi] - cum[lo];
  const t = seg > 1e-6 ? (distance - cum[lo]) / seg : 0;
  return new THREE.Vector3().lerpVectors(points[lo], points[hi], t);
}

// Trapezoid speed profile with smoothstep ramps; returns distance travelled and current speed at time t.
function journeyProfile(length: number, t: number) {
  if (length <= 1e-4) return { distance: length, speed: 0, done: true };
  const ta = CAT_ACCEL_SECONDS;
  const td = CAT_DECEL_SECONDS;
  let v = CAT_CRUISE_SPEED;
  if ((v * (ta + td)) / 2 > length) v = (2 * length) / (ta + td);
  const da = (v * ta) / 2;
  const dd = (v * td) / 2;
  const tc = Math.max(0, (length - da - dd) / v);
  const total = ta + tc + td;
  const ramp = (x: number) => x * x * x - (x * x * x * x) / 2; // integral of smoothstep
  if (t <= 0) return { distance: 0, speed: 0, done: false };
  if (t < ta) return { distance: v * ta * ramp(t / ta), speed: v * smoothstep01(t / ta), done: false };
  if (t < ta + tc) return { distance: da + v * (t - ta), speed: v, done: false };
  if (t < total) {
    const y = (total - t) / td;
    return { distance: length - v * td * ramp(y), speed: v * smoothstep01(y), done: false };
  }
  return { distance: length, speed: 0, done: true };
}

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

function catStopNearFlag(flagPos: THREE.Vector3, tangent: THREE.Vector3) {
  const side = new THREE.Vector3(-tangent.z, 0, tangent.x);
  if (side.lengthSq() < 0.0001) return flagPos.clone();
  side.normalize();
  return flagPos.clone().addScaledVector(side, CAT_STOP_SIDE_OFFSET);
}

function snapPointToDocSurface(pos: THREE.Vector3, meshes: THREE.Mesh[], offsetY: number) {
  if (meshes.length === 0) return null;
  const ray = new THREE.Raycaster();
  const down = new THREE.Vector3(0, -1, 0);
  const up = new THREE.Vector3(0, 1, 0);

  ray.set(new THREE.Vector3(pos.x, pos.y + 5, pos.z), down);
  ray.far = 12;
  const hitsDown = ray.intersectObjects(meshes, true);
  if (hitsDown.length > 0) {
    const snapped = hitsDown[0].point.clone();
    snapped.y += offsetY;
    return snapped;
  }

  ray.set(new THREE.Vector3(pos.x, pos.y - 2, pos.z), up);
  ray.far = 10;
  const hitsUp = ray.intersectObjects(meshes, true);
  if (hitsUp.length > 0) {
    const snapped = hitsUp[0].point.clone();
    snapped.y += offsetY;
    return snapped;
  }

  return null;
}

// Orientation for the kinematic cat body: up = (smoothed) surface normal, facing along heading.
function catBodyQuaternion(up: THREE.Vector3, heading: number) {
  const headingForward = new THREE.Vector3(Math.sin(heading + Math.PI), 0, Math.cos(heading + Math.PI));
  const forwardProjected = headingForward.sub(up.clone().multiplyScalar(headingForward.dot(up)));
  if (forwardProjected.lengthSq() < 1e-6) forwardProjected.set(0, 0, 1).sub(up.clone().multiplyScalar(up.z));
  forwardProjected.normalize();
  const right = new THREE.Vector3().crossVectors(up, forwardProjected).normalize();
  const forward = new THREE.Vector3().crossVectors(right, up).normalize();
  return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(right, up, forward));
}

function resolveDocRoot(scene: THREE.Object3D) {
  const direct = scene.getObjectByName("doc");
  if (direct) return direct;
  let fuzzy: THREE.Object3D | null = null;
  scene.traverse((child) => {
    if (fuzzy) return;
    if (child.name.toLowerCase().includes("doc")) fuzzy = child;
  });
  return fuzzy;
}

export function ExperienceMilestoneTrail() {
  const locale = useLocale() as AppLocale;
  const tExplore = useTranslations("explore");
  const experienceMilestones = getExperienceMilestones(locale);
  const {
    activeSection,
    setActiveSection,
    experienceJourneyKey,
    experienceUnlockedCount,
    setExperienceUnlockedCount,
    setExperienceCatPose,
    exploreMode,
    introPhase,
    introFrame,
    introReady,
  } = usePortfolioNav();
  const introActive = introPhase !== "idle" && !exploreMode && activeSection !== "credits";
  const catActive = activeSection === "credits" || exploreMode || introActive;
  const reducedMotion = useReducedMotion();
  const { scene: worldScene, gl, camera } = useThree();
  const { world, rapier } = useRapier();
  const { scene: catScene, animations } = useGLTF("/cat_rigged.glb?v=4") as {
    scene: THREE.Object3D;
    animations: THREE.AnimationClip[];
  };
  const catModel = useMemo(() => clone(catScene), [catScene]);
  const { scene: torchScene } = useGLTF("/torch.glb") as { scene: THREE.Object3D };
  const torchModels = useMemo(() => {
    return experienceMilestones.map(() => {
      const c = torchScene.clone(true);
      c.traverse((child) => {
        const mesh = child as THREE.Mesh;
        if (!mesh.isMesh) return;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      });
      return c;
    });
  }, [torchScene, experienceMilestones]);
  const catBodyRef = useRef<RapierRigidBody | null>(null);
  const catPosRef = useRef(new THREE.Vector3());
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const walkActionRef = useRef<THREE.AnimationAction | null>(null);
  const idleActionRef = useRef<THREE.AnimationAction | null>(null);
  const catBodyBoneRefs = useRef<THREE.Bone[]>([]);
  const catHeadBoneRefs = useRef<THREE.Bone[]>([]);
  const catTailBoneRefs = useRef<THREE.Bone[]>([]);
  // Last pose offsets added on top of the mixer output, so they can be undone before the next update.
  const catPoseOffsetRef = useRef({ body: 0, head: 0, tail: 0 });
  const catSpeedRef = useRef(0);
  // Paw vertex indices (front / back) of the skinned cat, and the grounding correction applied to the model.
  const catPawRef = useRef<{ mesh: THREE.SkinnedMesh | null; front: number[]; back: number[] }>({ mesh: null, front: [], back: [] });
  const catGroundRef = useRef({ y: 0, pitch: 0 });
  const catGroundGroupRef = useRef<THREE.Group | null>(null);
  const elapsedRef = useRef(0);
  const runningRef = useRef(false);
  const unlockedRef = useRef(0);
  const prevPosRef = useRef(new THREE.Vector3());
  const headingRef = useRef(0);
  const surfaceNormalRef = useRef(new THREE.Vector3(0, 1, 0));
  const lastPoseUpdateAtRef = useRef(0);
  const raycasterRef = useRef(new THREE.Raycaster());
  const docRayRef = useRef(new THREE.Raycaster());
  // Explore mode state (mutated per frame; React state only for the milestone prompt).
  const exploreRef = useRef({
    needsInit: false,
    keys: { f: 0, b: 0, l: 0, r: 0 },
    moveTarget: null as THREE.Vector3 | null,
    speed: 0,
    near: -1,
    markerAge: 0,
  });
  const markerRef = useRef<THREE.Mesh | null>(null);
  // Intro (About) sequence state; `saved` restores the cat's previous spot/heading afterwards.
  const introRef = useRef({
    stage: "off" as "off" | "init" | "run" | "sit",
    t: 0,
    ready: false,
    placed: false,
    wag: 0,
    wagTime: 0,
    saved: null as { pos: THREE.Vector3; heading: number } | null,
  });
  // World-space ocean height (the water lives inside the scaled island group); refreshed on explore init.
  const waterLevelRef = useRef(0);
  const [nearMilestone, setNearMilestone] = useState(-1);
  const pathPoints = useMemo(() => {
    const refreshKey = `${activeSection ?? "none"}-${experienceJourneyKey}-${exploreMode ? "explore" : "guided"}-${introPhase}`;
    const pathNode = resolveDocRoot(worldScene);
    if (!pathNode) return smoothPath(FALLBACK_PATH.map((p) => new THREE.Vector3(p[0], p[1], p[2])));
    pathNode.updateWorldMatrix(true, true);
    const built = pointsFromPathObject(pathNode);
    if (built.length >= 2) return smoothPath(built);
    void refreshKey;
    return smoothPath(FALLBACK_PATH.map((p) => new THREE.Vector3(p[0], p[1], p[2])));
  }, [worldScene, activeSection, experienceJourneyKey, exploreMode, introPhase]);
  const docMeshes = useMemo(() => {
    // Re-resolve when the section/journey (re)starts: the island GLB may not be in the scene yet on first mount,
    // which left this empty and disabled floor snapping + slope alignment for the cat.
    void activeSection;
    void experienceJourneyKey;
    void exploreMode;
    void introPhase;
    const docRoot = resolveDocRoot(worldScene);
    if (!docRoot) return [] as THREE.Mesh[];
    docRoot.updateWorldMatrix(true, true);
    const meshes: THREE.Mesh[] = [];
    docRoot.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (mesh.isMesh) meshes.push(mesh);
    });
    return meshes;
  }, [worldScene, activeSection, experienceJourneyKey, exploreMode, introPhase]);
  const wallMeshes = useMemo(() => {
    // Re-resolve when the cat (re)appears: the island may not have been tagged yet on first mount.
    void activeSection;
    void experienceJourneyKey;
    void exploreMode;
    void introPhase;
    const meshesFromTag: THREE.Mesh[] = [];
    worldScene.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (mesh.isMesh && mesh.userData.isIslandCollider) meshesFromTag.push(mesh);
    });
    if (meshesFromTag.length > 0) return meshesFromTag;

    const wallRoots = ["Object_231", "Object_534", "Object_135", "Object_546", "doc"]
      .map((name) => worldScene.getObjectByName(name))
      .filter(Boolean);
    if (wallRoots.length === 0) return [] as THREE.Mesh[];
    const meshes: THREE.Mesh[] = [];
    for (const wallRoot of wallRoots) {
      wallRoot?.traverse((child) => {
        const mesh = child as THREE.Mesh;
        if (mesh.isMesh) meshes.push(mesh);
      });
    }
    return meshes;
  }, [worldScene, activeSection, experienceJourneyKey, exploreMode, introPhase]);
  // Walkable surfaces for explore mode: terrain, path and rocks (visible originals only).
  const groundMeshes = useMemo(() => {
    const visible = wallMeshes.filter((mesh) => mesh.visible);
    return visible.length > 0 ? visible : docMeshes;
  }, [wallMeshes, docMeshes]);

  const progressMarks = useMemo(
    () => flagProgressMarks(experienceMilestones.length),
    [experienceMilestones]
  );
  const flagPositions = useMemo(() => {
    if (pathPoints.length < 2) return [] as THREE.Vector3[];
    const ray = new THREE.Raycaster();
    const down = new THREE.Vector3(0, -1, 0);
    const up = new THREE.Vector3(0, 1, 0);

    const snapToDoc = (pos: THREE.Vector3): boolean => {
      if (docMeshes.length === 0) return false;
      ray.set(new THREE.Vector3(pos.x, pos.y + 5, pos.z), down);
      ray.far = 12;
      const hitsDown = ray.intersectObjects(docMeshes, true);
      if (hitsDown.length > 0) {
        pos.copy(hitsDown[0].point);
        pos.y += FLAG_SURFACE_OFFSET_Y;
        return true;
      }
      ray.set(new THREE.Vector3(pos.x, pos.y - 2, pos.z), up);
      ray.far = 10;
      const hitsUp = ray.intersectObjects(docMeshes, true);
      if (hitsUp.length > 0) {
        pos.copy(hitsUp[0].point);
        pos.y += FLAG_SURFACE_OFFSET_Y;
        return true;
      }
      return false;
    };

    return progressMarks.map((t) => {
      const base = lerpPath(pathPoints, t);
      const tang = tangentAt(pathPoints, t);
      const perpendicular = new THREE.Vector3(-tang.z, 0, tang.x).normalize();
      const radial = new THREE.Vector3(base.x, 0, base.z);
      if (radial.lengthSq() > 0.0001) radial.normalize();
      const outSign = perpendicular.dot(radial) >= 0 ? 1 : -1;

      const offset = base.clone().addScaledVector(perpendicular, FLAG_OUTER_OFFSET * outSign);
      if (snapToDoc(offset)) return offset;

      const offset2 = base.clone().addScaledVector(perpendicular, -FLAG_OUTER_OFFSET * outSign);
      if (snapToDoc(offset2)) return offset2;

      const noOffset = base.clone();
      if (snapToDoc(noOffset)) return noOffset;

      base.y += FLAG_SURFACE_OFFSET_Y;
      return base;
    });
  }, [pathPoints, progressMarks, docMeshes]);
  const milestoneStops = useMemo(
    () =>
      progressMarks
        .map((progress, idx) => ({
          idx,
          progress,
          position: flagPositions[idx],
        }))
        .filter((item) => Boolean(item.position)),
    [progressMarks, flagPositions]
  );
  const targetJourneyProgress = useMemo(
    () => milestoneStops[milestoneStops.length - 1]?.progress ?? 1,
    [milestoneStops]
  );
  // Arc-length parameterised route (same geometry as before: path, then eased approach to the last flag stop).
  const journeyPath = useMemo<JourneyPath>(() => {
    if (pathPoints.length < 2) return { points: [], cum: [0], length: 0, stop: null };
    const lastStop = milestoneStops[milestoneStops.length - 1];
    const lastFlag = lastStop?.position;
    const lastStopTangent = tangentAt(pathPoints, targetJourneyProgress);
    const stopRaw = lastFlag ? catStopNearFlag(lastFlag, lastStopTangent) : null;
    const stop =
      stopRaw && lastFlag ? (snapPointToDocSurface(stopRaw, docMeshes, DOC_SURFACE_OFFSET_Y) ?? lastFlag.clone()) : null;
    const approachStart = Math.max(0, targetJourneyProgress - FINAL_APPROACH_WINDOW);
    const points: THREE.Vector3[] = [];
    const samples = 240;
    for (let i = 0; i <= samples; i += 1) {
      const progress = (i / samples) * targetJourneyProgress;
      const base = lerpPath(pathPoints, progress);
      const mix =
        targetJourneyProgress > approachStart
          ? THREE.MathUtils.clamp((progress - approachStart) / (targetJourneyProgress - approachStart), 0, 1)
          : 1;
      const p = stop && progress >= approachStart ? new THREE.Vector3().lerpVectors(base, stop, easeOutCubic(mix)) : base;
      points.push(offsetOutward(p, tangentAt(pathPoints, progress), CAT_WALL_CLEARANCE));
    }
    const cum = [0];
    for (let i = 1; i < points.length; i += 1) cum.push(cum[i - 1] + points[i].distanceTo(points[i - 1]));
    return { points, cum, length: cum[cum.length - 1], stop };
  }, [pathPoints, targetJourneyProgress, milestoneStops, docMeshes]);
  useEffect(() => {
    const bodyBones: THREE.Bone[] = [];
    const headBones: THREE.Bone[] = [];
    const tailBones: THREE.Bone[] = [];
    catModel.traverse((child) => {
      if (!(child instanceof THREE.Bone)) return;
      const n = child.name.toLowerCase();
      if (/^tail_\d_\d+$/.test(n)) {
        tailBones.push(child);
        return;
      }
      if (/head|neck/.test(n)) {
        headBones.push(child);
        return;
      }
      if (/hips|pelvis|spine|chest/.test(n)) {
        bodyBones.push(child);
      }
    });
    catBodyBoneRefs.current = bodyBones.slice(0, 3);
    {
      let skinned: THREE.SkinnedMesh | null = null;
      catModel.traverse((child) => {
        if (!skinned && (child as THREE.SkinnedMesh).isSkinnedMesh) skinned = child as THREE.SkinnedMesh;
      });
      const front: number[] = [];
      const back: number[] = [];
      const mesh = skinned as THREE.SkinnedMesh | null;
      if (mesh) {
        const skinIndex = mesh.geometry.getAttribute("skinIndex");
        const skinWeight = mesh.geometry.getAttribute("skinWeight");
        for (let i = 0; i < skinIndex.count; i += 1) {
          let best = 0;
          let bestW = -1;
          for (let k = 0; k < 4; k += 1) {
            const w = skinWeight.getComponent(i, k);
            if (w > bestW) {
              bestW = w;
              best = skinIndex.getComponent(i, k);
            }
          }
          const name = mesh.skeleton.bones[best]?.name ?? "";
          if (!/_(3|4)_/.test(name)) continue;
          if (name.includes("leg_front")) front.push(i);
          else if (name.includes("leg_back")) back.push(i);
        }
      }
      catPawRef.current = { mesh, front, back };
    }
    catHeadBoneRefs.current = headBones.slice(0, 2);
    catTailBoneRefs.current = tailBones;

    const isIdleClip = (clip: THREE.AnimationClip) => /idle|stand|breathe|rest/i.test(clip.name);
    const activeWalk =
      animations.find((clip) => /walk|run|tro(t|d)|move/i.test(clip.name)) ??
      animations.find((clip) => !isIdleClip(clip) && !/empty/i.test(clip.name)) ??
      animations[0];
    const activeIdle = animations.find(isIdleClip);
    if (!activeWalk) return;
    const mixer = new THREE.AnimationMixer(catModel);
    mixerRef.current = mixer;
    const walkAction = mixer.clipAction(activeWalk);
    walkActionRef.current = walkAction;
    walkAction.reset();
    walkAction.setLoop(THREE.LoopRepeat, Infinity);
    walkAction.setEffectiveTimeScale(1.8);
    walkAction.play();
    if (activeIdle) {
      const idleAction = mixer.clipAction(activeIdle);
      idleActionRef.current = idleAction;
      idleAction.setLoop(THREE.LoopRepeat, Infinity);
      idleAction.enabled = true;
      idleAction.setEffectiveTimeScale(1);
    }
    return () => {
      catBodyBoneRefs.current = [];
      catHeadBoneRefs.current = [];
      catTailBoneRefs.current = [];
      catPoseOffsetRef.current = { body: 0, head: 0, tail: 0 };
      walkAction.stop();
      idleActionRef.current?.stop();
      mixer.stopAllAction();
      mixerRef.current = null;
      walkActionRef.current = null;
      idleActionRef.current = null;
    };
  }, [animations, catModel]);

  useEffect(() => {
    if (activeSection !== "credits" || exploreMode || pathPoints.length < 2) return;
    elapsedRef.current = 0;
    runningRef.current = true;
    unlockedRef.current = 0;
    setExperienceUnlockedCount(0);
    catSpeedRef.current = 0;
    catGroundRef.current = { y: 0, pitch: 0 };
    if (catGroundGroupRef.current) {
      catGroundGroupRef.current.position.y = 0;
      catGroundGroupRef.current.rotation.x = 0;
    }
    const body = catBodyRef.current;
    if (body) {
      const start = pathPoints[0];
      const spawnPos = journeyPath.points[0]?.clone() ?? offsetOutward(start, tangentAt(pathPoints, 0), CAT_WALL_CLEARANCE);
      body.setTranslation({ x: spawnPos.x, y: spawnPos.y, z: spawnPos.z }, true);
      body.setNextKinematicTranslation({ x: spawnPos.x, y: spawnPos.y, z: spawnPos.z });
      catPosRef.current.copy(spawnPos);
      prevPosRef.current.copy(start);
      // Face along the route from the start instead of spinning from heading 0.
      const ahead = samplePolyline(journeyPath, CAT_LOOKAHEAD).sub(spawnPos);
      headingRef.current = Math.hypot(ahead.x, ahead.z) > 1e-4 ? Math.atan2(ahead.x, ahead.z) : 0;
      setExperienceCatPose({
        position: [spawnPos.x, spawnPos.y, spawnPos.z],
        heading: headingRef.current,
      });
      lastPoseUpdateAtRef.current = performance.now();
    }
    // Both clips play; their weights and walk speed are driven every frame from the cat's ground speed.
    if (idleActionRef.current) {
      idleActionRef.current.reset();
      idleActionRef.current.setEffectiveTimeScale(1);
      idleActionRef.current.setEffectiveWeight(1);
      idleActionRef.current.play();
    }
    if (walkActionRef.current) {
      walkActionRef.current.reset();
      walkActionRef.current.paused = false;
      walkActionRef.current.setEffectiveWeight(idleActionRef.current ? 0 : 1);
      walkActionRef.current.play();
    }
  }, [activeSection, exploreMode, experienceJourneyKey, pathPoints, journeyPath, setExperienceUnlockedCount, setExperienceCatPose]);

  // ---------------------------------------------------------------------------------------------
  // Explore mode: WASD / arrows (camera-relative), tap/click-to-move, drag to look, wheel to zoom.
  // ---------------------------------------------------------------------------------------------
  useEffect(() => {
    exploreRuntime.groundMeshes = exploreMode ? groundMeshes : [];
  }, [exploreMode, groundMeshes]);

  useEffect(() => {
    const ex = exploreRef.current;
    if (exploreMode) {
      ex.needsInit = true;
      return;
    }
    exploreRuntime.catReady = false;
    ex.moveTarget = null;
    ex.speed = 0;
    // Sentinel: forces the prompt state to resync on the first explore frame next time.
    ex.near = -2;
    ex.keys = { f: 0, b: 0, l: 0, r: 0 };
  }, [exploreMode]);

  // Intro: remember where the cat was, and put it back (hidden again) when the About sequence ends.
  useEffect(() => {
    const intro = introRef.current;
    if (introActive) {
      if (intro.stage === "off") {
        intro.saved = { pos: catPosRef.current.clone(), heading: headingRef.current };
        intro.stage = "init";
        intro.t = 0;
        intro.ready = false;
        intro.placed = false;
      }
      return;
    }
    if (intro.stage === "off") return;
    if (intro.saved) {
      catPosRef.current.copy(intro.saved.pos);
      headingRef.current = intro.saved.heading;
    }
    intro.saved = null;
    intro.stage = "off";
    intro.wag = 0;
    const ex = exploreRef.current;
    ex.moveTarget = null;
    ex.speed = 0;
    catSpeedRef.current = 0;
  }, [introActive]);

  const openMilestone = useCallback(
    (idx: number) => {
      // Reuse the existing Experience panel: unlock up to this milestone and open the section.
      setExperienceUnlockedCount(Math.max(experienceUnlockedCount, idx + 1));
      setActiveSection("credits");
    },
    [experienceUnlockedCount, setActiveSection, setExperienceUnlockedCount]
  );

  useEffect(() => {
    if (!exploreMode) return;
    const ex = exploreRef.current;
    const keyFor = (code: string): "f" | "b" | "l" | "r" | null => {
      if (code === "KeyW" || code === "ArrowUp") return "f";
      if (code === "KeyS" || code === "ArrowDown") return "b";
      if (code === "KeyA" || code === "ArrowLeft") return "l";
      if (code === "KeyD" || code === "ArrowRight") return "r";
      return null;
    };
    const isTyping = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      return Boolean(el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable));
    };
    const onDown = (e: KeyboardEvent) => {
      if (isTyping(e) || e.metaKey || e.ctrlKey || e.altKey) return;
      const k = keyFor(e.code);
      if (k) {
        ex.keys[k] = 1;
        e.preventDefault();
        return;
      }
      if (e.code === "KeyE" && ex.near >= 0) openMilestone(ex.near);
    };
    const onUp = (e: KeyboardEvent) => {
      const k = keyFor(e.code);
      if (k) ex.keys[k] = 0;
    };
    const onBlur = () => {
      ex.keys = { f: 0, b: 0, l: 0, r: 0 };
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
      window.removeEventListener("blur", onBlur);
      onBlur();
    };
  }, [exploreMode, openMilestone]);

  useEffect(() => {
    if (!exploreMode) return;
    const el = gl.domElement;
    const ex = exploreRef.current;
    const ndc = new THREE.Vector2();
    const ray = new THREE.Raycaster();
    const normal = new THREE.Vector3();
    let press: { id: number; x: number; y: number; lastX: number; lastY: number; at: number; moved: boolean } | null =
      null;
    const onDown = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      press = { id: e.pointerId, x: e.clientX, y: e.clientY, lastX: e.clientX, lastY: e.clientY, at: performance.now(), moved: false };
    };
    const onMove = (e: PointerEvent) => {
      if (!press || e.pointerId !== press.id) return;
      const dx = e.clientX - press.lastX;
      const dy = e.clientY - press.lastY;
      press.lastX = e.clientX;
      press.lastY = e.clientY;
      if (!press.moved && Math.hypot(e.clientX - press.x, e.clientY - press.y) > 8) {
        press.moved = true;
        exploreRuntime.dragging = true;
      }
      if (press.moved) {
        exploreRuntime.camYaw -= dx * 0.006;
        exploreRuntime.camPitch = THREE.MathUtils.clamp(exploreRuntime.camPitch + dy * 0.004, 0.12, 1.05);
      }
    };
    const onUp = (e: PointerEvent) => {
      if (!press || e.pointerId !== press.id) return;
      const tap = !press.moved && performance.now() - press.at < 600;
      press = null;
      exploreRuntime.dragging = false;
      if (!tap || e.type === "pointercancel") return;
      const rect = el.getBoundingClientRect();
      ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      const hit = ray.intersectObjects(groundMeshes, false)[0];
      if (!hit || hit.point.y < resolveWaterLevel(worldScene) + CAT_EXPLORE_WATER_MARGIN) return;
      if (hit.face) {
        normal.copy(hit.face.normal).transformDirection(hit.object.matrixWorld);
        if (Math.abs(normal.y) < CAT_EXPLORE_MIN_NORMAL_Y) return;
      }
      ex.moveTarget = hit.point.clone();
      ex.markerAge = 0;
      exploreRuntime.followHeading = true;
    };
    const onWheel = (e: WheelEvent) => {
      exploreRuntime.camDist = THREE.MathUtils.clamp(exploreRuntime.camDist + e.deltaY * 0.004, 2.4, 7.5);
    };
    el.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    el.addEventListener("wheel", onWheel, { passive: true });
    return () => {
      el.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      el.removeEventListener("wheel", onWheel);
      exploreRuntime.dragging = false;
    };
  }, [exploreMode, gl, camera, groundMeshes, worldScene]);

  useEffect(() => {
    if (activeSection === "credits") return;
    setExperienceCatPose(null);
  }, [activeSection, setExperienceCatPose]);

  // Measures the lowest front and back paw vertices against the terrain and nudges the model so they rest on it:
  // when standing it settles height + pitch onto the ground; while running it only lifts out of penetration.
  const groundPaws = (runWeight: number, delta: number) => {
    const { mesh, front, back } = catPawRef.current;
    // Guided mode stays on the doc path; explore mode can roam the whole walkable terrain.
    const pawMeshes = exploreMode || introActive ? groundMeshes : docMeshes;
    if (!catGroundGroupRef.current || !mesh || front.length === 0 || back.length === 0 || pawMeshes.length === 0) return;
    catGroundGroupRef.current.updateMatrixWorld(true);
    mesh.skeleton.update();
    const v = new THREE.Vector3();
    const lowest = (indices: number[]) => {
      const best = new THREE.Vector3(0, Infinity, 0);
      for (const i of indices) {
        mesh.getVertexPosition(i, v);
        v.applyMatrix4(mesh.matrixWorld);
        if (v.y < best.y) best.copy(v);
      }
      return best;
    };
    const ray = docRayRef.current;
    const clearance = (p: THREE.Vector3) => {
      ray.set(new THREE.Vector3(p.x, p.y + 0.6, p.z), new THREE.Vector3(0, -1, 0));
      ray.far = 2;
      const hits = ray.intersectObjects(pawMeshes, true);
      return hits.length > 0 ? p.y - hits[0].point.y : null;
    };
    const pf = lowest(front);
    const pb = lowest(back);
    const cf = clearance(pf);
    const cb = clearance(pb);
    if (cf === null || cb === null) return;
    const g = catGroundRef.current;
    const eps = CAT_PAW_GROUND_EPS;
    const minC = Math.min(cf, cb);
    const eStand = (cf + cb) / 2 - eps;
    const eRun = minC < eps ? minC - eps : Math.min(Math.max(g.y - CAT_RUN_GROUND_BASE, 0), minC - eps);
    const e = THREE.MathUtils.lerp(eStand, eRun, runWeight);
    // Lift out of penetration immediately (this frame's pose is already evaluated); settle down gently.
    const k = e < 0 ? 1 : 1 - Math.exp(-10 * delta);
    g.y = THREE.MathUtils.clamp(g.y - e * k, -CAT_GROUND_MAX_OFFSET, CAT_GROUND_MAX_OFFSET);
    const span = Math.max(0.05, Math.hypot(pf.x - pb.x, pf.z - pb.z));
    const kp = 1 - Math.exp(-10 * delta);
    // Group rotation.x > 0 lifts the head end; settle pitch only while standing, relax it while running.
    g.pitch += ((cb - cf) / span) * (1 - runWeight) * kp;
    g.pitch *= 1 - runWeight * kp * 0.5;
    g.pitch = THREE.MathUtils.clamp(g.pitch, -CAT_GROUND_MAX_PITCH, CAT_GROUND_MAX_PITCH);
    const groundGroup = catGroundGroupRef.current;
    if (groundGroup) {
      groundGroup.position.y = g.y;
      groundGroup.rotation.x = g.pitch;
    }
  };

  // Walkability probe for explore mode: ground under (x, z) near the cat's height, or null if the spot is
  // water, off an edge, too steep, or a step up onto a rock / cliff.
  const probeWalkable = (x: number, z: number, fromY: number) => {
    const ray = raycasterRef.current;
    ray.set(new THREE.Vector3(x, fromY + 0.6, z), new THREE.Vector3(0, -1, 0));
    ray.far = 0.6 + CAT_EXPLORE_MAX_STEP_DOWN + 0.2;
    const hit = ray.intersectObjects(groundMeshes, false)[0];
    if (!hit || hit.point.y < waterLevelRef.current + CAT_EXPLORE_WATER_MARGIN) return null;
    const dy = hit.point.y - fromY;
    if (dy > CAT_EXPLORE_MAX_STEP_UP || dy < -CAT_EXPLORE_MAX_STEP_DOWN) return null;
    const normal = hit.face
      ? hit.face.normal.clone().transformDirection(hit.object.matrixWorld).normalize()
      : new THREE.Vector3(0, 1, 0);
    if (normal.y < 0) normal.negate();
    if (normal.y < CAT_EXPLORE_MIN_NORMAL_Y) return null;
    return { point: hit.point, normal };
  };

  const initExploreCat = () => {
    const body = catBodyRef.current;
    if (!body || groundMeshes.length === 0) return false;
    const ex = exploreRef.current;
    const pos = catPosRef.current;
    waterLevelRef.current = resolveWaterLevel(worldScene);
    const fallback = journeyPath.points[0] ?? pathPoints[0];
    const keep = pos.lengthSq() > 0.01 ? probeWalkable(pos.x, pos.z, pos.y + 0.2) : null;
    if (!keep && fallback) pos.copy(fallback);
    // Drop onto the top-most walkable surface under the spawn point.
    const drop = raycasterRef.current;
    drop.set(new THREE.Vector3(pos.x, pos.y + 20, pos.z), new THREE.Vector3(0, -1, 0));
    drop.far = 40;
    const top = drop.intersectObjects(groundMeshes, false)[0];
    if (top) pos.y = top.point.y;
    const ground = probeWalkable(pos.x, pos.z, pos.y + 0.05);
    if (ground) {
      pos.y = ground.point.y + DOC_SURFACE_OFFSET_Y;
      surfaceNormalRef.current.copy(ground.normal);
    }
    body.setTranslation({ x: pos.x, y: pos.y, z: pos.z }, true);
    body.setNextKinematicTranslation({ x: pos.x, y: pos.y, z: pos.z });
    runningRef.current = false;
    catSpeedRef.current = 0;
    ex.speed = 0;
    ex.moveTarget = null;
    if (idleActionRef.current && !idleActionRef.current.isRunning()) {
      idleActionRef.current.reset();
      idleActionRef.current.setEffectiveWeight(1);
      idleActionRef.current.play();
    }
    if (walkActionRef.current && !walkActionRef.current.isRunning()) {
      walkActionRef.current.reset();
      walkActionRef.current.setEffectiveWeight(idleActionRef.current ? 0 : 1);
      walkActionRef.current.play();
    }
    exploreRuntime.catPos.copy(pos);
    exploreRuntime.catHeading = headingRef.current;
    exploreRuntime.catReady = true;
    ex.needsInit = false;
    return true;
  };

  const exploreStep = (delta: number) => {
    const ex = exploreRef.current;
    if (ex.needsInit && !initExploreCat()) return;
    const body = catBodyRef.current;
    if (!body) return;
    const pos = catPosRef.current;
    // Camera-relative input: "forward" points away from the camera.
    const yaw = exploreRuntime.camYaw;
    const fx = -Math.sin(yaw);
    const fz = -Math.cos(yaw);
    const k = ex.keys;
    let ix = fx * (k.f - k.b) - fz * (k.r - k.l);
    let iz = fz * (k.f - k.b) + fx * (k.r - k.l);
    let desiredSpeed = 0;
    if (ix !== 0 || iz !== 0) {
      ex.moveTarget = null;
      exploreRuntime.followHeading = false;
      const len = Math.hypot(ix, iz);
      ix /= len;
      iz /= len;
      desiredSpeed = CAT_EXPLORE_SPEED;
    } else if (ex.moveTarget) {
      const dx = ex.moveTarget.x - pos.x;
      const dz = ex.moveTarget.z - pos.z;
      const dist = Math.hypot(dx, dz);
      if (dist < CAT_EXPLORE_ARRIVE_RADIUS) {
        ex.moveTarget = null;
        exploreRuntime.followHeading = false;
      } else {
        ix = dx / dist;
        iz = dz / dist;
        desiredSpeed = Math.max(0.15, CAT_EXPLORE_SPEED * smoothstep01(dist / CAT_EXPLORE_SLOW_RADIUS));
      }
    }
    const prevHeading = headingRef.current;
    if (desiredSpeed > 0) {
      const targetHeading = Math.atan2(ix, iz);
      const err = Math.abs(wrapAngle(targetHeading - prevHeading));
      headingRef.current = prevHeading + wrapAngle(targetHeading - prevHeading) * (1 - Math.exp(-CAT_ROTATE_SMOOTHNESS * delta));
      // Slow down while turning sharply so the cat arcs round instead of sliding sideways.
      desiredSpeed *= THREE.MathUtils.lerp(1, 0.3, smoothstep01(err / (Math.PI * 0.6)));
    }
    const rate = desiredSpeed > ex.speed ? CAT_EXPLORE_ACCEL : CAT_EXPLORE_DECEL;
    ex.speed += (desiredSpeed - ex.speed) * (1 - Math.exp(-rate * delta));
    if (desiredSpeed === 0 && ex.speed < 0.01) ex.speed = 0;

    let moved = 0;
    let targetY = pos.y;
    const step = ex.speed * delta;
    if (step > 1e-6) {
      const mx = Math.sin(headingRef.current) * step;
      const mz = Math.cos(headingRef.current) * step;
      // Try the full step, then slide along each axis (walls, shorelines, cliff edges).
      const candidates: [number, number][] = [
        [mx, mz],
        [mx, 0],
        [0, mz],
      ];
      let accepted = false;
      for (const [cx, cz] of candidates) {
        const hit = probeWalkable(pos.x + cx, pos.z + cz, pos.y);
        if (!hit) continue;
        pos.x += cx;
        pos.z += cz;
        targetY = hit.point.y + DOC_SURFACE_OFFSET_Y;
        surfaceNormalRef.current.lerp(hit.normal, 1 - Math.exp(-8 * delta)).normalize();
        moved = Math.hypot(cx, cz);
        accepted = true;
        break;
      }
      if (!accepted) {
        // No ground ahead (water / edge / steep): stop rather than walk off.
        ex.speed *= 0.2;
        ex.moveTarget = null;
        exploreRuntime.followHeading = false;
      }
    } else {
      const hit = probeWalkable(pos.x, pos.z, pos.y + 0.1);
      if (hit) targetY = hit.point.y + DOC_SURFACE_OFFSET_Y;
    }
    pos.y += (targetY - pos.y) * (1 - Math.exp(-18 * delta));
    const actualSpeed = delta > 0 ? moved / delta : 0;
    catSpeedRef.current = actualSpeed;

    const yawRate = delta > 0 ? wrapAngle(headingRef.current - prevHeading) / delta : 0;
    const leanAmount = THREE.MathUtils.clamp(yawRate * actualSpeed * CAT_TURN_LEAN, -CAT_MAX_LEAN, CAT_MAX_LEAN);
    const leanVec = new THREE.Vector3(Math.cos(headingRef.current), 0, -Math.sin(headingRef.current));
    const up = surfaceNormalRef.current.clone().addScaledVector(leanVec, leanAmount).normalize();
    const q = catBodyQuaternion(up, headingRef.current);
    body.setNextKinematicTranslation({ x: pos.x, y: pos.y, z: pos.z });
    body.setNextKinematicRotation({ x: q.x, y: q.y, z: q.z, w: q.w });
    exploreRuntime.catPos.copy(pos);
    exploreRuntime.catHeading = headingRef.current;

    // Milestone proximity -> prompt (React state only changes when entering / leaving a radius).
    let near = -1;
    for (const stop of milestoneStops) {
      const p = stop.position;
      if (Math.hypot(p.x - pos.x, p.z - pos.z) < MILESTONE_PROMPT_RADIUS && Math.abs(p.y - pos.y) < 1) {
        near = stop.idx;
        break;
      }
    }
    if (near !== ex.near) {
      ex.near = near;
      setNearMilestone(near);
    }

    const marker = markerRef.current;
    if (marker) {
      const target = ex.moveTarget;
      marker.visible = Boolean(target);
      if (target) {
        ex.markerAge += delta;
        marker.position.set(target.x, target.y + 0.012, target.z);
        const pulse = 1 + Math.sin(ex.markerAge * 6) * 0.12;
        marker.scale.setScalar(Math.min(1, ex.markerAge * 6) * pulse);
      }
    }
  };

  /** Ground walkable from `from` along `dir` for `dist` (small steps, same rules as explore mode). */
  const walkableLine = (from: THREE.Vector3, dir: THREE.Vector3, dist: number) => {
    let y = from.y;
    let last: THREE.Vector3 | null = null;
    for (let d = 0.1; d <= dist + 1e-4; d += 0.1) {
      const hit = probeWalkable(from.x + dir.x * d, from.z + dir.z * d, y);
      if (!hit) return null;
      y = hit.point.y;
      last = hit.point.clone();
    }
    return last;
  };

  // Pick a walkable spot in the current view, a camera pose that sees it, and a start point the cat runs in from.
  const introInit = () => {
    const body = catBodyRef.current;
    if (!body || groundMeshes.length === 0) return false;
    const water = resolveWaterLevel(worldScene);
    waterLevelRef.current = water;
    const ray = raycasterRef.current;
    const ndc = new THREE.Vector2();
    const normal = new THREE.Vector3();
    let target: THREE.Vector3 | null = null;
    for (const [x, y] of INTRO_SCREEN_SAMPLES) {
      ndc.set(x, y);
      ray.setFromCamera(ndc, camera);
      ray.far = 80;
      const hit = ray.intersectObjects(groundMeshes, false)[0];
      if (!hit || hit.point.y < water + 0.25) continue;
      if (hit.face) {
        normal.copy(hit.face.normal).transformDirection(hit.object.matrixWorld);
        if (Math.abs(normal.y) < 0.8) continue;
      }
      const ground = probeWalkable(hit.point.x, hit.point.z, hit.point.y + 0.05);
      if (ground) {
        target = ground.point.clone();
        break;
      }
    }
    if (!target) return false;

    const toCam = new THREE.Vector3(camera.position.x - target.x, 0, camera.position.z - target.z);
    if (toCam.lengthSq() < 1e-6) toCam.set(0, 0, 1);
    toCam.normalize();
    const look = target.clone().addScaledVector(WORLD_UP, INTRO_LOOK_HEIGHT);
    let camPos: THREE.Vector3 | null = null;
    const tryDir = new THREE.Vector3();
    const sight = new THREE.Vector3();
    for (const lift of [1.25, 2.0]) {
      for (const da of [0, 0.4, -0.4, 0.8, -0.8, 1.2, -1.2]) {
        tryDir.copy(toCam).applyAxisAngle(WORLD_UP, da);
        const c = target.clone().addScaledVector(tryDir, INTRO_CAM_DIST).addScaledVector(WORLD_UP, lift);
        ray.set(new THREE.Vector3(c.x, c.y + 20, c.z), WORLD_DOWN);
        ray.far = 40;
        const under = ray.intersectObjects(groundMeshes, false)[0];
        if (under && under.point.y > c.y - 0.4) continue;
        sight.copy(look).sub(c);
        const dist = sight.length();
        ray.set(c, sight.normalize());
        ray.far = Math.max(0.1, dist - 0.15);
        if (ray.intersectObjects(groundMeshes, false).length > 0) continue;
        camPos = c;
        break;
      }
      if (camPos) break;
    }
    if (!camPos) camPos = target.clone().addScaledVector(toCam, INTRO_CAM_DIST).addScaledVector(WORLD_UP, 2.6);

    // Run in across the view (sideways, slightly from behind), falling back to any walkable direction.
    const side = new THREE.Vector3(toCam.z, 0, -toCam.x);
    const away = toCam.clone().negate();
    const dirs = [
      side.clone().multiplyScalar(0.85).addScaledVector(away, 0.5).normalize(),
      side.clone().multiplyScalar(-0.85).addScaledVector(away, 0.5).normalize(),
      side.clone(),
      side.clone().negate(),
      away.clone(),
    ];
    let spawn: THREE.Vector3 | null = null;
    for (const dist of INTRO_RUN_DISTANCES) {
      for (const dir of dirs) {
        spawn = walkableLine(target, dir, dist);
        if (spawn) break;
      }
      if (spawn) break;
    }
    const start = spawn ?? target.clone();
    const pos = catPosRef.current;
    pos.copy(start);
    pos.y += DOC_SURFACE_OFFSET_Y;
    const toTarget = new THREE.Vector3(target.x - pos.x, 0, target.z - pos.z);
    headingRef.current = toTarget.lengthSq() > 1e-6 ? Math.atan2(toTarget.x, toTarget.z) : Math.atan2(toCam.x, toCam.z);
    surfaceNormalRef.current.set(0, 1, 0);
    catGroundRef.current = { y: 0, pitch: 0 };
    const q = catBodyQuaternion(surfaceNormalRef.current, headingRef.current);
    body.setTranslation({ x: pos.x, y: pos.y, z: pos.z }, true);
    body.setRotation({ x: q.x, y: q.y, z: q.z, w: q.w }, true);
    body.setNextKinematicTranslation({ x: pos.x, y: pos.y, z: pos.z });
    const ex = exploreRef.current;
    ex.needsInit = false;
    ex.keys = { f: 0, b: 0, l: 0, r: 0 };
    ex.speed = 0;
    ex.moveTarget = spawn ? target.clone() : null;
    catSpeedRef.current = 0;
    runningRef.current = false;
    if (idleActionRef.current && !idleActionRef.current.isRunning()) {
      idleActionRef.current.reset();
      idleActionRef.current.setEffectiveWeight(1);
      idleActionRef.current.play();
    }
    if (walkActionRef.current && !walkActionRef.current.isRunning()) {
      walkActionRef.current.reset();
      walkActionRef.current.setEffectiveWeight(idleActionRef.current ? 0 : 1);
      walkActionRef.current.play();
    }
    introFrame(camPos, look);
    return true;
  };

  const introStep = (delta: number) => {
    const intro = introRef.current;
    intro.t += delta;
    if (intro.stage === "init") {
      if (introInit()) {
        intro.placed = true;
        intro.stage = "run";
        intro.t = 0;
      } else if (intro.t > INTRO_INIT_TIMEOUT) {
        // No usable spot in view: just open the dialog.
        intro.stage = "sit";
        intro.ready = true;
        introReady();
      }
      return;
    }
    if (!intro.placed) return;
    const ex = exploreRef.current;
    if (intro.stage === "run") {
      exploreStep(delta);
      if ((!ex.moveTarget && ex.speed < 0.05) || intro.t > INTRO_RUN_TIMEOUT) {
        ex.moveTarget = null;
        intro.stage = "sit";
        intro.t = 0;
      }
      return;
    }
    // Sitting: turn to a three-quarter view of the camera (exploreStep applies heading + grounding).
    const pos = catPosRef.current;
    const facing = Math.atan2(camera.position.x - pos.x, camera.position.z - pos.z) + 0.45;
    headingRef.current += wrapAngle(facing - headingRef.current) * (1 - Math.exp(-4 * delta));
    exploreStep(delta);
    if (!intro.ready && intro.t > INTRO_SIT_SECONDS) {
      intro.ready = true;
      introReady();
    }
  };

  useFrame((_, delta) => {
    if (mixerRef.current && catActive) {
      // AnimationMixer skips writing tracks whose value did not change (e.g. constant idle channels),
      // so undo last frame's additive offsets first; otherwise they accumulate and the cat tumbles.
      const offset = catPoseOffsetRef.current;
      for (const bodyBone of catBodyBoneRefs.current) bodyBone.rotateX(-offset.body);
      for (const headBone of catHeadBoneRefs.current) headBone.rotateX(-offset.head);
      for (const tailBone of catTailBoneRefs.current) tailBone.rotateOnAxis(TAIL_WAG_AXIS, -offset.tail);
      const walkAction = walkActionRef.current;
      const idleAction = idleActionRef.current;
      const speed = catSpeedRef.current;
      let walkWeight = walkAction?.isRunning() ? walkAction.getEffectiveWeight() : 0;
      if (walkAction && idleAction) {
        // Speed-driven blend: idle when (nearly) still, walk when moving; walk playback matches ground speed.
        walkWeight = smoothstep01(speed / CAT_WALK_BLEND_SPEED);
        walkAction.setEffectiveWeight(walkWeight);
        idleAction.setEffectiveWeight(1 - walkWeight);
        walkAction.setEffectiveTimeScale(THREE.MathUtils.clamp(speed / CAT_CLIP_GROUND_SPEED, 0.5, 1.6));
      }
      mixerRef.current.update(delta);
      // Walk-tuned body dip / head lift, blended out as the walk clip fades to idle.
      offset.body = CAT_BODY_DIP_X * walkWeight;
      offset.head = CAT_HEAD_LIFT_X * walkWeight;
      for (const bodyBone of catBodyBoneRefs.current) bodyBone.rotateX(offset.body);
      for (const headBone of catHeadBoneRefs.current) headBone.rotateX(offset.head);
      // Tail wag while the intro cat sits (additive bone offset, eased in/out).
      const intro = introRef.current;
      const wagTarget = introActive && intro.stage === "sit" ? 1 : 0;
      intro.wag += (wagTarget - intro.wag) * (1 - Math.exp(-3 * delta));
      intro.wagTime += delta;
      offset.tail = intro.wag > 0.001 ? Math.sin(intro.wagTime * TAIL_WAG_SPEED) * TAIL_WAG_AMPLITUDE * intro.wag : 0;
      for (const tailBone of catTailBoneRefs.current) tailBone.rotateOnAxis(TAIL_WAG_AXIS, offset.tail);
      groundPaws(walkWeight, delta);
    }
    if (exploreMode) {
      exploreStep(Math.min(delta, 0.1));
      return;
    }
    if (introActive) {
      introStep(Math.min(delta, 0.1));
      return;
    }
    if (activeSection !== "credits") return;
    if (!runningRef.current) return;
    if (pathPoints.length < 2) return;

    elapsedRef.current += delta;
    const profile = journeyProfile(journeyPath.length, elapsedRef.current - CAT_START_DELAY_SECONDS);
    catSpeedRef.current = profile.speed;
    const targetPos = samplePolyline(journeyPath, profile.distance);
    const aheadPos = samplePolyline(journeyPath, Math.min(journeyPath.length, profile.distance + CAT_LOOKAHEAD));
    const progress = targetJourneyProgress * (journeyPath.length > 0 ? profile.distance / journeyPath.length : 1);
    const pos = targetPos;
    const tangent = aheadPos.clone().sub(targetPos);
    if (tangent.lengthSq() > 1e-8) tangent.normalize();
    else tangent.copy(tangentAt(pathPoints, progress));
    const body = catBodyRef.current;
    if (body) {
      // Cat movement follows doc path and snaps to doc surface.
      const safePos = targetPos;
      const desiredPos = new THREE.Vector3(safePos.x, safePos.y, safePos.z);
      if (docMeshes.length > 0) {
        const docRay = docRayRef.current;
        docRay.set(new THREE.Vector3(desiredPos.x, safePos.y + 3.5, desiredPos.z), new THREE.Vector3(0, -1, 0));
        docRay.far = 8;
        const floorHits = docRay.intersectObjects(docMeshes, true);
        if (floorHits.length > 0) {
          desiredPos.y = floorHits[0].point.y + DOC_SURFACE_OFFSET_Y;
          if (floorHits[0].face) {
            const faceNormal = floorHits[0].face.normal
              .clone()
              .transformDirection(floorHits[0].object.matrixWorld)
              .normalize();
            const normalSmooth = 1 - Math.exp(-8 * delta);
            surfaceNormalRef.current.lerp(faceNormal, normalSmooth).normalize();
          }
        }
      }
      const currentPos = catPosRef.current.clone();
      const moveDir = desiredPos.clone().sub(currentPos);
      if (moveDir.lengthSq() > 0.000001) {
        let collisionResolved = false;
        if (world && rapier) {
          const dir = moveDir.clone().normalize();
          const rayOrigin = currentPos.clone().add(new THREE.Vector3(0, 0.08, 0));
          const ray = new rapier.Ray(
            { x: rayOrigin.x, y: rayOrigin.y, z: rayOrigin.z },
            { x: dir.x, y: dir.y, z: dir.z }
          );
          const maxToi = moveDir.length() + CAT_COLLISION_RADIUS;
          const hit = world.castRayAndGetNormal(ray, maxToi, false);
          if (hit) {
            const toi = (hit as { toi?: number; timeOfImpact?: number }).toi
              ?? (hit as { timeOfImpact?: number }).timeOfImpact
              ?? 0;
            const n = (hit as { normal?: { x: number; y: number; z: number } }).normal;
            const normal = n
              ? new THREE.Vector3(n.x, n.y, n.z).normalize()
              : new THREE.Vector3(-dir.x, 0, -dir.z).normalize();
            const hitPoint = rayOrigin.clone().addScaledVector(dir, Math.max(0, toi));
            desiredPos.copy(hitPoint).addScaledVector(normal, CAT_COLLISION_RADIUS + 0.01);
            collisionResolved = true;
          }
        }
        if (!collisionResolved && wallMeshes.length > 0) {
          const ray = raycasterRef.current;
          ray.set(currentPos, moveDir.clone().normalize());
          ray.far = moveDir.length() + CAT_COLLISION_RADIUS;
          const hits = ray.intersectObjects(wallMeshes, true);
          if (hits.length > 0) {
            const hit = hits[0];
            if (hit.face) {
              const normal = hit.face.normal.clone().transformDirection(hit.object.matrixWorld).normalize();
              desiredPos.copy(hit.point).addScaledVector(normal, CAT_COLLISION_RADIUS);
            } else {
              desiredPos.copy(currentPos);
            }
          }
        }
      }
      const moveSmooth = 1 - Math.exp(-CAT_MOVE_SMOOTHNESS * delta);
      const smoothedPos = currentPos.clone().lerp(desiredPos, moveSmooth);
      // Turn smoothly toward a look-ahead point on the route (shortest angle), and lean into turns.
      const lookDir = aheadPos.clone().sub(smoothedPos);
      const targetHeading =
        Math.hypot(lookDir.x, lookDir.z) > 0.01 && profile.speed > 0.02
          ? Math.atan2(lookDir.x, lookDir.z)
          : headingRef.current;
      const rotSmooth = 1 - Math.exp(-CAT_ROTATE_SMOOTHNESS * delta);
      const prevHeading = headingRef.current;
      headingRef.current = prevHeading + wrapAngle(targetHeading - prevHeading) * rotSmooth;
      const yawRate = delta > 0 ? wrapAngle(headingRef.current - prevHeading) / delta : 0;
      // With doc snapping the surface normal already follows the slope; only add slope pitch as a fallback.
      const pitch = docMeshes.length > 0 ? 0 : THREE.MathUtils.clamp(0.015 + tangent.y * 0.25, -0.08, 0.1);
      const leanAmount = THREE.MathUtils.clamp(yawRate * profile.speed * CAT_TURN_LEAN, -CAT_MAX_LEAN, CAT_MAX_LEAN);
      // Turn centre lies on (cos h, 0, -sin h) for a positive yaw rate; tilt the body's up vector toward it.
      const leanVec = new THREE.Vector3(Math.cos(headingRef.current), 0, -Math.sin(headingRef.current));

      catPosRef.current.copy(smoothedPos);
      body.setNextKinematicTranslation({ x: smoothedPos.x, y: smoothedPos.y, z: smoothedPos.z });
      const up = surfaceNormalRef.current.clone().addScaledVector(leanVec, leanAmount).normalize();
      const headingForward = new THREE.Vector3(
        Math.sin(headingRef.current + Math.PI),
        0,
        Math.cos(headingRef.current + Math.PI)
      );
      const forwardProjected = headingForward.sub(up.clone().multiplyScalar(headingForward.dot(up)));
      if (forwardProjected.lengthSq() < 1e-6) {
        forwardProjected.set(0, 0, 1).sub(up.clone().multiplyScalar(up.z));
      }
      forwardProjected.normalize();
      const right = new THREE.Vector3().crossVectors(up, forwardProjected).normalize();
      const forward = new THREE.Vector3().crossVectors(right, up).normalize();
      const basis = new THREE.Matrix4().makeBasis(right, up, forward);
      const surfaceQuat = new THREE.Quaternion().setFromRotationMatrix(basis);
      const localOffset = new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch, 0, 0, "XYZ"));
      const q = surfaceQuat.multiply(localOffset);
      body.setNextKinematicRotation({ x: q.x, y: q.y, z: q.z, w: q.w });
      prevPosRef.current.copy(pos);
      const now = performance.now();
      if (now - lastPoseUpdateAtRef.current >= CAT_POSE_UPDATE_INTERVAL_MS) {
        setExperienceCatPose({
          position: [smoothedPos.x, smoothedPos.y, smoothedPos.z],
          heading: headingRef.current,
        });
        lastPoseUpdateAtRef.current = now;
      }
    }

    let unlocked = 0;
    for (let i = 0; i < milestoneStops.length; i += 1) {
      const threshold = milestoneStops[i].progress ?? 1;
      if (progress >= threshold) unlocked = i + 1;
    }
    if (unlocked !== unlockedRef.current) {
      unlockedRef.current = unlocked;
      setExperienceUnlockedCount(unlocked);
    }

    const hasReachedFinalStop = profile.done;
    const lastFlagCatStop = journeyPath.stop;

    if (hasReachedFinalStop) {
      if (body) {
        const endPos = lerpPath(pathPoints, targetJourneyProgress);
        const desiredFinalPos = lastFlagCatStop
          ? lastFlagCatStop.clone()
          : offsetOutward(endPos, tangentAt(pathPoints, targetJourneyProgress), CAT_WALL_CLEARANCE);
        const finalPos = hasReachedFinalStop ? catPosRef.current.clone() : desiredFinalPos;

        if (!hasReachedFinalStop && docMeshes.length > 0) {
          const docRay = docRayRef.current;
          docRay.set(new THREE.Vector3(finalPos.x, finalPos.y + 3.5, finalPos.z), new THREE.Vector3(0, -1, 0));
          docRay.far = 8;
          const floorHits = docRay.intersectObjects(docMeshes, true);
          if (floorHits.length > 0) {
            finalPos.y = floorHits[0].point.y + DOC_SURFACE_OFFSET_Y;
            if (floorHits[0].face) {
              surfaceNormalRef.current
                .copy(
                  floorHits[0].face.normal
                    .clone()
                    .transformDirection(floorHits[0].object.matrixWorld)
                    .normalize()
                )
                .normalize();
            }
          }
        }
        catPosRef.current.copy(finalPos);
        body.setNextKinematicTranslation({ x: finalPos.x, y: finalPos.y, z: finalPos.z });
        setExperienceCatPose({
          position: [finalPos.x, finalPos.y, finalPos.z],
          heading: headingRef.current,
        });
      }
      runningRef.current = false;
      const finalUnlocked = experienceMilestones.length;
      if (unlockedRef.current !== finalUnlocked) {
        unlockedRef.current = finalUnlocked;
        setExperienceUnlockedCount(finalUnlocked);
      }
      catSpeedRef.current = 0;
      // Cat has stopped: the speed-driven blend in the mixer block has already eased walk -> Idle_Stand.
      if (!idleActionRef.current && walkActionRef.current) {
        walkActionRef.current.setEffectiveWeight(1);
        walkActionRef.current.setEffectiveTimeScale(1.5);
      }
    }
  });

  if (!catActive) return null;

  return (
    <group name="experience-milestone-trail">
      {/* The intro cat comes alone: no torches / flags (their lights would also force shader recompiles). */}
      {(activeSection === "credits" || exploreMode) && milestoneStops.map((stop, idx) => {
        const milestone = experienceMilestones[stop.idx];
        const flagPos = stop.position;
        const isUnlocked = idx < experienceUnlockedCount;
        const tangent = tangentAt(pathPoints, stop.progress ?? 0);
        const flagYaw = Math.atan2(tangent.x, tangent.z);
        const torchOffset = FIXED_TORCH_OFFSETS[Math.min(idx, FIXED_TORCH_OFFSETS.length - 1)];
        const torchModel = torchModels[stop.idx];
        return (
          <group key={milestone.id} position={flagPos.toArray()} rotation={[0, flagYaw, 0]}>
            {torchModel && (
              <group position={torchOffset}>
                <primitive object={torchModel} scale={TORCH_SCALE} />
                <pointLight
                  position={TORCH_FLAME_OFFSET}
                  color={isUnlocked ? "#ffa842" : "#4a6070"}
                  intensity={isUnlocked ? 4.5 : 0.4}
                  distance={isUnlocked ? 5 : 1.5}
                  decay={1.8}
                />
              </group>
            )}
            <MilestonePennant
              position={PENNANT_OFFSET}
              parentYaw={flagYaw}
              color={isUnlocked || exploreMode ? "#d9732f" : "#56707e"}
              reducedMotion={reducedMotion}
            />
            {exploreMode && nearMilestone === stop.idx && (
              <Html position={[0.05, 0.95, 0]} center zIndexRange={[12, 0]}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    openMilestone(stop.idx);
                  }}
                  className="cursor-pointer rounded-full border border-[#dca869]/80 bg-[#2f1f11]/85 px-3 py-1 text-[11px] font-semibold tracking-[0.06em] whitespace-nowrap text-[#fce6c4] shadow-lg backdrop-blur-sm"
                >
                  {tExplore("milestonePrompt", { title: milestone.title })}
                  <span className="ml-2 hidden rounded border border-[#dca869]/60 px-1 text-[10px] sm:inline">E</span>
                </button>
              </Html>
            )}
            <Html position={[0.05, 1.45, 0]} distanceFactor={16} center zIndexRange={[8, 0]}>
              <span
                className={[
                  "pointer-events-none rounded-full border px-2 py-0.5 text-[10px] tracking-[0.08em] whitespace-nowrap",
                  isUnlocked
                    ? "border-[#dca869]/80 bg-[#2f1f11]/80 text-[#fce6c4]"
                    : "border-[#4e6673]/70 bg-[#11212b]/70 text-[#9fb8c4]",
                ].join(" ")}
              >
                {milestone.period}
              </span>
            </Html>
          </group>
        );
      })}

      {exploreMode && (
        <mesh ref={markerRef} rotation={[-Math.PI / 2, 0, 0]} scale={0.0001} renderOrder={2}>
          <ringGeometry args={[0.06, 0.09, 24]} />
          <meshBasicMaterial color="#ffe7b0" transparent opacity={0.85} depthWrite={false} />
        </mesh>
      )}

      <RigidBody
        ref={catBodyRef}
        type="kinematicPosition"
        colliders="ball"
        friction={1}
        restitution={0}
        position={[0, 0, 0]}
      >
        <group ref={catGroundGroupRef}>
          <primitive
            object={catModel}
            scale={CAT_SCALE}
            position={[0, 0, 0]}
            rotation={[0, Math.PI / 2, 0]}
          />
        </group>
      </RigidBody>
    </group>
  );
}

useGLTF.preload("/cat_rigged.glb?v=4");
useGLTF.preload("/torch.glb");
