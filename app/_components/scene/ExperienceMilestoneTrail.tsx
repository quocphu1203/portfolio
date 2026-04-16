"use client";

import React, { useEffect, useMemo, useRef } from "react";
import { Html } from "@react-three/drei";
import { useGLTF } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useLocale } from "next-intl";
import { RigidBody, type RapierRigidBody, useRapier } from "@react-three/rapier";
import * as THREE from "three";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";

import { getExperienceMilestones } from "../../../mock/experienceData";
import type { AppLocale } from "../../../mock/locale";
import { usePortfolioNav } from "../navigation/PortfolioNavContext";

const JOURNEY_DURATION_SECONDS = 8.2;
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
const FINAL_STOP_DISTANCE = 0.18;
const CAT_POSE_UPDATE_INTERVAL_MS = 50;
const CAT_MOVE_SMOOTHNESS = 14;
const CAT_ROTATE_SMOOTHNESS = 9;
const CAT_BODY_DIP_X = -0.12;
const CAT_HEAD_LIFT_X = 0.18;
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
  const experienceMilestones = getExperienceMilestones(locale);
  const {
    activeSection,
    experienceJourneyKey,
    experienceUnlockedCount,
    setExperienceUnlockedCount,
    setExperienceCatPose,
  } = usePortfolioNav();
  const { scene: worldScene } = useThree();
  const { world, rapier } = useRapier();
  const { scene: catScene, animations } = useGLTF("/cat_rigged.glb") as {
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
  const elapsedRef = useRef(0);
  const runningRef = useRef(false);
  const unlockedRef = useRef(0);
  const prevPosRef = useRef(new THREE.Vector3());
  const headingRef = useRef(0);
  const surfaceNormalRef = useRef(new THREE.Vector3(0, 1, 0));
  const lastPoseUpdateAtRef = useRef(0);
  const raycasterRef = useRef(new THREE.Raycaster());
  const docRayRef = useRef(new THREE.Raycaster());
  const pathPoints = useMemo(() => {
    const refreshKey = `${activeSection ?? "none"}-${experienceJourneyKey}`;
    const pathNode = resolveDocRoot(worldScene);
    if (!pathNode) return smoothPath(FALLBACK_PATH.map((p) => new THREE.Vector3(p[0], p[1], p[2])));
    pathNode.updateWorldMatrix(true, true);
    const built = pointsFromPathObject(pathNode);
    if (built.length >= 2) return smoothPath(built);
    void refreshKey;
    return smoothPath(FALLBACK_PATH.map((p) => new THREE.Vector3(p[0], p[1], p[2])));
  }, [worldScene, activeSection, experienceJourneyKey]);
  const docMeshes = useMemo(() => {
    const docRoot = resolveDocRoot(worldScene);
    if (!docRoot) return [] as THREE.Mesh[];
    docRoot.updateWorldMatrix(true, true);
    const meshes: THREE.Mesh[] = [];
    docRoot.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (mesh.isMesh) meshes.push(mesh);
    });
    return meshes;
  }, [worldScene]);
  const wallMeshes = useMemo(() => {
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
  }, [worldScene]);

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
  useEffect(() => {
    const bodyBones: THREE.Bone[] = [];
    const headBones: THREE.Bone[] = [];
    catModel.traverse((child) => {
      if (!(child instanceof THREE.Bone)) return;
      const n = child.name.toLowerCase();
      if (/head|neck/.test(n)) {
        headBones.push(child);
        return;
      }
      if (/hips|pelvis|spine|chest/.test(n)) {
        bodyBones.push(child);
      }
    });
    catBodyBoneRefs.current = bodyBones.slice(0, 3);
    catHeadBoneRefs.current = headBones.slice(0, 2);

    const activeWalk = animations.find((clip) => /walk|run|tro(t|d)|move/i.test(clip.name)) ?? animations[0];
    const activeIdle = animations.find((clip) => /idle|stand|breathe|rest/i.test(clip.name));
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
      walkAction.stop();
      idleActionRef.current?.stop();
      mixer.stopAllAction();
      mixerRef.current = null;
      walkActionRef.current = null;
      idleActionRef.current = null;
    };
  }, [animations, catModel]);

  useEffect(() => {
    if (activeSection !== "credits" || pathPoints.length < 2) return;
    elapsedRef.current = 0;
    runningRef.current = true;
    unlockedRef.current = 0;
    setExperienceUnlockedCount(0);
    const body = catBodyRef.current;
    if (body) {
      const start = pathPoints[0];
      const startTan = tangentAt(pathPoints, 0);
      const spawnPos = offsetOutward(start, startTan, CAT_WALL_CLEARANCE);
      body.setTranslation({ x: spawnPos.x, y: spawnPos.y, z: spawnPos.z }, true);
      body.setNextKinematicTranslation({ x: spawnPos.x, y: spawnPos.y, z: spawnPos.z });
      catPosRef.current.copy(spawnPos);
      prevPosRef.current.copy(start);
      headingRef.current = 0;
      setExperienceCatPose({
        position: [spawnPos.x, spawnPos.y, spawnPos.z],
        heading: headingRef.current,
      });
      lastPoseUpdateAtRef.current = performance.now();
    }
    if (walkActionRef.current) {
      walkActionRef.current.reset();
      walkActionRef.current.paused = false;
      walkActionRef.current.setEffectiveTimeScale(1.8);
      walkActionRef.current.fadeIn(0.2);
      walkActionRef.current.play();
    }
    if (idleActionRef.current) {
      idleActionRef.current.stop();
    }
  }, [activeSection, experienceJourneyKey, pathPoints, setExperienceUnlockedCount, setExperienceCatPose]);

  useEffect(() => {
    if (activeSection === "credits") return;
    setExperienceCatPose(null);
  }, [activeSection, setExperienceCatPose]);

  useFrame((_, delta) => {
    if (mixerRef.current && activeSection === "credits") {
      mixerRef.current.update(delta);
      for (const bodyBone of catBodyBoneRefs.current) {
        bodyBone.rotateX(CAT_BODY_DIP_X);
      }
      for (const headBone of catHeadBoneRefs.current) {
        headBone.rotateX(CAT_HEAD_LIFT_X);
      }
    }
    if (activeSection !== "credits") return;
    if (!runningRef.current) return;
    if (pathPoints.length < 2) return;

    elapsedRef.current += delta;
    const journeyProgress = Math.min(1, elapsedRef.current / JOURNEY_DURATION_SECONDS);
    const progress = journeyProgress * targetJourneyProgress;
    const pos = lerpPath(pathPoints, progress);
    const lastStop = milestoneStops[milestoneStops.length - 1];
    const lastFlag = lastStop?.position;
    const lastStopTangent = tangentAt(pathPoints, targetJourneyProgress);
    const lastFlagCatStopRaw = lastFlag ? catStopNearFlag(lastFlag, lastStopTangent) : null;
    const lastFlagCatStop =
      lastFlagCatStopRaw && lastFlag
        ? (snapPointToDocSurface(lastFlagCatStopRaw, docMeshes, DOC_SURFACE_OFFSET_Y) ?? lastFlag.clone())
        : null;
    // Smoothly guide the cat toward the actual last milestone destination.
    const approachStart = Math.max(0, targetJourneyProgress - FINAL_APPROACH_WINDOW);
    const approachMix =
      targetJourneyProgress > approachStart
        ? THREE.MathUtils.clamp((progress - approachStart) / (targetJourneyProgress - approachStart), 0, 1)
        : 1;
    const targetPos =
      lastFlagCatStop && progress >= approachStart
        ? new THREE.Vector3().lerpVectors(
          pos,
          lastFlagCatStop,
          easeOutCubic(approachMix)
        )
        : pos;
    const tangent = tangentAt(pathPoints, progress);
    const body = catBodyRef.current;
    if (body) {
      const gaitT = elapsedRef.current * 8.5;

      // Cat movement follows doc path and snaps to doc surface.
      const safePos = offsetOutward(targetPos, tangent, CAT_WALL_CLEARANCE);
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
      const vx = smoothedPos.x - currentPos.x;
      const vz = smoothedPos.z - currentPos.z;
      const planarStep = Math.sqrt(vx * vx + vz * vz);
      const targetHeading = planarStep > 0.0001 ? Math.atan2(vx, vz) : headingRef.current;
      const rotSmooth = 1 - Math.exp(-CAT_ROTATE_SMOOTHNESS * delta);
      headingRef.current = THREE.MathUtils.lerp(headingRef.current, targetHeading, rotSmooth);

      const speedFactor = THREE.MathUtils.clamp(planarStep / 0.04, 0.35, 1);
      const pitchRaw = 0.015 + Math.sin(gaitT * 0.68) * (0.015 * speedFactor) + tangent.y * 0.25;
      const pitch = THREE.MathUtils.clamp(pitchRaw, -0.08, 0.1);
      const roll = Math.sin(gaitT * 0.48) * (0.03 * speedFactor);

      catPosRef.current.copy(smoothedPos);
      body.setNextKinematicTranslation({ x: smoothedPos.x, y: smoothedPos.y, z: smoothedPos.z });
      const up = surfaceNormalRef.current.clone().normalize();
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
      const localOffset = new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch, 0, roll, "XYZ"));
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

    const hasReachedFinalStop =
      Boolean(lastFlagCatStop) && catPosRef.current.distanceTo(lastFlagCatStop as THREE.Vector3) <= FINAL_STOP_DISTANCE;

    if (journeyProgress >= 1 || hasReachedFinalStop) {
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
      if (walkActionRef.current) {
        walkActionRef.current.paused = false;
        walkActionRef.current.enabled = true;
        walkActionRef.current.setEffectiveTimeScale(1.5);
        if (!walkActionRef.current.isRunning()) {
          walkActionRef.current.play();
        }
      }
      if (idleActionRef.current) {
        idleActionRef.current.stop();
      }
    }
  });

  if (activeSection !== "credits") return null;

  return (
    <group name="experience-milestone-trail">
      {milestoneStops.map((stop, idx) => {
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
              <>
                <primitive object={torchModel} scale={0.35} position={torchOffset} />
                <pointLight
                  position={[torchOffset[0], 5, torchOffset[2]]}
                  color={isUnlocked ? "#ffa842" : "#4a6070"}
                  intensity={isUnlocked ? 4.5 : 0.4}
                  distance={isUnlocked ? 5 : 1.5}
                  decay={1.8}
                />
              </>
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

      <RigidBody
        ref={catBodyRef}
        type="kinematicPosition"
        colliders="ball"
        friction={1}
        restitution={0}
        position={[0, 0, 0]}
      >
        <primitive
          object={catModel}
          scale={CAT_SCALE}
          position={[0, 0, 0]}
          rotation={[0, Math.PI / 2, 0]}
        />
      </RigidBody>
    </group>
  );
}

useGLTF.preload("/cat_rigged.glb");
useGLTF.preload("/torch.glb");
