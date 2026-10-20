"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Html } from "@react-three/drei";
import { useGLTF } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useLocale, useTranslations } from "next-intl";
import { RigidBody, type RapierRigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";

import { getExperienceMilestones } from "../../../mock/experienceData";
import type { AppLocale } from "../../../mock/locale";
import { exploreRuntime } from "../navigation/exploreRuntime";
import { usePortfolioNav } from "../navigation/PortfolioNavContext";
import { useReducedMotion } from "../performance/useReducedMotion";
import { resolveWaterLevel } from "./waterLevel";
import { playMeow } from "../audio/catSound";
import { notifyCatPetted } from "../ui/catPetStore";
import { markMilestoneDiscovered, markPierDiscovered, updateExplorePoi } from "../explore/exploreProgress";
import { FISHING_HEADING, FISHING_PROMPT_RADIUS, FISHING_ROUTE, FISHING_SEAT, PIER_ENTRY, PIER_MESH_NAME } from "../fishing/pierLayout";
import {
  exitFishing,
  fishingArrived,
  fishingUnreachable,
  getFishingState,
  isFishingSeated,
  setFishingNear,
  type FishingPhase,
} from "../fishing/fishingStore";
import {
  PET_COOLDOWN_MS,
  PET_CUDDLE_EVERY,
  PET_PROXY_LIFT,
  PET_PROXY_RADIUS,
  applyPetPose,
  createHeartPool,
  createPetState,
  findPetBones,
  startPet,
  undoPetPose,
  type PetBones,
} from "./catPet";
import { MilestonePennant } from "./MilestonePennant";

const CAT_SCALE = 1 / 80;
const CAT_WALL_CLEARANCE = 0;
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
/**
 * Guided journey: the cat advances along the precomputed route itself (never off it, never blocked), catching up
 * with the time-based profile at most this fast, so a frame hitch never turns into a jump.
 */
const CAT_GUIDED_MAX_SPEED = CAT_CRUISE_SPEED * 1.3;
const CAT_GUIDED_MAX_DT = 0.1;
/** Running to a milestone picked in the Experience dialog (same route, either direction). */
const CAT_TARGET_CRUISE = CAT_CRUISE_SPEED;
/** Slightly faster cruise when the picked milestone is far along the route. */
const CAT_TARGET_FAR_CRUISE = 1.8;
const CAT_TARGET_FAR_DISTANCE = 3;
const CAT_TARGET_ACCEL = 1.6;
/** Braking curve (v = sqrt(2 * decel * remaining)) so it eases into the stop; braking may use up to this rate. */
const CAT_TARGET_DECEL = 1.1;
const CAT_TARGET_BRAKE_LIMIT = 1.8;
const CAT_TARGET_ARRIVE_DISTANCE = 0.005;
/** Running speed fades in as the heading lines up with the way to go (cos of the heading error). */
const TURN_ALIGN_MIN = 0.35;
const TURN_ALIGN_RANGE = 0.5;
/** Where along the route a milestone is: closest route point to its flag, searched near its unlock distance. */
const MILESTONE_STOP_WINDOW = 1.5;
/** How far along the route (samples) to look for a turn-around spot. */
const TURN_SEARCH_SAMPLES = 40;
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
/** Max body tilt from the ground normal (radians): pitch along the heading, roll sideways. */
const CAT_BODY_MAX_PITCH = 0.38;
const CAT_BODY_MAX_ROLL = 0.1;
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
const INTRO_CAM_DIST = 2.75;
/** Intro spots must be clearly on land: above the ocean by this much and inside the island. */
const INTRO_MIN_ABOVE_WATER = 0.45;
const INTRO_MAX_RADIUS = 11;
/** Visible island ground meshes that are walkable but not tagged as physics colliders (+ the fishing pier). */
const WALKABLE_TERRAIN_NAMES = ["Object_232", PIER_MESH_NAME];
/** Fishing walk: the cat chases a point this far ahead along the pier route (no stop at every waypoint). */
const FISHING_CARROT = 0.7;
/** Cost weight of the unplanned straight first leg vs known obstacle-free route length (prefer joining early). */
const FISHING_STRAIGHT_COST = 3;
/** Give up the walk (no progress along the route) after this long. */
const FISHING_STUCK_SECONDS = 2.5;
const INTRO_LOOK_HEIGHT = 0.18;
// Timings: the cat waits at its start spot until the camera has (nearly) arrived, runs ~1.5-2s, sits ~1s.
// Reduced motion shortens (not skips) the sequence.
const INTRO_RUN_DISTANCES = [2.0, 1.4, 0.9];
const INTRO_RUN_DISTANCES_REDUCED = [1.2, 0.9];
const INTRO_RUN_DELAY = 0.45;
const INTRO_RUN_DELAY_REDUCED = 0.2;
const INTRO_RUN_TIMEOUT = 6;
const INTRO_SIT_SECONDS = 1.45;
const INTRO_SIT_SECONDS_REDUCED = 0.9;
const INTRO_EXPLORE_SIT_SECONDS = 1.45;
const INTRO_INIT_TIMEOUT = 4;
// Bone-local Y swings the tail sideways for this rig (measured: mostly lateral displacement).
const TAIL_WAG_AXIS = new THREE.Vector3(0, 1, 0);
const TAIL_WAG_AMPLITUDE = 0.2;
const TAIL_WAG_SPEED = 7.5;
// Procedural sit (the rig has no sit clip): additive rotations about the cat's lateral axis, eased in.
// Angles in radians, positive = forward/down. Hind legs fold so the rump drops; the paw grounding then pitches
// the body up (allowed up to CAT_SIT_MAX_PITCH) and the front legs / neck are counter-rotated to stay upright.
const CAT_SIT_THIGH = -1.05;
const CAT_SIT_SHIN = 1.75;
const CAT_SIT_FOOT = -0.6;
const CAT_SIT_MAX_PITCH = 0.62;
const CAT_SIT_NECK_COUNTER = 0.55;
const WORLD_UP = new THREE.Vector3(0, 1, 0);
const WORLD_DOWN = new THREE.Vector3(0, -1, 0);
const ONE_SCALE = new THREE.Vector3(1, 1, 1);
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

type JourneyPath = {
  points: THREE.Vector3[];
  cum: number[];
  length: number;
  stop: THREE.Vector3 | null;
  /** What the route was kept clear of (also used to find spots where the cat can turn around). */
  obstacles?: RouteObstacles;
};

const ROUTE_GROUND_NAMES = new Set(["doc", "Object_231", "Object_232"]);
const ROUTE_SKIP_GROUPS = new Set(["experience-milestone-trail", "weather-effects", "project-bird-flock"]);
/**
 * Cat body box in the body frame (x lateral, y up, +z = back/tail), slightly inflated, used to keep the route clear.
 * Symmetric front / back (tail length both ways): the cat also runs the route backwards to a picked milestone.
 */
const CAT_ROUTE_BODY_MIN = new THREE.Vector3(-0.1, 0.06, -0.44);
const CAT_ROUTE_BODY_MAX = new THREE.Vector3(0.1, 0.3, 0.44);
/** Sideways detour candidates (world units) and the ramp length used to blend a detour in and out. */
const CAT_ROUTE_DETOUR_STEPS = [0.06, 0.12, 0.18, 0.24, 0.32, 0.4, 0.5, 0.6, 0.75, 0.9, 1.05, 1.2, 1.35, 1.5];
const CAT_ROUTE_RAMP = 0.9;
const CAT_ROUTE_HEADING_SLACK = 0.2;
const CAT_ROUTE_SIDE_SLACK = 0.08;
const CAT_ROUTE_WATER_MARGIN = 0.2;
/** Farthest body-box corner from the cat's origin (plus a little): obstacles beyond this cannot touch it. */
const ROUTE_BODY_REACH = 0.6;
/** Detoured routes per scene (geometry is static): built once, reused on every Experience visit. */
const detouredRouteCache = new WeakMap<THREE.Object3D, Map<string, THREE.Vector3[]>>();
const BOX_EDGES: [number, number][] = [
  [0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7],
  [0, 7], [1, 6], [2, 5], [3, 4],
];

type RouteObstacles = {
  meshes: THREE.Mesh[];
  /** World bounding sphere per mesh (same order), to test only the obstacles near a sample. */
  spheres: THREE.Sphere[];
  /** Vertical posts (torches, pennant poles): xz centre + radius. */
  posts: { x: number; z: number; r: number }[];
};

/** Visible meshes near the route that the cat must not pass through (rocks, trees, bushes, ruins...). */
function collectRouteObstacles(points: THREE.Vector3[], scene: THREE.Object3D) {
  const box = new THREE.Box3().setFromPoints(points).expandByScalar(1.2);
  const meshes: THREE.Mesh[] = [];
  const spheres: THREE.Sphere[] = [];
  const visit = (obj: THREE.Object3D) => {
    if (!obj.visible || ROUTE_SKIP_GROUPS.has(obj.name) || ROUTE_GROUND_NAMES.has(obj.name)) return;
    const mesh = obj as THREE.Mesh;
    if (mesh.isMesh && !(mesh as THREE.InstancedMesh).isInstancedMesh && mesh.geometry) {
      const material = mesh.material as (THREE.Material & { uniforms?: Record<string, unknown> }) | undefined;
      if (!material?.uniforms?.mirrorSampler) {
        if (!mesh.geometry.boundingSphere) mesh.geometry.computeBoundingSphere();
        if (mesh.geometry.boundingSphere) {
          const sphere = mesh.geometry.boundingSphere.clone().applyMatrix4(mesh.matrixWorld);
          if (box.intersectsSphere(sphere)) {
            meshes.push(mesh);
            spheres.push(sphere);
          }
        }
      }
    }
    for (const child of obj.children) visit(child);
  };
  visit(scene);
  return { meshes, spheres };
}

/** Does the cat's body box, standing at `p` facing `heading`, touch any obstacle? */
function routeBodyBlocked(
  p: THREE.Vector3,
  heading: number,
  obstacles: RouteObstacles,
  ray: THREE.Raycaster,
  boxMin = CAT_ROUTE_BODY_MIN,
  boxMax = CAT_ROUTE_BODY_MAX
) {
  const q = catBodyQuaternion(WORLD_UP, heading);
  const m = new THREE.Matrix4().compose(p, q, ONE_SCALE);
  const corners: THREE.Vector3[] = [];
  for (let i = 0; i < 8; i += 1) {
    corners.push(
      new THREE.Vector3(
        i & 1 ? boxMax.x : boxMin.x,
        i & 2 ? boxMax.y : boxMin.y,
        i & 4 ? boxMax.z : boxMin.z
      ).applyMatrix4(m)
    );
  }
  // Posts: distance from the post axis to the body rectangle (in the body's xz frame).
  if (obstacles.posts.length > 0) {
    const inv = m.clone().invert();
    const local = new THREE.Vector3();
    for (const post of obstacles.posts) {
      local.set(post.x, p.y + 0.15, post.z).applyMatrix4(inv);
      const dx = Math.max(boxMin.x - local.x, 0, local.x - boxMax.x);
      const dz = Math.max(boxMin.z - local.z, 0, local.z - boxMax.z);
      if (dx * dx + dz * dz < post.r * post.r) return true;
    }
  }
  // Only meshes whose bounding sphere reaches the body (keeps the route build cheap).
  const near: THREE.Mesh[] = [];
  for (let i = 0; i < obstacles.meshes.length; i += 1) {
    if (obstacles.spheres[i].distanceToPoint(p) < ROUTE_BODY_REACH) near.push(obstacles.meshes[i]);
  }
  if (near.length === 0) return false;
  const dir = new THREE.Vector3();
  for (const [a, b] of BOX_EDGES) {
    dir.subVectors(corners[b], corners[a]);
    const len = dir.length();
    ray.set(corners[a], dir.divideScalar(len));
    ray.far = len;
    if (ray.intersectObjects(near, false).length > 0) return true;
  }
  // Fully inside a big mesh (no edge crosses a surface): look down through the body from its top.
  const top = new THREE.Vector3(0, boxMax.y, (boxMin.z + boxMax.z) / 2).applyMatrix4(m);
  ray.set(top, WORLD_DOWN);
  ray.far = boxMax.y - boxMin.y;
  return ray.intersectObjects(near, false).length > 0;
}

/**
 * Detour the guided route around obstacles: every sample is tested with the cat's body box (facing along the
 * route); blocked stretches shift sideways (one side per stretch, smallest clear offset on walkable ground above
 * the water), blended in / out over CAT_ROUTE_RAMP, and re-tested until clear. Runs once when the route is built.
 */
function detourRoute(
  points: THREE.Vector3[],
  obstacles: RouteObstacles,
  walkMeshes: THREE.Mesh[],
  waterLevel: number
) {
  const n = points.length;
  if (n < 3 || walkMeshes.length === 0) return;
  const ray = new THREE.Raycaster();
  const down = new THREE.Raycaster();
  const base = points.map((p) => p.clone());
  const spacing = Math.max(1e-3, base[0].distanceTo(base[n - 1]) > 0 ? totalLength(base) / (n - 1) : 0.05);
  const rampSamples = Math.max(2, Math.round(CAT_ROUTE_RAMP / spacing));
  const headingAt = (pts: THREE.Vector3[], i: number) => {
    const a = pts[Math.max(0, i - 2)];
    const b = pts[Math.min(n - 1, i + 2)];
    return Math.atan2(b.x - a.x, b.z - a.z);
  };
  const sideAt = (i: number) => {
    const h = headingAt(base, i);
    return new THREE.Vector3(Math.cos(h), 0, -Math.sin(h));
  };
  // Ground under (x, z) near height y: path or grass, above the ocean.
  const groundAt = (x: number, z: number, y: number) => {
    down.set(new THREE.Vector3(x, y + 0.6, z), WORLD_DOWN);
    down.far = 1.4;
    const hit = down.intersectObjects(walkMeshes, false)[0];
    if (!hit || hit.point.y < waterLevel + CAT_ROUTE_WATER_MARGIN) return null;
    return new THREE.Vector3(hit.point.x, hit.point.y + DOC_SURFACE_OFFSET_Y, hit.point.z);
  };
  const offsets = new Array<number>(n).fill(0);
  // The same (sample, offset) spots are probed again on later passes: ray the ground only once for each.
  const groundMemo = new Map<string, THREE.Vector3 | null>();
  const at = (i: number, off: number) => {
    if (off === 0) return base[i].clone();
    const key = `${i}:${off.toFixed(4)}`;
    if (!groundMemo.has(key)) {
      const side = sideAt(i);
      groundMemo.set(key, groundAt(base[i].x + side.x * off, base[i].z + side.z * off, base[i].y));
    }
    return groundMemo.get(key)?.clone() ?? null;
  };
  // A detour spot must stay clear with some slack: a bit further out, and with the heading off by a little
  // (the cat's heading lags the route on curves and its body tilts on slopes).
  const clearWithSlack = (k: number, off: number, sign: number, heading: number) => {
    const p = at(k, off);
    if (!p) return false;
    for (const dh of [0, CAT_ROUTE_HEADING_SLACK, -CAT_ROUTE_HEADING_SLACK]) {
      if (routeBodyBlocked(p, heading + dh, obstacles, ray)) return false;
    }
    const further = at(k, off + sign * CAT_ROUTE_SIDE_SLACK);
    return Boolean(further && !routeBodyBlocked(further, heading, obstacles, ray));
  };
  for (let iter = 0; iter < 4; iter += 1) {
    const current = base.map((_, i) => at(i, offsets[i]) ?? base[i].clone());
    const blocked = current.map((p, i) => i > 0 && i < n - 1 && routeBodyBlocked(p, headingAt(current, i), obstacles, ray));
    if (!blocked.some(Boolean)) break;
    // Stretches of consecutive blocked samples.
    const need = new Array<number>(n).fill(0);
    for (let i = 1; i < n - 1; i += 1) {
      if (!blocked[i]) continue;
      let j = i;
      while (j + 1 < n - 1 && blocked[j + 1]) j += 1;
      // One side per stretch (no zig-zag); each sample gets the smallest extra offset that clears it there.
      let best: { sign: number; amounts: number[]; misses: number; total: number } | null = null;
      for (const sign of [1, -1]) {
        const amounts: number[] = [];
        let misses = 0;
        let total = 0;
        for (let k = i; k <= j; k += 1) {
          let found = 0;
          for (const step of CAT_ROUTE_DETOUR_STEPS) {
            if (clearWithSlack(k, offsets[k] + sign * step, sign, headingAt(current, k))) {
              found = step;
              break;
            }
          }
          if (!found) misses += 1;
          amounts.push(found);
          total += found;
        }
        if (!best || misses < best.misses || (misses === best.misses && total < best.total)) {
          best = { sign, amounts, misses, total };
        }
      }
      if (best) best.amounts.forEach((amount, k) => (need[i + k] = best.sign * amount));
      i = j;
    }
    // Smooth envelope over the needs (cosine falloff over the ramp), so the detour eases in / out and never
    // dips back between two needs; then add it where the shifted point still has ground under it.
    const add = new Array<number>(n).fill(0);
    for (let k = 1; k < n - 1; k += 1) {
      let pos = 0;
      let neg = 0;
      for (let d = -rampSamples; d <= rampSamples; d += 1) {
        const j = k + d;
        if (j <= 0 || j >= n - 1 || need[j] === 0) continue;
        const w = 0.5 + 0.5 * Math.cos((Math.PI * Math.abs(d)) / (rampSamples + 1));
        if (need[j] > 0) pos = Math.max(pos, need[j] * w);
        else neg = Math.min(neg, need[j] * w);
      }
      add[k] = Math.abs(neg) > pos ? neg : pos;
    }
    for (let k = 1; k < n - 1; k += 1) {
      if (Math.abs(add[k]) > 1e-4 && at(k, offsets[k] + add[k])) offsets[k] += add[k];
    }
  }
  for (let i = 1; i < n - 1; i += 1) {
    const p = at(i, offsets[i]);
    if (p) points[i].copy(p);
  }
}

/** Turning on the spot sweeps the real body (short front, long tail) through these offsets on one side. */
const TURN_HEADING_OFFSETS = [1, 2, 3, 4, 5].map((k) => (k * Math.PI) / 6);
const CAT_TURN_BODY_MIN = new THREE.Vector3(-0.1, 0.06, -0.28);
type TurnSides = { plus: boolean; minus: boolean };
const turnSidesCache = new WeakMap<JourneyPath, Map<number, TurnSides>>();
const turnRay = new THREE.Raycaster();

function routeHeadingAt(points: THREE.Vector3[], i: number) {
  const a = points[Math.max(0, i - 2)];
  const b = points[Math.min(points.length - 1, i + 2)];
  return Math.atan2(b.x - a.x, b.z - a.z);
}

/**
 * Which way the cat can turn around on route sample i without its body touching an obstacle: "plus" sweeps headings
 * route heading + 30..150 degrees, "minus" the other side (cached per route).
 */
function routeTurnSides(path: JourneyPath, i: number): TurnSides {
  const obstacles = path.obstacles;
  if (!obstacles) return { plus: true, minus: true };
  let cache = turnSidesCache.get(path);
  if (!cache) {
    cache = new Map();
    turnSidesCache.set(path, cache);
  }
  const known = cache.get(i);
  if (known) return known;
  const p = path.points[i];
  const heading = routeHeadingAt(path.points, i);
  const sideClear = (sign: number) =>
    TURN_HEADING_OFFSETS.every(
      (offset) => !routeBodyBlocked(p, heading + sign * offset, obstacles, turnRay, CAT_TURN_BODY_MIN)
    );
  const plus = sideClear(1);
  const sides = { plus, minus: sideClear(-1) };
  cache.set(i, sides);
  return sides;
}

function routeTurnClear(path: JourneyPath, i: number) {
  const sides = routeTurnSides(path, i);
  return sides.plus || sides.minus;
}

/** Route sample index nearest a route distance. */
function routeIndexAt(path: JourneyPath, distance: number) {
  const { cum } = path;
  let lo = 0;
  let hi = cum.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (cum[mid] <= distance) lo = mid;
    else hi = mid;
  }
  return distance - cum[lo] <= cum[hi] - distance ? lo : hi;
}

function totalLength(points: THREE.Vector3[]) {
  let len = 0;
  for (let i = 1; i < points.length; i += 1) len += points[i].distanceTo(points[i - 1]);
  return len;
}

/**
 * Guided journey state: route distance, and (once a milestone is picked in the dialog) the target distance the cat
 * runs to instead of following the timed journey. speed is signed (negative = back along the route).
 */
function freshJourney() {
  return {
    dist: 0,
    placed: false,
    target: null as number | null,
    targetIndex: -1,
    speed: 0,
    cruise: CAT_TARGET_CRUISE,
    /** Turn-around spot to brake to first when the target is behind a moving cat (null: go straight there). */
    via: null as number | null,
    /** Direction the cat last ran along the route (+1 forward, -1 back). */
    facing: 1,
    /** Forced turning direction while turning around (+1 / -1 heading sense, 0 = shortest way). */
    turnSide: 0,
  };
}

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

/**
 * Body "up" from the ground normal, limited so the cat stays upright: low-poly facets (walkable up to 60°) would
 * otherwise tilt it onto its side, and it kept that tilt when it stopped. Pitch follows slopes moderately, roll barely.
 */
function catBodyUp(normal: THREE.Vector3, heading: number) {
  const ny = normal.y;
  if (!Number.isFinite(ny) || ny < 1e-3) return new THREE.Vector3(0, 1, 0);
  const f = Math.sin(heading) * normal.x + Math.cos(heading) * normal.z;
  const l = Math.cos(heading) * normal.x - Math.sin(heading) * normal.z;
  const tf = Math.tan(THREE.MathUtils.clamp(Math.atan2(f, ny), -CAT_BODY_MAX_PITCH, CAT_BODY_MAX_PITCH));
  const tl = Math.tan(THREE.MathUtils.clamp(Math.atan2(l, ny), -CAT_BODY_MAX_ROLL, CAT_BODY_MAX_ROLL));
  return new THREE.Vector3(
    tf * Math.sin(heading) + tl * Math.cos(heading),
    1,
    tf * Math.cos(heading) - tl * Math.sin(heading)
  ).normalize();
}

// Orientation for the kinematic cat body: up = (smoothed, limited) surface normal, facing along heading.
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
    experienceMilestoneRequest,
    setExperienceCatMilestone,
    exploreMode,
    introPhase,
    introFrame,
    introReady,
  } = usePortfolioNav();
  const introActive = introPhase !== "idle" && !exploreMode && activeSection !== "credits";
  const catActive = activeSection === "credits" || exploreMode || introActive;
  const reducedMotion = useReducedMotion();
  const { scene: worldScene, gl, camera } = useThree();
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
  const catSitBonesRef = useRef<{ thighs: THREE.Bone[]; shins: THREE.Bone[]; feet: THREE.Bone[]; frontLegs: THREE.Bone[]; neck: THREE.Bone[] }>({
    thighs: [],
    shins: [],
    feet: [],
    frontLegs: [],
    neck: [],
  });
  // Sit weight and the offsets applied last frame (undone before the next mixer update).
  const catSitRef = useRef({ w: 0, applied: [] as { bone: THREE.Bone; axis: THREE.Vector3; angle: number }[] });
  // Last pose offsets added on top of the mixer output, so they can be undone before the next update.
  const catPoseOffsetRef = useRef({ body: 0, head: 0, tail: 0 });
  // Petting: reaction offsets (undone before each mixer update like the others) and the pooled hearts.
  const petRef = useRef(createPetState());
  const petBonesRef = useRef<PetBones>({ pelvis: null, spine: null, head: null, ears: [], tail: [] });
  const heartsGroupRef = useRef<THREE.Group | null>(null);
  const heartPoolRef = useRef<ReturnType<typeof createHeartPool> | null>(null);
  const catSpeedRef = useRef(0);
  // Paw vertex indices (front / back) of the skinned cat, and the grounding correction applied to the model.
  const catPawRef = useRef<{ mesh: THREE.SkinnedMesh | null; front: number[]; back: number[] }>({ mesh: null, front: [], back: [] });
  const catGroundRef = useRef({ y: 0, pitch: 0 });
  const catGroundGroupRef = useRef<THREE.Group | null>(null);
  const elapsedRef = useRef(0);
  const runningRef = useRef(false);
  const unlockedRef = useRef(0);
  const prevPosRef = useRef(new THREE.Vector3());
  // Guided journey: distance travelled along journeyPath, and whether the cat was put on the route start yet.
  const journeyRef = useRef(freshJourney());
  const handledMilestoneRequestRef = useRef(0);
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
  // Fishing: walk to the pier along FISHING_ROUTE, then sit facing the water (state machine in fishingStore).
  const fishWalkRef = useRef({
    active: false,
    route: [] as THREE.Vector3[],
    cum: [] as number[],
    s: 0,
    best: 0,
    stuckT: 0,
    carrot: new THREE.Vector3(),
    phase: "off" as FishingPhase,
  });
  // Intro (About) sequence state; `saved` restores the cat's previous spot/heading afterwards.
  const introRef = useRef({
    stage: "off" as "off" | "init" | "place" | "run" | "sit",
    t: 0,
    target: null as THREE.Vector3 | null,
    spot: null as { target: THREE.Vector3; camPos: THREE.Vector3; toCam: THREE.Vector3 } | null,
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
  // Walkable surfaces for explore mode / intro: path, rocks and the visible grass terrain (visible originals only).
  // The tagged "Object_231" is the island base below the ocean; the grass the cat should stand on is Object_232.
  const groundMeshes = useMemo(() => {
    const visible = wallMeshes.filter((mesh) => mesh.visible);
    if (visible.length === 0) return docMeshes;
    for (const name of WALKABLE_TERRAIN_NAMES) {
      worldScene.getObjectByName(name)?.traverse((child) => {
        const mesh = child as THREE.Mesh;
        if (mesh.isMesh && mesh.visible && !visible.includes(mesh)) visible.push(mesh);
      });
    }
    return visible;
  }, [wallMeshes, docMeshes, worldScene]);

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
    // Detour around rocks / trees / bushes and the milestone torches + pennant poles beside the path.
    const posts: RouteObstacles["posts"] = [];
    for (const stopItem of milestoneStops) {
      if (!stopItem.position) continue;
      const yaw = (() => {
        const t = tangentAt(pathPoints, stopItem.progress ?? 0);
        return Math.atan2(t.x, t.z);
      })();
      const torch = FIXED_TORCH_OFFSETS[Math.min(stopItem.idx, FIXED_TORCH_OFFSETS.length - 1)];
      for (const [offset, r] of [
        [torch, 0.08],
        [PENNANT_OFFSET, 0.05],
      ] as [[number, number, number], number][]) {
        const w = new THREE.Vector3(...offset).applyAxisAngle(WORLD_UP, yaw).add(stopItem.position);
        posts.push({ x: w.x, z: w.z, r });
      }
    }
    const walkMeshes = [...docMeshes, ...groundMeshes.filter((mesh) => !docMeshes.includes(mesh))];
    const cacheKey = `${points.length}:${points[0].toArray().map((v) => v.toFixed(3))}:${points[points.length - 1]
      .toArray()
      .map((v) => v.toFixed(3))}:${milestoneStops.length}`;
    let sceneCache = detouredRouteCache.get(worldScene);
    if (!sceneCache) {
      sceneCache = new Map();
      detouredRouteCache.set(worldScene, sceneCache);
    }
    const cached = sceneCache.get(cacheKey);
    const obstacles: RouteObstacles = { ...collectRouteObstacles(points, worldScene), posts };
    if (cached) {
      cached.forEach((p, i) => points[i].copy(p));
    } else if (walkMeshes.length > 0) {
      detourRoute(points, obstacles, walkMeshes, resolveWaterLevel(worldScene));
      sceneCache.set(cacheKey, points.map((p) => p.clone()));
    }
    const cum = [0];
    for (let i = 1; i < points.length; i += 1) cum.push(cum[i - 1] + points[i].distanceTo(points[i - 1]));
    return { points, cum, length: cum[cum.length - 1], stop, obstacles };
  }, [pathPoints, targetJourneyProgress, milestoneStops, docMeshes, groundMeshes, worldScene]);
  // Route distance of each milestone (by milestone index): the route's closest point to its flag; the last one is
  // the journey's end stop beside its flag.
  const milestoneDists = useMemo(() => {
    const dists = new Map<number, number>();
    const { points, cum, length } = journeyPath;
    if (points.length < 2) return dists;
    milestoneStops.forEach((stopItem, k) => {
      if (!stopItem.position) return;
      if (k === milestoneStops.length - 1) {
        // The journey's end stop beside the last flag, or the nearest spot before it with room to turn around.
        let i = points.length - 1;
        while (i > 0 && cum[points.length - 1] - cum[i] < MILESTONE_STOP_WINDOW && !routeTurnClear(journeyPath, i)) i -= 1;
        dists.set(stopItem.idx, routeTurnClear(journeyPath, i) ? cum[i] : length);
        return;
      }
      const unlockDist =
        targetJourneyProgress > 0 ? Math.min(length, ((stopItem.progress ?? 1) / targetJourneyProgress) * length) : length;
      // Closest route spot to the flag where the cat can also turn around (it may leave in either direction).
      const candidates: { i: number; gap: number }[] = [];
      for (let i = 0; i < points.length; i += 1) {
        if (Math.abs(cum[i] - unlockDist) > MILESTONE_STOP_WINDOW) continue;
        candidates.push({ i, gap: Math.hypot(points[i].x - stopItem.position.x, points[i].z - stopItem.position.z) });
      }
      candidates.sort((a, b) => a.gap - b.gap);
      const best = candidates.find((c) => routeTurnClear(journeyPath, c.i)) ?? candidates[0];
      dists.set(stopItem.idx, best ? cum[best.i] : unlockDist);
    });
    return dists;
  }, [journeyPath, milestoneStops, targetJourneyProgress]);

  // A milestone picked in the Experience dialog: run there along the same route (replaces the timed journey).
  useEffect(() => {
    if (!experienceMilestoneRequest || experienceMilestoneRequest.seq === handledMilestoneRequestRef.current) return;
    if (activeSection !== "credits" || exploreMode) return;
    const target = milestoneDists.get(experienceMilestoneRequest.index);
    if (target === undefined) return;
    handledMilestoneRequestRef.current = experienceMilestoneRequest.seq;
    const journey = journeyRef.current;
    if (journey.target === null) journey.speed = catSpeedRef.current; // keep the timed journey's pace (forward)
    journey.target = target;
    journey.targetIndex = experienceMilestoneRequest.index;
    journey.cruise =
      Math.abs(target - journey.dist) > CAT_TARGET_FAR_DISTANCE ? CAT_TARGET_FAR_CRUISE : CAT_TARGET_CRUISE;
    journey.via = null;
    if (journeyPath.points.length > 1 && Math.sign(target - journey.dist) === -journey.facing) {
      // Target is behind: turn around only where the body has room (first such spot past the braking distance).
      const here = routeIndexAt(journeyPath, journey.dist);
      const atRest = Math.abs(journey.speed) < 0.05 && Math.abs(journeyPath.cum[here] - journey.dist) < 0.03;
      if (!(atRest && routeTurnClear(journeyPath, here))) {
        const brakeDist = (journey.speed * journey.speed) / (2 * CAT_TARGET_BRAKE_LIMIT);
        const from = routeIndexAt(journeyPath, journey.dist + journey.facing * brakeDist);
        for (let k = 0; k <= TURN_SEARCH_SAMPLES; k += 1) {
          const i = from + journey.facing * k;
          if (i < 0 || i >= journeyPath.points.length) break;
          if ((journeyPath.cum[i] - journey.dist) * journey.facing < brakeDist - 1e-3) continue;
          if (routeTurnClear(journeyPath, i)) {
            journey.via = journeyPath.cum[i];
            break;
          }
        }
      }
    }
    const alreadyThere = journey.placed && Math.abs(target - journey.dist) <= CAT_TARGET_ARRIVE_DISTANCE;
    if (!alreadyThere) runningRef.current = true;
    setExperienceCatMilestone(
      alreadyThere ? { at: journey.targetIndex, heading: null } : { at: -1, heading: journey.targetIndex }
    );
  }, [experienceMilestoneRequest, activeSection, exploreMode, milestoneDists, journeyPath, setExperienceCatMilestone]);
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
    petBonesRef.current = findPetBones(catModel, tailBones);
    {
      const sit = { thighs: [] as THREE.Bone[], shins: [] as THREE.Bone[], feet: [] as THREE.Bone[], frontLegs: [] as THREE.Bone[], neck: [] as THREE.Bone[] };
      catModel.traverse((child) => {
        if (!(child instanceof THREE.Bone)) return;
        const n = child.name;
        if (/^leg_back_(left|right)_1_/.test(n)) sit.thighs.push(child);
        else if (/^leg_back_(left|right)_2_/.test(n)) sit.shins.push(child);
        else if (/^leg_back_(left|right)_3_/.test(n)) sit.feet.push(child);
        else if (/^leg_front_(left|right)_1_/.test(n)) sit.frontLegs.push(child);
        else if (/^neck_/.test(n)) sit.neck.push(child);
      });
      catSitBonesRef.current = sit;
    }

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
      catSitRef.current = { w: 0, applied: [] };
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
    // The RigidBody may mount in this same commit (ref still null): the first journey frame places the cat then.
    journeyRef.current = freshJourney();
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
    exitFishing();
    setFishingNear(false);
    fishWalkRef.current.active = false;
    // Sentinel: forces the prompt state to resync on the first explore frame next time.
    ex.near = -2;
    ex.keys = { f: 0, b: 0, l: 0, r: 0 };
  }, [exploreMode]);

  // A dialog / the About intro takes over the cat: stop fishing.
  useEffect(() => {
    if (activeSection || introPhase !== "idle") exitFishing();
  }, [activeSection, introPhase]);

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
    intro.spot = null;
    intro.target = null;
    intro.wag = 0;
    if (catGroundGroupRef.current) catGroundGroupRef.current.visible = true;
    const ex = exploreRef.current;
    ex.moveTarget = null;
    ex.speed = 0;
    catSpeedRef.current = 0;
  }, [introActive]);

  const openMilestone = useCallback(
    (idx: number) => {
      // Reuse the existing Experience panel: unlock up to this milestone and open the section.
      markMilestoneDiscovered(idx);
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
    const group = heartsGroupRef.current;
    if (!catActive || !group) return;
    const pool = createHeartPool(group);
    heartPoolRef.current = pool;
    return () => {
      pool.dispose();
      heartPoolRef.current = null;
    };
  }, [catActive]);

  // Pet the cat: tap / click on it (pointer cursor on hover). Picked with an invisible sphere around the cat;
  // a press on the cat is consumed here (capture phase) so explore tap-to-move, camera drag and the panel's
  // click-outside close never see it.
  useEffect(() => {
    if (!catActive) return;
    const el = gl.domElement;
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const sphere = new THREE.Sphere();
    const center = new THREE.Vector3();
    const hitsCat = (clientX: number, clientY: number) => {
      const group = catGroundGroupRef.current;
      for (let o: THREE.Object3D | null = group; o; o = o.parent) if (!o.visible) return false;
      if (!group) return false;
      group.getWorldPosition(center);
      center.y += PET_PROXY_LIFT;
      sphere.set(center, PET_PROXY_RADIUS);
      const rect = el.getBoundingClientRect();
      ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      return ray.ray.intersectsSphere(sphere);
    };
    const pet = () => {
      const state = petRef.current;
      const now = performance.now();
      if (now - state.lastAt < PET_COOLDOWN_MS) return;
      state.lastAt = now;
      const count = notifyCatPetted();
      startPet(state, {
        idle: catSpeedRef.current < 0.05,
        cuddle: count % PET_CUDDLE_EVERY === 0,
        reducedMotion,
      });
      const head = petBonesRef.current.head;
      const at = new THREE.Vector3();
      if (head) head.getWorldPosition(at);
      else catGroundGroupRef.current?.getWorldPosition(at).setY(at.y + 0.3);
      at.y += 0.08;
      heartPoolRef.current?.spawn(at, reducedMotion ? 3 : 3 + Math.floor(Math.random() * 4));
      playMeow();
    };
    let press: { id: number; x: number; y: number; at: number } | null = null;
    let hovering = false;
    const setHover = (on: boolean) => {
      if (on === hovering) return;
      hovering = on;
      el.style.cursor = on ? "pointer" : "";
    };
    const onDown = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      if (!hitsCat(e.clientX, e.clientY)) return;
      // Also suppresses the compatibility mousedown (the open panel would close on an outside click).
      e.preventDefault();
      e.stopImmediatePropagation();
      press = { id: e.pointerId, x: e.clientX, y: e.clientY, at: performance.now() };
    };
    const onUp = (e: PointerEvent) => {
      if (!press || e.pointerId !== press.id) return;
      const tap =
        e.type === "pointerup" &&
        Math.hypot(e.clientX - press.x, e.clientY - press.y) < 12 &&
        performance.now() - press.at < 700;
      press = null;
      if (tap) pet();
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || e.buttons !== 0) return;
      setHover(hitsCat(e.clientX, e.clientY));
    };
    const onLeave = () => setHover(false);
    el.addEventListener("pointerdown", onDown, { capture: true });
    window.addEventListener("pointerup", onUp, { capture: true });
    window.addEventListener("pointercancel", onUp, { capture: true });
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      el.removeEventListener("pointerdown", onDown, { capture: true });
      window.removeEventListener("pointerup", onUp, { capture: true });
      window.removeEventListener("pointercancel", onUp, { capture: true });
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      if (hovering) el.style.cursor = "";
    };
  }, [catActive, gl, camera, reducedMotion]);

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
    const maxPitch = THREE.MathUtils.lerp(CAT_GROUND_MAX_PITCH, CAT_SIT_MAX_PITCH, catSitRef.current.w);
    g.pitch = THREE.MathUtils.clamp(g.pitch, -maxPitch, maxPitch);
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
    const up = catBodyUp(surfaceNormalRef.current, headingRef.current).addScaledVector(leanVec, leanAmount).normalize();
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
      if (near >= 0 && exploreMode) markMilestoneDiscovered(near);
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

  // Shared helpers for the intro spot search: everything visible that can cover / hide the cat.
  const introScene = () => {
    const occluders = worldScene.children.filter(
      (child) =>
        child.name !== "experience-milestone-trail" && child.name !== "weather-effects" && child.name !== "project-bird-flock"
    );
    const ray = new THREE.Raycaster();
    const dir = new THREE.Vector3();
    const origin = new THREE.Vector3();
    const walkable = new Set<THREE.Object3D>(groundMeshes);
    const firstOpaque = (hits: THREE.Intersection[]) =>
      hits.find((h) => {
        const m = h.object as THREE.Mesh;
        if (!m.visible) return false;
        const mat = m.material as (THREE.Material & { uniforms?: Record<string, unknown> }) | undefined;
        // The ocean counts as a surface (it hides whatever is below it) even if its material is transparent.
        return Boolean(mat?.uniforms?.mirrorSampler) || !mat?.transparent;
      });
    /** Camera (or any point) can see `point` (+ look height) without trees / rocks / terrain in between. */
    const seen = (from: THREE.Vector3, point: THREE.Vector3) => {
      dir.set(point.x, point.y + INTRO_LOOK_HEIGHT, point.z).sub(from);
      const dist = dir.length();
      ray.set(from, dir.normalize());
      ray.far = Math.max(0.1, dist - 0.2);
      return !firstOpaque(ray.intersectObjects(occluders, true));
    };
    /**
     * The walkable hit at (x, z) is really the top visible surface: nothing (visible ground that is not a collider,
     * the ocean, a canopy) lies above it. Rejects spots under the shoreline water or inside the visible terrain.
     */
    const onTop = (point: THREE.Vector3) => {
      ray.set(origin.set(point.x, point.y + 25, point.z), WORLD_DOWN);
      ray.far = 25.4;
      const top = firstOpaque(ray.intersectObjects(occluders, true));
      return Boolean(top && walkable.has(top.object) && Math.abs(top.point.y - point.y) < 0.06);
    };
    return { occluders, ray, firstOpaque, seen, onTop, walkable };
  };

  /** Spot is on land: walkable, clearly above the ocean, inside the island and the top visible surface. */
  const introSpotOk = (point: THREE.Vector3, tools: ReturnType<typeof introScene>) =>
    point.y > waterLevelRef.current + INTRO_MIN_ABOVE_WATER && Math.hypot(point.x, point.z) < INTRO_MAX_RADIUS && tools.onTop(point);

  // Frame 1: pick a spot on land in the current view and start the camera right away.
  const introPickSpot = () => {
    if (groundMeshes.length === 0) return null;
    const water = resolveWaterLevel(worldScene);
    waterLevelRef.current = water;
    const tools = introScene();
    const ndc = new THREE.Vector2();
    const normal = new THREE.Vector3();
    const camRay = new THREE.Raycaster();
    let target: THREE.Vector3 | null = null;
    for (const [x, y] of INTRO_SCREEN_SAMPLES) {
      ndc.set(x, y);
      camRay.setFromCamera(ndc, camera);
      camRay.far = 90;
      // First visible surface along the view ray must be walkable island terrain (not water, not decoration).
      const hit = tools.firstOpaque(camRay.intersectObjects(tools.occluders, true));
      if (!hit || !tools.walkable.has(hit.object)) continue;
      if (hit.face) {
        normal.copy(hit.face.normal).transformDirection(hit.object.matrixWorld);
        if (Math.abs(normal.y) < 0.8) continue;
      }
      const ground = probeWalkable(hit.point.x, hit.point.z, hit.point.y + 0.05);
      if (ground && introSpotOk(ground.point, tools)) {
        target = ground.point.clone();
        break;
      }
    }
    if (!target) return null;

    const toCam = new THREE.Vector3(camera.position.x - target.x, 0, camera.position.z - target.z);
    if (toCam.lengthSq() < 1e-6) toCam.set(0, 0, 1);
    toCam.normalize();
    const look = target.clone().addScaledVector(WORLD_UP, INTRO_LOOK_HEIGHT);
    let camPos: THREE.Vector3 | null = null;
    const tryDir = new THREE.Vector3();
    const ray = raycasterRef.current;
    for (const lift of [1.0, 1.6]) {
      for (const da of [0, 0.4, -0.4, 0.8, -0.8, 1.2, -1.2]) {
        tryDir.copy(toCam).applyAxisAngle(WORLD_UP, da);
        const c = target.clone().addScaledVector(tryDir, INTRO_CAM_DIST).addScaledVector(WORLD_UP, lift);
        ray.set(new THREE.Vector3(c.x, c.y + 20, c.z), WORLD_DOWN);
        ray.far = 40;
        const under = ray.intersectObjects(groundMeshes, false)[0];
        if (under && under.point.y > c.y - 0.4) continue;
        if (c.y < water + 0.5) continue;
        if (!tools.seen(c, target)) continue;
        camPos = c;
        break;
      }
      if (camPos) break;
    }
    if (!camPos) camPos = target.clone().addScaledVector(toCam, INTRO_CAM_DIST).addScaledVector(WORLD_UP, 2.2);
    introFrame(camPos, look);
    return { target, camPos, toCam };
  };

  // Frame 2: a start point the cat runs in from (whole run on land and visible), then place the cat there.
  const introPlaceCat = (spot: { target: THREE.Vector3; camPos: THREE.Vector3; toCam: THREE.Vector3 }) => {
    const body = catBodyRef.current;
    if (!body) return false;
    const { target, camPos, toCam } = spot;
    const tools = introScene();
    const side = new THREE.Vector3(toCam.z, 0, -toCam.x);
    const away = toCam.clone().negate();
    const dirs = [
      side.clone().multiplyScalar(0.85).addScaledVector(away, 0.5).normalize(),
      side.clone().multiplyScalar(-0.85).addScaledVector(away, 0.5).normalize(),
      side.clone(),
      side.clone().negate(),
      away.clone(),
    ];
    const runOnLand = (from: THREE.Vector3, dir: THREE.Vector3, dist: number) => {
      const end = walkableLine(from, dir, dist);
      if (!end) return null;
      // Every ~0.25 along the run: on land and the top visible surface (no wading through shallow water).
      const probe = new THREE.Vector3();
      for (let d = 0.25; d < dist; d += 0.25) {
        const hit = probeWalkable(from.x + dir.x * d, from.z + dir.z * d, from.y + (end.y - from.y) * (d / dist));
        if (!hit) return null;
        probe.copy(hit.point);
        if (!introSpotOk(probe, tools)) return null;
      }
      return introSpotOk(end, tools) ? end : null;
    };
    let spawn: THREE.Vector3 | null = null;
    let hiddenSpawn: THREE.Vector3 | null = null;
    for (const dist of reducedMotion ? INTRO_RUN_DISTANCES_REDUCED : INTRO_RUN_DISTANCES) {
      for (const dir of dirs) {
        const p = runOnLand(target, dir, dist);
        if (!p) continue;
        if (tools.seen(camPos, p) && tools.seen(camPos, p.clone().lerp(target, 0.5))) {
          spawn = p;
          break;
        }
        if (!hiddenSpawn) hiddenSpawn = p;
      }
      if (spawn) break;
    }
    if (!spawn) spawn = hiddenSpawn;
    const start = spawn ?? target.clone();
    const pos = catPosRef.current;
    // Feet on the terrain hit (same offset the explore / journey modes use).
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
    // The run starts shortly after (see introStep) while the camera is still closing in.
    ex.moveTarget = null;
    introRef.current.target = spawn ? target.clone() : null;
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
    return true;
  };

  const introStep = (delta: number) => {
    const intro = introRef.current;
    intro.t += delta;
    const group = catGroundGroupRef.current;
    if (intro.stage === "init") {
      // Keep the cat hidden until it stands on its start spot (no flash at its old / default position).
      if (group) group.visible = false;
      const spot = introPickSpot();
      if (spot) {
        intro.spot = spot;
        intro.stage = "place";
      } else if (intro.t > INTRO_INIT_TIMEOUT) {
        // No usable spot in view: just open the dialog.
        intro.stage = "sit";
        intro.ready = true;
        introReady();
      }
      return;
    }
    if (intro.stage === "place") {
      if (!intro.spot || !introPlaceCat(intro.spot)) {
        if (intro.t > INTRO_INIT_TIMEOUT) {
          intro.stage = "sit";
          intro.ready = true;
          introReady();
        }
        return;
      }
      intro.spot = null;
      intro.placed = true;
      intro.stage = "run";
      intro.t = 0;
      if (group) group.visible = true;
      return;
    }
    if (!intro.placed) return;
    const ex = exploreRef.current;
    if (intro.stage === "run") {
      const delay = reducedMotion ? INTRO_RUN_DELAY_REDUCED : INTRO_RUN_DELAY;
      if (intro.target && intro.t >= delay) {
        ex.moveTarget = intro.target;
        intro.target = null;
      }
      exploreStep(delta);
      if ((!intro.target && !ex.moveTarget && ex.speed < 0.05 && intro.t >= delay) || intro.t > INTRO_RUN_TIMEOUT) {
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
    if (!intro.ready && intro.t > (reducedMotion ? INTRO_SIT_SECONDS_REDUCED : INTRO_SIT_SECONDS)) {
      intro.ready = true;
      introReady();
    }
  };

  // Explore mode + About: the cat stops where it is, turns to the camera and wags, then the dialog opens.
  const exploreIntroStep = (delta: number) => {
    const intro = introRef.current;
    if (intro.stage !== "sit") {
      intro.stage = "sit";
      intro.t = 0;
      intro.ready = false;
    }
    intro.t += delta;
    const ex = exploreRef.current;
    const keys = ex.keys;
    ex.keys = { f: 0, b: 0, l: 0, r: 0 };
    ex.moveTarget = null;
    const pos = catPosRef.current;
    const facing = Math.atan2(camera.position.x - pos.x, camera.position.z - pos.z) + 0.45;
    headingRef.current += wrapAngle(facing - headingRef.current) * (1 - Math.exp(-4 * delta));
    exploreStep(delta);
    ex.keys = keys;
    if (!intro.ready && intro.t > (reducedMotion ? INTRO_SIT_SECONDS_REDUCED : INTRO_EXPLORE_SIT_SECONDS)) {
      intro.ready = true;
      introReady();
    }
  };

  // Fishing walk: regular explore movement (walkability probe, sliding, turn slow-down) chasing a carrot that
  // runs along the A* pier route from the waypoint nearest the cat. WASD cancels; no progress -> give up.
  const fishingWalkStep = (delta: number) => {
    const ex = exploreRef.current;
    if (ex.needsInit && !initExploreCat()) return;
    const f = fishWalkRef.current;
    const pos = catPosRef.current;
    const k = ex.keys;
    if (k.f || k.b || k.l || k.r) {
      exitFishing();
      return;
    }
    if (!f.active) {
      let best = 0;
      let bestCost = Infinity;
      let remaining = 0;
      for (let i = FISHING_ROUTE.length - 1; i >= 0; i -= 1) {
        if (i < FISHING_ROUTE.length - 1) remaining += FISHING_ROUTE[i].distanceTo(FISHING_ROUTE[i + 1]);
        const p = FISHING_ROUTE[i];
        const cost = Math.hypot(p.x - pos.x, p.z - pos.z) * FISHING_STRAIGHT_COST + remaining;
        if (cost < bestCost) {
          bestCost = cost;
          best = i;
        }
      }
      let route = FISHING_ROUTE.slice(best);
      // From along the milestone path: run back along the (obstacle-free) journey route to its start, where
      // the pier route begins, when that is cheaper than walking straight to a pier-route waypoint.
      const pierLength = remaining;
      const jp = journeyPath.points;
      for (let k = 0; k < jp.length; k += 1) {
        const cost = Math.hypot(jp[k].x - pos.x, jp[k].z - pos.z) * FISHING_STRAIGHT_COST + journeyPath.cum[k] + pierLength;
        if (cost < bestCost) {
          bestCost = cost;
          route = [...jp.slice(0, k + 1).reverse(), ...FISHING_ROUTE];
        }
      }
      f.route = [pos.clone(), ...route];
      f.cum = [0];
      for (let i = 1; i < f.route.length; i += 1) f.cum.push(f.cum[i - 1] + f.route[i - 1].distanceTo(f.route[i]));
      f.s = 0;
      f.best = 0;
      f.stuckT = 0;
      f.active = true;
    }
    // Progress = projection of the cat onto the route (forward only, near the current position along it).
    const total = f.cum[f.cum.length - 1];
    let proj = f.s;
    let projDist = Infinity;
    for (let i = 0; i < f.route.length - 1; i += 1) {
      if (f.cum[i + 1] < f.s - 0.3 || f.cum[i] > f.s + 1.2) continue;
      const a = f.route[i];
      const b = f.route[i + 1];
      const abx = b.x - a.x;
      const abz = b.z - a.z;
      const len2 = abx * abx + abz * abz;
      const u = len2 > 1e-9 ? THREE.MathUtils.clamp(((pos.x - a.x) * abx + (pos.z - a.z) * abz) / len2, 0, 1) : 0;
      const d = Math.hypot(a.x + abx * u - pos.x, a.z + abz * u - pos.z);
      if (d < projDist) {
        projDist = d;
        proj = f.cum[i] + (f.cum[i + 1] - f.cum[i]) * u;
      }
    }
    f.s = Math.max(f.s, proj);
    const cs = Math.min(total, f.s + FISHING_CARROT);
    let seg = 0;
    while (seg < f.route.length - 2 && f.cum[seg + 1] < cs) seg += 1;
    const segLen = f.cum[seg + 1] - f.cum[seg];
    f.carrot.lerpVectors(f.route[seg], f.route[seg + 1], segLen > 1e-9 ? (cs - f.cum[seg]) / segLen : 1);
    ex.moveTarget = f.carrot;
    exploreRuntime.followHeading = true;
    exploreStep(delta);
    if (markerRef.current) markerRef.current.visible = false;
    if (f.s > f.best + 0.05) {
      f.best = f.s;
      f.stuckT = 0;
    } else {
      f.stuckT += delta;
    }
    if (Math.hypot(FISHING_SEAT.x - pos.x, FISHING_SEAT.z - pos.z) < 0.1 && ex.speed < 0.08) {
      f.active = false;
      ex.moveTarget = null;
      fishingArrived();
    } else if (f.stuckT > FISHING_STUCK_SECONDS) {
      f.active = false;
      ex.moveTarget = null;
      fishingUnreachable();
    }
  };

  // Fishing (seated): turn to the water and stay put (exploreStep keeps it grounded); WASD stands up and leaves.
  const fishingSeatStep = (delta: number) => {
    const ex = exploreRef.current;
    const k = ex.keys;
    if (k.f || k.b || k.l || k.r) {
      exitFishing();
      return;
    }
    ex.moveTarget = null;
    headingRef.current += wrapAngle(FISHING_HEADING - headingRef.current) * (1 - Math.exp(-4 * delta));
    exploreStep(delta);
  };

  useFrame((_, delta) => {
    if (mixerRef.current && catActive) {
      // AnimationMixer skips writing tracks whose value did not change (e.g. constant idle channels),
      // so undo last frame's additive offsets first; otherwise they accumulate and the cat tumbles.
      const offset = catPoseOffsetRef.current;
      // Undo in reverse order of application: pet, sit, tail, head, body.
      const pet = petRef.current;
      undoPetPose(pet);
      const sit = catSitRef.current;
      for (let k = sit.applied.length - 1; k >= 0; k -= 1) {
        const a = sit.applied[k];
        a.bone.rotateOnAxis(a.axis, -a.angle);
      }
      sit.applied = [];
      for (const tailBone of catTailBoneRefs.current) tailBone.rotateOnAxis(TAIL_WAG_AXIS, -offset.tail);
      for (const headBone of catHeadBoneRefs.current) headBone.rotateX(-offset.head);
      for (const bodyBone of catBodyBoneRefs.current) bodyBone.rotateX(-offset.body);
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
      const fishSeated = exploreMode && introPhase === "idle" && isFishingSeated(getFishingState().phase);
      const wagTarget = ((introActive || (exploreMode && introPhase !== "idle")) && intro.stage === "sit") || fishSeated ? 1 : 0;
      intro.wag += (wagTarget - intro.wag) * (1 - Math.exp(-3 * delta));
      intro.wagTime += delta;
      offset.tail = intro.wag > 0.001 ? Math.sin(intro.wagTime * TAIL_WAG_SPEED) * TAIL_WAG_AMPLITUDE * intro.wag : 0;
      for (const tailBone of catTailBoneRefs.current) tailBone.rotateOnAxis(TAIL_WAG_AXIS, offset.tail);
      // Sit pose while the intro cat rests (eased; only once it has stopped running).
      sit.w += ((wagTarget > 0 ? 1 - walkWeight : 0) - sit.w) * (1 - Math.exp(-(wagTarget > 0 ? 5 : 8) * delta));
      if (sit.w > 0.002 && catGroundGroupRef.current) {
        catGroundGroupRef.current.updateMatrixWorld(true);
        const h = headingRef.current;
        const lateral = new THREE.Vector3(Math.cos(h), 0, -Math.sin(h));
        const q = new THREE.Quaternion();
        const bones = catSitBonesRef.current;
        const plan: [THREE.Bone[], number][] = [
          [bones.thighs, CAT_SIT_THIGH],
          [bones.shins, CAT_SIT_SHIN],
          [bones.feet, CAT_SIT_FOOT],
          // Body pitch comes from the grounding group (rotation.x > 0 lifts the head): keep front legs vertical.
          [bones.frontLegs, catGroundRef.current.pitch],
          [bones.neck, catGroundRef.current.pitch * CAT_SIT_NECK_COUNTER],
        ];
        // Every rotation is about the same world axis, so axes computed from the unposed bones stay valid.
        const axes = plan.map(([list]) => list.map((bone) => lateral.clone().applyQuaternion(bone.getWorldQuaternion(q).invert()).normalize()));
        plan.forEach(([list, angle], pi) => {
          list.forEach((bone, bi) => {
            const a = angle * sit.w;
            bone.rotateOnAxis(axes[pi][bi], a);
            sit.applied.push({ bone, axis: axes[pi][bi], angle: a });
          });
        });
      }
      // Pet reaction on top (head tilt, ears, tail; idle cuddle wiggle). Bone offsets only: no movement change.
      if (pet.t < 1 || pet.cuddleT < 2) {
        catGroundGroupRef.current?.updateMatrixWorld(true);
        applyPetPose(pet, petBonesRef.current, delta, {
          heading: headingRef.current,
          runWeight: walkWeight,
          reducedMotion,
          tailAxis: TAIL_WAG_AXIS,
        });
      }
      groundPaws(walkWeight, delta);
    }
    heartPoolRef.current?.update(Math.min(delta, 0.1));
    if (exploreMode) {
      if (catGroundGroupRef.current && !catGroundGroupRef.current.visible) catGroundGroupRef.current.visible = true;
      if (introPhase !== "idle") {
        exploreIntroStep(Math.min(delta, 0.1));
      } else {
        if (introRef.current.stage !== "off" && !introActive) introRef.current.stage = "off";
        const dt = Math.min(delta, 0.1);
        const f = fishWalkRef.current;
        const fishPhase = getFishingState().phase;
        if (fishPhase !== f.phase) {
          // Leaving fishing (Esc / close / WASD): stand up where it is and resume normal explore control.
          if (fishPhase === "off" || f.phase === "walking") {
            f.active = false;
            exploreRef.current.moveTarget = null;
            exploreRuntime.followHeading = false;
          }
          f.phase = fishPhase;
        }
        if (fishPhase === "walking") fishingWalkStep(dt);
        else if (fishPhase !== "off") fishingSeatStep(dt);
        else {
          exploreStep(dt);
          const pos = catPosRef.current;
          const nearPier =
            Math.hypot(PIER_ENTRY.x - pos.x, PIER_ENTRY.z - pos.z) < FISHING_PROMPT_RADIUS && Math.abs(PIER_ENTRY.y - pos.y) < 1;
          setFishingNear(nearPier);
          if (nearPier) markPierDiscovered();
          // Explore HUD compass: nearest undiscovered milestone / pier, as an on-screen direction.
          updateExplorePoi(camera, (camera as THREE.PerspectiveCamera).aspect || 1, pos, milestoneStops, PIER_ENTRY);
        }
        if (fishPhase !== "off") markPierDiscovered();
      }
      return;
    }
    if (introActive) {
      introStep(Math.min(delta, 0.1));
      return;
    }
    if (activeSection !== "credits") {
      journeyRef.current.placed = false;
      return;
    }
    // Hidden until the journey puts it on the route start (the first frames run before the reset effect).
    if (!journeyRef.current.placed && catGroundGroupRef.current) catGroundGroupRef.current.visible = false;
    if (!runningRef.current) return;
    if (pathPoints.length < 2) return;

    // Clamp dt: after a hitch the cat catches up gradually instead of jumping along the route.
    const dt = Math.min(delta, CAT_GUIDED_MAX_DT);
    elapsedRef.current += dt;
    const profile = journeyProfile(journeyPath.length, elapsedRef.current - CAT_START_DELAY_SECONDS);
    const journey = journeyRef.current;
    const body = catBodyRef.current;
    const catGroup = catGroundGroupRef.current;
    // Shown from the frame after it was placed (the physics body syncs the mesh one step later).
    if (journey.placed && catGroup && !catGroup.visible) catGroup.visible = true;
    if (!journey.placed) {
      // Hidden until it stands on the route start (no flash / jump from its previous position).
      if (catGroup) catGroup.visible = false;
      if (body && journeyPath.points.length > 0) {
        const start = journeyPath.points[0];
        body.setTranslation({ x: start.x, y: start.y, z: start.z }, true);
        body.setNextKinematicTranslation({ x: start.x, y: start.y, z: start.z });
        catPosRef.current.copy(start);
        journey.placed = true;
        journey.dist = 0;
      }
    }
    // Follow the route by arc length: the cat moves along it at a capped speed toward the profile's distance,
    // or (milestone picked in the dialog) accelerates / brakes toward the target distance in either direction.
    const prevDist = journey.dist;
    let arrived = false;
    let turnHeading: number | null = null;
    if (journey.target === null) {
      journey.dist = Math.max(prevDist, Math.min(profile.distance, prevDist + CAT_GUIDED_MAX_SPEED * dt));
    } else {
      const goal = journey.via ?? journey.target;
      const remaining = goal - prevDist;
      const brake = Math.sqrt(2 * CAT_TARGET_DECEL * Math.abs(remaining));
      // Face the way it is going before running: turn on the spot while the heading is far off (no sideways slide).
      const travelDir = Math.sign(remaining) || journey.facing;
      const look = samplePolyline(
        journeyPath,
        THREE.MathUtils.clamp(prevDist + travelDir * CAT_LOOKAHEAD, 0, journeyPath.length)
      ).sub(catPosRef.current);
      if (Math.hypot(look.x, look.z) > 0.01) turnHeading = Math.atan2(look.x, look.z);
      const align = turnHeading === null ? 1 : Math.cos(wrapAngle(turnHeading - headingRef.current));
      if (turnHeading !== null && align < 0 && journey.turnSide === 0) {
        // Turning around: pick the side the body has room to sweep (facing back swaps which side is which).
        const sides = routeTurnSides(journeyPath, routeIndexAt(journeyPath, prevDist));
        const okPlus = journey.facing > 0 ? sides.plus : sides.minus;
        const okMinus = journey.facing > 0 ? sides.minus : sides.plus;
        const shortest = Math.sign(wrapAngle(turnHeading - headingRef.current)) || 1;
        const shortestOk = shortest > 0 ? okPlus : okMinus;
        const otherOk = shortest > 0 ? okMinus : okPlus;
        journey.turnSide = shortestOk ? shortest : otherOk ? -shortest : 0;
      } else if (align > 0.9) {
        journey.turnSide = 0;
      }
      const desired =
        Math.sign(remaining) * Math.min(journey.cruise, brake) * smoothstep01((align - TURN_ALIGN_MIN) / TURN_ALIGN_RANGE);
      const speedingUp = Math.abs(desired) > Math.abs(journey.speed) && desired * journey.speed >= 0;
      const rate = (speedingUp ? CAT_TARGET_ACCEL : CAT_TARGET_BRAKE_LIMIT) * dt;
      journey.speed += THREE.MathUtils.clamp(desired - journey.speed, -rate, rate);
      let next = prevDist + journey.speed * dt;
      const reachesTarget = (goal - next) * remaining <= 0 && journey.speed * remaining > 0;
      if (reachesTarget || (Math.abs(goal - next) <= CAT_TARGET_ARRIVE_DISTANCE && Math.abs(journey.speed) < 0.08)) {
        next = goal;
        journey.speed = 0;
        if (journey.via !== null) journey.via = null; // at the turn-around spot: now head for the target
        else arrived = true;
      }
      journey.dist = THREE.MathUtils.clamp(next, 0, journeyPath.length);
      if (journey.dist !== next) journey.speed = 0;
    }
    const routeSpeed = dt > 0 ? (journey.dist - prevDist) / dt : 0;
    if (Math.abs(routeSpeed) > 0.02) journey.facing = routeSpeed < 0 ? -1 : 1;
    const moveDir = journey.facing;
    catSpeedRef.current = Math.abs(routeSpeed);
    const targetPos = samplePolyline(journeyPath, journey.dist);
    const aheadPos = samplePolyline(
      journeyPath,
      THREE.MathUtils.clamp(journey.dist + moveDir * CAT_LOOKAHEAD, 0, journeyPath.length)
    );
    const progress = targetJourneyProgress * (journeyPath.length > 0 ? journey.dist / journeyPath.length : 1);
    const pos = targetPos;
    const tangent = aheadPos.clone().sub(targetPos);
    if (tangent.lengthSq() > 1e-8) tangent.normalize();
    else tangent.copy(tangentAt(pathPoints, progress));
    if (body && journey.placed) {
      // The route is precomputed on the path (kept clear of rocks / cliffs): follow it exactly and snap to the
      // path surface. No per-frame collision clamp here: it stalled the cat against slopes / corners while the
      // route kept advancing, and the later catch-up looked like a teleport.
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
            // The path mesh is double-sided: a flipped face reports a downward normal (would tip the cat over).
            if (faceNormal.y < 0) faceNormal.negate();
            const normalSmooth = 1 - Math.exp(-8 * dt);
            surfaceNormalRef.current.lerp(faceNormal, normalSmooth).normalize();
          }
        }
      }
      const currentPos = catPosRef.current.clone();
      // Horizontal position is exactly on the route; height eases onto the surface (no steps on mesh seams).
      const smoothedPos = desiredPos.clone();
      smoothedPos.y = currentPos.y + (desiredPos.y - currentPos.y) * (1 - Math.exp(-CAT_MOVE_SMOOTHNESS * dt));
      // Turn smoothly toward a look-ahead point on the route (shortest angle), and lean into turns.
      const lookDir = aheadPos.clone().sub(smoothedPos);
      const targetHeading =
        turnHeading !== null
          ? turnHeading
          : Math.hypot(lookDir.x, lookDir.z) > 0.01 && Math.abs(routeSpeed) > 0.02
            ? Math.atan2(lookDir.x, lookDir.z)
            : headingRef.current;
      const rotSmooth = 1 - Math.exp(-CAT_ROTATE_SMOOTHNESS * dt);
      const prevHeading = headingRef.current;
      let headingDelta = wrapAngle(targetHeading - prevHeading);
      // A turn-around keeps to the side with room (may be the long way round).
      const turnSide = journeyRef.current.turnSide;
      if (turnSide !== 0 && Math.sign(headingDelta) === -turnSide && Math.abs(headingDelta) > Math.PI / 2) {
        headingDelta += turnSide * 2 * Math.PI;
      }
      headingRef.current = prevHeading + headingDelta * rotSmooth;
      const yawRate = dt > 0 ? wrapAngle(headingRef.current - prevHeading) / dt : 0;
      // With doc snapping the surface normal already follows the slope; only add slope pitch as a fallback.
      const pitch = docMeshes.length > 0 ? 0 : THREE.MathUtils.clamp(0.015 + tangent.y * 0.25, -0.08, 0.1);
      const leanAmount = THREE.MathUtils.clamp(
        yawRate * Math.abs(routeSpeed) * CAT_TURN_LEAN,
        -CAT_MAX_LEAN,
        CAT_MAX_LEAN
      );
      // Turn centre lies on (cos h, 0, -sin h) for a positive yaw rate; tilt the body's up vector toward it.
      const leanVec = new THREE.Vector3(Math.cos(headingRef.current), 0, -Math.sin(headingRef.current));

      catPosRef.current.copy(smoothedPos);
      body.setNextKinematicTranslation({ x: smoothedPos.x, y: smoothedPos.y, z: smoothedPos.z });
      const up = catBodyUp(surfaceNormalRef.current, headingRef.current).addScaledVector(leanVec, leanAmount).normalize();
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
    if (journey.target === null) {
      for (let i = 0; i < milestoneStops.length; i += 1) {
        const threshold = milestoneStops[i].progress ?? 1;
        // Count by milestone index (same index / id as the Experience panel entries).
        if (progress >= threshold) unlocked = milestoneStops[i].idx + 1;
      }
    } else {
      // Running to a picked milestone unlocks every milestone it passes (never re-locks when running back).
      unlocked = unlockedRef.current;
      for (const stopItem of milestoneStops) {
        const at = milestoneDists.get(stopItem.idx);
        if (at !== undefined && journey.dist >= at - 0.05) unlocked = Math.max(unlocked, stopItem.idx + 1);
      }
      if (arrived) unlocked = Math.max(unlocked, journey.targetIndex + 1);
    }
    if (unlocked !== unlockedRef.current) {
      unlockedRef.current = unlocked;
      setExperienceUnlockedCount(unlocked);
      if (journey.target === null) setExperienceCatMilestone({ at: unlocked - 1, heading: null });
    }
    if (arrived) {
      // Stand at the picked milestone (idle blend follows the zero speed); the dialog marks it as "the cat is here".
      runningRef.current = false;
      catSpeedRef.current = 0;
      setExperienceCatMilestone({ at: journey.targetIndex, heading: null });
      return;
    }

    const hasReachedFinalStop = journey.target === null && profile.done && journey.dist >= journeyPath.length - 1e-4;
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
      setExperienceCatMilestone({ at: finalUnlocked - 1, heading: null });
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
          <group key={milestone.id} name={`milestone-flag-${stop.idx}`} position={flagPos.toArray()} rotation={[0, flagYaw, 0]}>
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

      <group ref={heartsGroupRef} name="cat-pet-hearts" />

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
