"use client";

import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { Html, useGLTF } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useLocale } from "next-intl";
import * as THREE from "three";
import { SkeletonUtils } from "three-stdlib";

import type { AppLocale } from "../../../mock/locale";
import { getProjectBirdItems } from "../../../mock/projectsData";
import { projectIdsForSkill } from "../../../mock/skillsData";
import { birdFollowRuntime } from "../navigation/birdFollowRuntime";
import { usePortfolioNav } from "../navigation/PortfolioNavContext";
import { resolveWaterLevel } from "./waterLevel";

type BirdConfig = {
  radius: number;
  baseHeight: number;
  angleOffset: number;
  liftOffset: number;
};

/**
 * flock    -> circling with the others (FlapGlide)
 * descend  -> eased curved glide from the flock down to its perch; Land clip (flaps, brake, fold) at the end
 * perched  -> PerchIdle loop (wings folded, breathing)
 * ascend   -> TakeOff clip, climbs and curves back into its moving slot in the flock (FlapGlide)
 */
type FlightMode = "flock" | "descend" | "perched" | "ascend";
type ClipName = "flap" | "land" | "perch" | "takeoff";

type Flight = {
  mode: FlightMode;
  anim: ClipName;
  t: number;
  duration: number;
  /** Initial / final speed factor for the Hermite easing, so speed matches the flock at the seams. */
  edgeSpeed: number;
  start: THREE.Vector3;
  c1: THREE.Vector3;
  c2: THREE.Vector3;
  end: THREE.Vector3;
  perch: THREE.Vector3 | null;
  prev: THREE.Vector3;
  hasPrev: boolean;
  yaw: number;
  pitch: number;
  roll: number;
};

const BIRD_SCALE = 0.3;
const ENTRANCE_DURATION = 1.05;
const WING_PHASE_OFFSET = 0.2;
const CLIP_FLAP = "FlapGlide";
const CLIP_LAND = "Land";
const CLIP_PERCH = "PerchIdle";
const CLIP_TAKEOFF = "TakeOff";
const WINGULL_URL = "/wingull.glb?v=2";
const FLOCK_ANGULAR_SPEED = 0.19;
const DESCEND_SPEED = 6;
const DESCEND_MIN_SECONDS = 1.6;
const DESCEND_MAX_SECONDS = 2.2;
const ASCEND_SECONDS = 2.4;
/** Camera keeps tracking the bird this long after it leaves the perch, then returns to the overview. */
const TAKEOFF_FOLLOW_SECONDS = 1.25;
/** Minimum clearance (world units) above terrain / water while flying. */
const FLIGHT_CLEARANCE = 0.7;
const WATER_CLEARANCE = 1.2;
const PERCH_MIN_ABOVE_WATER = 0.3;
const MAX_BANK = 0.55;
/** Skill highlight: matching birds fly from the sky to a small circle over the boat (and back out). */
const SKILL_VISIT_SECONDS = 1.6;
const SKILL_ORBIT_RADIUS = 2.5;
/** Above the cabin-roof crates (roof is ~4.3 above the boat origin), so birds never hide the boat. */
const SKILL_ORBIT_HEIGHT = 5.5;
const SKILL_ORBIT_SPEED = 0.85;
const SKILL_HIGHLIGHT_SCALE = 1.15;
const UP = new THREE.Vector3(0, 1, 0);

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

function wrapAngle(a: number) {
  return Math.atan2(Math.sin(a), Math.cos(a));
}

/** Cubic Hermite 0 -> 1 with start slope m0 and end slope m1 (in u units). */
function hermite01(u: number, m0: number, m1: number) {
  const u2 = u * u;
  const u3 = u2 * u;
  return (u3 - 2 * u2 + u) * m0 + (-2 * u3 + 3 * u2) + (u3 - u2) * m1;
}

function bezier(out: THREE.Vector3, a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, d: THREE.Vector3, t: number) {
  const it = 1 - t;
  const w0 = it * it * it;
  const w1 = 3 * it * it * t;
  const w2 = 3 * it * t * t;
  const w3 = t * t * t;
  return out.set(
    a.x * w0 + b.x * w1 + c.x * w2 + d.x * w3,
    a.y * w0 + b.y * w1 + c.y * w2 + d.y * w3,
    a.z * w0 + b.z * w1 + c.z * w2 + d.z * w3
  );
}

function cloneBird(scene: THREE.Object3D) {
  // SkeletonUtils.clone giữ liên kết lưới với xương cho SkinnedMesh
  const clone = SkeletonUtils.clone(scene);
  clone.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = true;
    mesh.receiveShadow = false;
    mesh.frustumCulled = false;
  });
  return clone;
}

/** Height of the feet below the bird origin in the perched pose (world units at BIRD_SCALE). */
function measureFootOffset(scene: THREE.Object3D, clip: THREE.AnimationClip | undefined) {
  const probe = SkeletonUtils.clone(scene);
  const mixer = new THREE.AnimationMixer(probe);
  if (clip) {
    mixer.clipAction(clip).play();
    mixer.setTime(0);
  }
  probe.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(probe, true);
  mixer.stopAllAction();
  mixer.uncacheRoot(probe);
  return Math.max(0, -box.min.y * BIRD_SCALE) + 0.01;
}

function newFlight(): Flight {
  return {
    mode: "flock",
    anim: "flap",
    t: 0,
    duration: 1,
    edgeSpeed: 0,
    start: new THREE.Vector3(),
    c1: new THREE.Vector3(),
    c2: new THREE.Vector3(),
    end: new THREE.Vector3(),
    perch: null,
    prev: new THREE.Vector3(),
    hasPrev: false,
    yaw: 0,
    pitch: 0,
    roll: 0,
  };
}

type ActionSet = Partial<Record<ClipName, THREE.AnimationAction>>;

export function ProjectBirdFlock() {
  const locale = useLocale() as AppLocale;
  const { scene, animations } = useGLTF(WINGULL_URL) as unknown as {
    scene: THREE.Object3D;
    animations: THREE.AnimationClip[];
  };
  const { scene: worldScene, camera } = useThree();
  const {
    projectBirdsVisible,
    selectedProjectId,
    focusProjectBird,
    projectExit,
    returnToOverview,
    activeSection,
    highlightedSkill,
    boatPose,
    projectFocusRequest,
    clearProjectFocusRequest,
  } = usePortfolioNav();
  const projectBirdItems = getProjectBirdItems(locale);
  // Skills dialog open (camera at the boat): only birds of projects using the picked skill come over.
  const skillMode = !projectBirdsVisible && activeSection === "articles";
  const skillProjectIds = useMemo(
    () => (highlightedSkill ? projectIdsForSkill(highlightedSkill, projectBirdItems) : []),
    [highlightedSkill, projectBirdItems],
  );
  const timeRef = useRef(0);
  const birdRefs = useRef<(THREE.Group | null)[]>([]);
  const bodyRefs = useRef<(THREE.Group | null)[]>([]);
  const flightsRef = useRef<Flight[]>([]);
  const actionSetsRef = useRef<ActionSet[]>([]);
  const footOffsetRef = useRef(0.12);
  const wasVisibleRef = useRef(false);
  /** Seconds since the flock became visible (a focus request from the Skills dialog waits for the entrance). */
  const visibleForRef = useRef(0);
  const exitRef = useRef({ handled: false, bird: -1 });
  const envRef = useRef({ ground: [] as THREE.Mesh[], water: 0, refreshIn: 0 });
  const visitRef = useRef({
    time: 0,
    w: [] as number[],
    prev: [] as THREE.Vector3[],
    has: [] as boolean[],
    yaw: [] as number[],
    roll: [] as number[],
  });
  const toolsRef = useRef({
    ray: new THREE.Raycaster(),
    down: new THREE.Vector3(0, -1, 0),
    origin: new THREE.Vector3(),
    flock: new THREE.Vector3(),
    tangent: new THREE.Vector3(),
    pos: new THREE.Vector3(),
    vel: new THREE.Vector3(),
    tmp: new THREE.Vector3(),
    a: new THREE.Vector3(),
    b: new THREE.Vector3(),
  });

  const configs = useMemo<BirdConfig[]>(
    () =>
      projectBirdItems.map((_, i) => ({
        radius: 14.5 + (i % 2) * 1.6,
        baseHeight: 12.6 + (i % 3) * 0.75,
        angleOffset: (i - (projectBirdItems.length - 1) / 2) * 0.28,
        liftOffset: i * 0.7,
      })),
    [projectBirdItems],
  );

  const birds = useMemo(
    () => projectBirdItems.map(() => cloneBird(scene)),
    [scene, projectBirdItems],
  );

  const mixersRef = useRef<THREE.AnimationMixer[]>([]);

  useEffect(() => {
    flightsRef.current = birds.map(() => newFlight());
    const flapClip = THREE.AnimationClip.findByName(animations, CLIP_FLAP) ?? animations[0];
    if (!flapClip) return;
    const landClip = THREE.AnimationClip.findByName(animations, CLIP_LAND);
    const perchClip = THREE.AnimationClip.findByName(animations, CLIP_PERCH);
    const takeoffClip = THREE.AnimationClip.findByName(animations, CLIP_TAKEOFF);
    footOffsetRef.current = measureFootOffset(scene, perchClip ?? undefined);

    const sets: ActionSet[] = [];
    const mixers = birds.map((bird, i) => {
      const mixer = new THREE.AnimationMixer(bird);
      const flap = mixer.clipAction(flapClip);
      flap.reset();
      flap.setLoop(THREE.LoopRepeat, Infinity);
      flap.time = (i * WING_PHASE_OFFSET) % flapClip.duration;
      flap.setEffectiveTimeScale(1);
      flap.play();
      const set: ActionSet = { flap };
      const once = (clip: THREE.AnimationClip | null) => {
        if (!clip) return undefined;
        const a = mixer.clipAction(clip);
        a.setLoop(THREE.LoopOnce, 1);
        a.clampWhenFinished = true;
        return a;
      };
      set.land = once(landClip);
      set.takeoff = once(takeoffClip);
      if (perchClip) {
        set.perch = mixer.clipAction(perchClip);
        set.perch.setLoop(THREE.LoopRepeat, Infinity);
      }
      sets.push(set);
      return mixer;
    });
    mixersRef.current = mixers;
    actionSetsRef.current = sets;

    return () => {
      mixers.forEach((mixer, i) => {
        mixer.stopAllAction();
        mixer.uncacheRoot(birds[i]);
      });
      mixersRef.current = [];
      actionSetsRef.current = [];
    };
  }, [animations, birds, scene]);

  /** Refreshes the walkable island meshes and the world water height (cheap, every couple of seconds). */
  const refreshEnv = useCallback(
    (force = false) => {
      const env = envRef.current;
      if (!force && env.ground.length > 0 && env.refreshIn > 0) return env;
      const ground: THREE.Mesh[] = [];
      worldScene.traverse((child) => {
        const mesh = child as THREE.Mesh;
        if (mesh.isMesh && mesh.visible && mesh.userData.isIslandCollider) ground.push(mesh);
      });
      env.ground = ground;
      env.water = resolveWaterLevel(worldScene);
      env.refreshIn = 2;
      return env;
    },
    [worldScene],
  );

  const groundAt = useCallback((x: number, z: number) => {
    const tools = toolsRef.current;
    const env = envRef.current;
    if (env.ground.length === 0) return -Infinity;
    tools.ray.set(tools.origin.set(x, 40, z), tools.down);
    tools.ray.far = 80;
    const hit = tools.ray.intersectObjects(env.ground, false)[0];
    return hit ? hit.point.y : -Infinity;
  }, []);

  /**
   * Perch on solid island ground above the water, searching outward (rings x angles) from the bird's side of the
   * island; prefer spots the focus camera can see (not hidden behind trees/rocks). Feet are put on the hit.
   */
  const computePerch = useCallback(
    (from: THREE.Vector3) => {
      const env = refreshEnv(true);
      const tools = toolsRef.current;
      const occluders: THREE.Object3D[] = [];
      for (const child of worldScene.children) {
        if (child.name !== "project-bird-flock" && child.name !== "weather-effects") occluders.push(child);
      }
      const radius = Math.hypot(from.x, from.z);
      const baseAngle = Math.atan2(from.z, from.x);
      const normal = new THREE.Vector3();
      const camPos = new THREE.Vector3();
      const toPerch = new THREE.Vector3();
      const sightRay = new THREE.Raycaster();
      const solidAt = (x: number, z: number) => {
        tools.ray.set(tools.origin.set(x, 40, z), tools.down);
        tools.ray.far = 80;
        const hit = tools.ray.intersectObjects(env.ground, false)[0];
        if (!hit || hit.point.y < env.water + PERCH_MIN_ABOVE_WATER) return null;
        if (hit.face) {
          normal.copy(hit.face.normal).transformDirection(hit.object.matrixWorld);
          if (Math.abs(normal.y) < 0.75) return null;
        }
        return hit.point.clone();
      };
      const visible = (perch: THREE.Vector3) => {
        // Same framing as focusProjectBird(): outward 9.5, tangent 2.8, up 2.6.
        const len = Math.max(1e-4, Math.hypot(perch.x, perch.z));
        const ox = perch.x / len;
        const oz = perch.z / len;
        camPos.set(perch.x + ox * 9.5 + oz * 2.8, perch.y + 2.95, perch.z + oz * 9.5 - ox * 2.8);
        toPerch.set(perch.x, perch.y + 0.25, perch.z).sub(camPos);
        const dist = toPerch.length();
        sightRay.set(camPos, toPerch.normalize());
        sightRay.far = dist - 0.35;
        return !sightRay.intersectObjects(occluders, true).some((h) => {
          const m = h.object as THREE.Mesh;
          return m.visible && !(m.material as THREE.Material | undefined)?.transparent;
        });
      };
      const place = (p: THREE.Vector3) => {
        p.y += footOffsetRef.current;
        return p;
      };
      let fallback: THREE.Vector3 | null = null;
      let sightChecks = 0;
      const angleSteps = [0, 0.2, -0.2, 0.4, -0.4, 0.65, -0.65, 0.95, -0.95];
      for (let r = Math.min(radius - 2, 12.5); r >= 2; r -= 0.6) {
        for (const da of angleSteps) {
          const p = solidAt(Math.cos(baseAngle + da) * r, Math.sin(baseAngle + da) * r);
          if (!p) continue;
          if (!fallback) fallback = p.clone();
          if (sightChecks >= 14) continue;
          sightChecks += 1;
          if (visible(p)) return place(p);
        }
      }
      if (fallback) return place(fallback);
      // Nothing on this side: sweep the whole island.
      for (let r = 10; r >= 0; r -= 1) {
        for (let a = 0; a < Math.PI * 2; a += 0.4) {
          const p = solidAt(Math.cos(a) * r, Math.sin(a) * r);
          if (p) return place(p);
        }
      }
      return new THREE.Vector3(from.x * 0.5, Math.max(from.y - 2, env.water + WATER_CLEARANCE), from.z * 0.5);
    },
    [worldScene, refreshEnv],
  );

  const focusProjectByIndex = useCallback(
    (index: number) => {
      const project = projectBirdItems[index];
      if (!project) return;
      const cfg = configs[index];
      const node = birdRefs.current[index];
      const flight = flightsRef.current[index];
      if (node && flight) {
        if (!flight.perch || flight.mode === "flock" || flight.mode === "ascend") {
          flight.perch = computePerch(node.position);
        }
        // Frame the perch (where the bird lands) instead of the bird's current spot in the sky.
        const p = flight.perch;
        focusProjectBird(project.id, [p.x, p.y + 0.35, p.z], { perch: true });
      } else {
        focusProjectBird(project.id, [
          Math.cos(0.65 + cfg.angleOffset) * cfg.radius,
          cfg.baseHeight,
          Math.sin(0.65 + cfg.angleOffset) * cfg.radius,
        ]);
      }
    },
    [projectBirdItems, configs, focusProjectBird, computePerch],
  );

  /** Crossfade a bird's mixer to another clip. */
  const playClip = (i: number, flight: Flight, name: ClipName, fade: number) => {
    const set = actionSetsRef.current[i];
    if (!set || flight.anim === name) return;
    const next = set[name];
    if (!next) return;
    const prev = set[flight.anim];
    next.reset();
    next.setEffectiveTimeScale(1);
    next.setEffectiveWeight(1);
    next.play();
    if (prev && prev !== next) next.crossFadeFrom(prev, fade, false);
    flight.anim = name;
  };

  const clipDone = (i: number, name: ClipName) => {
    const a = actionSetsRef.current[i]?.[name];
    return !a || a.time >= a.getClip().duration - 0.02;
  };

  /** Raise the swoop curve until straight segments between samples clear the terrain. */
  const liftCurveOverTerrain = (flight: Flight) => {
    const env = envRef.current;
    if (env.ground.length === 0) return;
    const tools = toolsRef.current;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      let blocked = false;
      bezier(tools.a, flight.start, flight.c1, flight.c2, flight.end, 0);
      for (let k = 1; k <= 14 && !blocked; k += 1) {
        bezier(tools.b, flight.start, flight.c1, flight.c2, flight.end, k / 14);
        // The final stretch legitimately reaches the ground at the perch.
        if (tools.b.distanceTo(flight.end) > 0.8) {
          const seg = tools.tmp.copy(tools.b).sub(tools.a);
          const len = seg.length();
          if (len > 1e-4) {
            tools.ray.set(tools.a, seg.divideScalar(len));
            tools.ray.far = len;
            if (tools.ray.intersectObjects(env.ground, false).length > 0) blocked = true;
          }
        }
        tools.a.copy(tools.b);
      }
      if (!blocked) return;
      flight.c1.y += 1.5;
      flight.c2.y += 1.5;
    }
  };

  /** Skill highlight flight around the boat (birds not used by the skill stay away / fly off). */
  const stepSkillVisit = (rawDelta: number) => {
    const boat = boatPose?.position;
    if (!boat) return;
    const delta = Math.min(rawDelta, 0.1);
    const v = visitRef.current;
    v.time += delta;
    const env = envRef.current;
    env.refreshIn -= delta;
    refreshEnv();
    const tools = toolsRef.current;
    const outward = tools.a.set(boat[0], 0, boat[2]);
    if (outward.lengthSq() < 1e-6) outward.set(1, 0, 0);
    outward.normalize();
    // The boat is framed left of the dialog: shift the circle a bit toward screen centre (camera right).
    camera.getWorldDirection(tools.tangent);
    const shift = tools.tangent.set(-tools.tangent.z, 0, tools.tangent.x).normalize().multiplyScalar(1.4);
    const cx = boat[0] + shift.x;
    const cz = boat[2] + shift.z;
    birdRefs.current.forEach((bird, i) => {
      if (!bird) return;
      const project = projectBirdItems[i];
      if (!project) return;
      const want = skillProjectIds.includes(project.id) ? 1 : 0;
      const w = THREE.MathUtils.clamp((v.w[i] ?? 0) + Math.sign(want - (v.w[i] ?? 0)) * (delta / SKILL_VISIT_SECONDS), 0, 1);
      v.w[i] = w;
      if (w <= 0.001) {
        bird.visible = false;
        v.has[i] = false;
        return;
      }
      mixersRef.current[i]?.update(delta);
      const angle = v.time * SKILL_ORBIT_SPEED + i * 1.257;
      const orbit = tools.pos.set(
        cx + Math.cos(angle) * SKILL_ORBIT_RADIUS,
        boat[1] + SKILL_ORBIT_HEIGHT + Math.sin(v.time * 1.3 + i) * 0.25,
        cz + Math.sin(angle) * SKILL_ORBIT_RADIUS,
      );
      // Arrive from (and leave to) high in the sky on the ocean side of the boat.
      const sky = tools.flock.set(
        boat[0] + outward.x * 7 + Math.cos(i * 1.3) * 3,
        boat[1] + 9 + i * 0.4,
        boat[2] + outward.z * 7 + Math.sin(i * 1.3) * 3,
      );
      const k = w * w * (3 - 2 * w);
      const pos = tools.b.copy(sky).lerp(orbit, k);
      pos.y = Math.max(pos.y, env.water + WATER_CLEARANCE);
      if (!v.prev[i]) v.prev[i] = new THREE.Vector3();
      const vel = tools.vel;
      if (v.has[i] && delta > 0) vel.copy(pos).sub(v.prev[i]).divideScalar(delta);
      else vel.set(-Math.sin(angle), 0, Math.cos(angle));
      const prevYaw = v.yaw[i] ?? 0;
      const targetYaw = Math.hypot(vel.x, vel.z) > 0.05 ? Math.atan2(vel.x, vel.z) : prevYaw;
      const yaw = v.has[i] ? prevYaw + wrapAngle(targetYaw - prevYaw) * (1 - Math.exp(-8 * delta)) : targetYaw;
      const yawRate = delta > 0 ? wrapAngle(yaw - prevYaw) / delta : 0;
      const roll = (v.roll[i] ?? 0) + (THREE.MathUtils.clamp(-yawRate * 0.3, -MAX_BANK, MAX_BANK) - (v.roll[i] ?? 0)) * (1 - Math.exp(-6 * delta));
      v.yaw[i] = yaw;
      v.roll[i] = roll;
      v.prev[i].copy(pos);
      v.has[i] = true;
      bird.position.copy(pos);
      const body = bodyRefs.current[i];
      if (body) {
        body.rotation.order = "YXZ";
        body.rotation.set(-0.05, yaw, roll);
      }
      const appear = THREE.MathUtils.smoothstep(w, 0, 0.3);
      bird.scale.setScalar(BIRD_SCALE * SKILL_HIGHLIGHT_SCALE * Math.max(0.0001, appear));
      bird.visible = true;
    });
  };

  useFrame((_, rawDelta) => {
    if (!projectBirdsVisible) {
      visibleForRef.current = 0;
      if (wasVisibleRef.current) {
        wasVisibleRef.current = false;
        flightsRef.current = birds.map(() => newFlight());
        actionSetsRef.current.forEach((set) => {
          set.land?.stop();
          set.perch?.stop();
          set.takeoff?.stop();
          set.flap?.setEffectiveWeight(1).setEffectiveTimeScale(1).play();
        });
      }
      birdFollowRuntime.active = false;
      if (skillMode) stepSkillVisit(rawDelta);
      else if (visitRef.current.w.length > 0) visitRef.current.w = [];
      return;
    }
    wasVisibleRef.current = true;
    const delta = Math.min(rawDelta, 0.1);
    visibleForRef.current += delta;
    if (projectFocusRequest && visibleForRef.current > 0.9) {
      const index = projectBirdItems.findIndex((p) => p.id === projectFocusRequest);
      clearProjectFocusRequest();
      if (index >= 0) focusProjectByIndex(index);
    }
    const env = envRef.current;
    env.refreshIn -= delta;
    refreshEnv();

    // Phát animation đập cánh và lượn
    mixersRef.current.forEach((mixer) => mixer.update(delta));

    timeRef.current += delta;
    const t = timeRef.current;
    const tools = toolsRef.current;
    const foot = footOffsetRef.current;
    const exit = exitRef.current;
    if (projectExit !== "takingOff") {
      exit.handled = false;
      exit.bird = -1;
    }

    birdRefs.current.forEach((bird, i) => {
      if (!bird) return;
      const cfg = configs[i];
      const project = projectBirdItems[i];
      const flight = flightsRef.current[i];
      if (!cfg || !project || !flight) return;
      const isSelected = selectedProjectId === project.id;

      // Live slot in the circling flock (also the rejoin target).
      const angle = t * FLOCK_ANGULAR_SPEED + 0.65 + cfg.angleOffset;
      const flockPos = tools.flock.set(
        Math.cos(angle) * cfg.radius,
        cfg.baseHeight + Math.sin(t * 0.58 + cfg.liftOffset) * 0.9,
        Math.sin(angle) * cfg.radius,
      );
      const flockTangent = tools.tangent.set(-Math.sin(angle), 0, Math.cos(angle));
      const flockSpeed = FLOCK_ANGULAR_SPEED * cfg.radius;

      // --- state transitions -------------------------------------------------------------
      if (isSelected && (flight.mode === "flock" || flight.mode === "ascend")) {
        const start = flight.hasPrev ? bird.position : flockPos;
        const perch = flight.perch ?? computePerch(start);
        flight.perch = perch;
        const fromFlock = flight.mode === "flock";
        flight.start.copy(start);
        flight.end.copy(perch);
        const heading = fromFlock
          ? flockTangent.clone()
          : tools.tmp.copy(bird.position).sub(flight.prev).setY(0).normalize().clone();
        if (heading.lengthSq() < 1e-6) heading.copy(flockTangent);
        // Keep flying forward a little, then curve round and come in low over the perch.
        flight.c1.copy(start).addScaledVector(heading, 3).addScaledVector(UP, 0.4);
        const approach = tools.tmp.copy(perch).sub(start).setY(0);
        if (approach.lengthSq() < 1e-6) approach.copy(heading);
        approach.normalize();
        flight.c2.copy(perch).addScaledVector(approach, -2.2).addScaledVector(UP, 1.3);
        liftCurveOverTerrain(flight);
        const dist = start.distanceTo(perch);
        flight.duration = THREE.MathUtils.clamp(dist / DESCEND_SPEED, DESCEND_MIN_SECONDS, DESCEND_MAX_SECONDS);
        flight.edgeSpeed = fromFlock ? THREE.MathUtils.clamp((flockSpeed * flight.duration) / 9, 0, 1.2) : 0.2;
        flight.mode = "descend";
        flight.t = 0;
        playClip(i, flight, "flap", 0.2);
      } else if (!isSelected && (flight.mode === "descend" || flight.mode === "perched")) {
        flight.start.copy(bird.position);
        const outward = tools.tmp.set(bird.position.x, 0, bird.position.z);
        if (outward.lengthSq() < 1e-6) outward.set(1, 0, 0);
        outward.normalize();
        // Climb mostly straight up first (TakeOff clip), then curve out to the flock.
        flight.c1.copy(bird.position).addScaledVector(UP, 2.4).addScaledVector(outward, 0.8);
        flight.duration = ASCEND_SECONDS;
        flight.edgeSpeed = THREE.MathUtils.clamp((flockSpeed * ASCEND_SECONDS) / 9, 0, 1.2);
        flight.mode = "ascend";
        flight.t = 0;
        playClip(i, flight, "takeoff", 0.15);
        if (projectExit === "takingOff" && exit.bird < 0) exit.bird = i;
      }

      // --- position ------------------------------------------------------------------------
      const pos = tools.pos;
      let u = 0;
      let clearance = FLIGHT_CLEARANCE;
      let waterClearance = WATER_CLEARANCE;
      if (flight.mode === "flock") {
        pos.copy(flockPos);
      } else if (flight.mode === "descend") {
        flight.t += delta;
        u = Math.min(1, flight.t / flight.duration);
        bezier(pos, flight.start, flight.c1, flight.c2, flight.end, hermite01(u, flight.edgeSpeed, 0));
        const near = THREE.MathUtils.smoothstep(u, 0.7, 1);
        clearance = THREE.MathUtils.lerp(FLIGHT_CLEARANCE, foot, near);
        waterClearance = THREE.MathUtils.lerp(WATER_CLEARANCE, PERCH_MIN_ABOVE_WATER, near);
        const landLead = actionSetsRef.current[i]?.land?.getClip().duration ?? 0.7;
        if (flight.duration - flight.t <= landLead * 0.9) playClip(i, flight, "land", 0.2);
        if (u >= 1) flight.mode = "perched";
      } else if (flight.mode === "perched") {
        pos.copy(flight.end);
        clearance = 0;
        waterClearance = 0;
        if (flight.anim !== "perch") {
          if (flight.anim !== "land") playClip(i, flight, "land", 0.15);
          else if (clipDone(i, "land")) playClip(i, flight, "perch", 0.35);
        }
      } else {
        flight.t += delta;
        u = Math.min(1, flight.t / flight.duration);
        // Rejoin target keeps moving with the flock; enter the circle along its tangent.
        flight.end.copy(flockPos);
        flight.c2.copy(flockPos).addScaledVector(flockTangent, -3);
        bezier(pos, flight.start, flight.c1, flight.c2, flight.end, hermite01(u, 0, flight.edgeSpeed));
        const away = THREE.MathUtils.smoothstep(u, 0, 0.25);
        clearance = THREE.MathUtils.lerp(foot, FLIGHT_CLEARANCE, away);
        waterClearance = THREE.MathUtils.lerp(PERCH_MIN_ABOVE_WATER, WATER_CLEARANCE, away);
        if (flight.anim === "takeoff" && clipDone(i, "takeoff")) playClip(i, flight, "flap", 0.25);
        if (u >= 1) {
          flight.mode = "flock";
          flight.perch = null;
        }
      }
      // Never below the water surface or inside terrain, anywhere along the flight.
      if (flight.mode !== "perched") {
        const minY = Math.max(env.water + waterClearance, groundAt(pos.x, pos.z) + clearance);
        if (pos.y < minY) pos.y = minY;
      }

      // --- orientation (velocity-driven yaw, pitch from climb/descent, bank from turn rate) ---
      const vel = tools.vel;
      if (flight.hasPrev && delta > 0) vel.copy(pos).sub(flight.prev).divideScalar(delta);
      else vel.copy(flockTangent).multiplyScalar(flockSpeed);
      const horiz = Math.hypot(vel.x, vel.z);
      let targetYaw = flight.yaw;
      if (flight.mode === "perched") {
        // Turn to a three-quarter view towards the camera while resting.
        targetYaw = Math.atan2(camera.position.x - pos.x, camera.position.z - pos.z) + 0.6;
      } else if (horiz > 0.05) {
        targetYaw = Math.atan2(vel.x, vel.z);
      }
      if (!flight.hasPrev) flight.yaw = targetYaw;
      const yawK = 1 - Math.exp(-(flight.mode === "perched" ? 2.5 : 8) * delta);
      const prevYaw = flight.yaw;
      flight.yaw = prevYaw + wrapAngle(targetYaw - prevYaw) * yawK;
      const yawRate = delta > 0 ? wrapAngle(flight.yaw - prevYaw) / delta : 0;

      let targetPitch: number;
      let targetRoll: number;
      if (flight.mode === "flock") {
        targetPitch = -0.06 + Math.sin(t * 0.9 + cfg.liftOffset) * 0.03;
        targetRoll = Math.sin(t * 0.9 + cfg.liftOffset + 0.5) * 0.09;
      } else if (flight.mode === "perched") {
        targetPitch = 0;
        targetRoll = 0;
      } else {
        targetPitch = THREE.MathUtils.clamp(-Math.atan2(vel.y, Math.max(horiz, 0.3)) * 0.5, -0.45, 0.45);
        // Flare (nose up) just before touching down.
        if (flight.mode === "descend" && u > 0.85) targetPitch = THREE.MathUtils.lerp(targetPitch, -0.3, (u - 0.85) / 0.15);
        targetRoll = THREE.MathUtils.clamp(-yawRate * 0.3, -MAX_BANK, MAX_BANK);
      }
      const attK = 1 - Math.exp(-6 * delta);
      flight.pitch += (targetPitch - flight.pitch) * attK;
      flight.roll += (targetRoll - flight.roll) * attK;

      bird.position.copy(pos);
      const body = bodyRefs.current[i];
      if (body) {
        // Rotation lives on an inner group so the label above the bird stays upright.
        body.rotation.order = "YXZ";
        body.rotation.set(flight.pitch, flight.yaw, flight.roll);
      }
      flight.prev.copy(pos);
      flight.hasPrev = true;

      // Glide while swooping in, flap harder for a moment after the take-off clip.
      const flap = actionSetsRef.current[i]?.flap;
      if (flap) {
        let timeScale = 1;
        if (flight.mode === "descend") timeScale = 0.7;
        else if (flight.mode === "ascend") timeScale = THREE.MathUtils.lerp(1.6, 1, THREE.MathUtils.smoothstep(u, 0.3, 1));
        flap.setEffectiveTimeScale(timeScale);
      }

      // Closing a project: camera follows the departing bird, then returns to the overview.
      if (projectExit === "takingOff" && exit.bird === i) {
        birdFollowRuntime.position.copy(pos);
        birdFollowRuntime.active = !exit.handled;
        if (!exit.handled && (flight.mode !== "ascend" || flight.t >= TAKEOFF_FOLLOW_SECONDS)) {
          exit.handled = true;
          birdFollowRuntime.active = false;
          returnToOverview();
        }
      }

      const spawn = Math.min(
        1,
        Math.max(0, (t - i * 0.18) / ENTRANCE_DURATION),
      );
      const k = easeOutCubic(spawn);
      bird.scale.setScalar(BIRD_SCALE * Math.max(0.0001, k));
      bird.visible = spawn > 0.01;
    });

    // No bird was perched/landing when the project closed: go straight back to the overview.
    if (projectExit === "takingOff" && exit.bird < 0 && !exit.handled) {
      exit.handled = true;
      returnToOverview();
    }
    if (projectExit !== "takingOff" || exit.handled) birdFollowRuntime.active = false;
  });

  if (!projectBirdsVisible && !skillMode) return null;

  return (
    <group name="project-bird-flock">
      {birds.map((bird, i) => {
        const project = projectBirdItems[i];
        const cfg = configs[i];
        return (
          <group
            key={project.id}
            ref={(node) => {
              birdRefs.current[i] = node;
            }}
            position={[
              Math.cos(0.65 + cfg.angleOffset) * cfg.radius,
              cfg.baseHeight,
              Math.sin(0.65 + cfg.angleOffset) * cfg.radius,
            ]}
            scale={0.0001}
            onClick={(e) => {
              if (!projectBirdsVisible) return;
              e.stopPropagation();
              focusProjectByIndex(i);
            }}
          >
            <group
              ref={(node) => {
                bodyRefs.current[i] = node;
              }}
            >
              <primitive object={bird} dispose={null} />
              <mesh
                onClick={(e) => {
                  if (!projectBirdsVisible) return;
                  e.stopPropagation();
                  focusProjectByIndex(i);
                }}
              >
                <sphereGeometry args={[1.35, 16, 16]} />
                <meshBasicMaterial transparent opacity={0} depthWrite={false} />
              </mesh>
            </group>
            {skillMode && skillProjectIds.includes(project.id) && (
              <Html center position={[0, 1.25, 0]} distanceFactor={10}>
                <span className="pointer-events-none rounded-full border border-[#f3c77a] bg-[#2f1f11]/85 px-3 py-1 text-[11px] font-semibold tracking-[0.08em] whitespace-nowrap text-[#fff1d6] shadow-[0_0_14px_rgba(243,199,122,0.75)] backdrop-blur-sm">
                  {project.name}
                </span>
              </Html>
            )}
            {projectBirdsVisible && (
            <Html center position={[0, 1.25, 0]} distanceFactor={10}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  focusProjectByIndex(i);
                }}
                className="cursor-pointer rounded-full border border-[#88acc0]/55 bg-[#0c151d]/72 px-3 py-1 text-[11px] font-semibold tracking-[0.08em] text-[#def0f8] backdrop-blur-sm whitespace-nowrap"
              >
                {project.name}
              </button>
            </Html>
            )}
          </group>
        );
      })}
    </group>
  );
}

useGLTF.preload(WINGULL_URL);
