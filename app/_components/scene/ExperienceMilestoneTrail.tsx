"use client";

import React, { useEffect, useMemo, useRef } from "react";
import { Html } from "@react-three/drei";
import { useGLTF } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";

import { EXPERIENCE_MILESTONES } from "../../../mock/experienceData";
import { usePortfolioNav } from "../navigation/PortfolioNavContext";

const JOURNEY_DURATION_SECONDS = 19;
const CAT_SCALE = 1 / 80;
const CAT_WALL_CLEARANCE = 0;
const CAT_COLLISION_RADIUS = 0.1;
const DOC_SURFACE_OFFSET_Y = 0.03;
const FLAG_OUTER_OFFSET = 0;
const FLAG_SURFACE_OFFSET_Y = 0.02;
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

function pointsFromPathMesh(pathMesh: THREE.Object3D) {
  const mesh = pathMesh as THREE.Mesh;
  const geometry = mesh.geometry as THREE.BufferGeometry | undefined;
  const posAttr = geometry?.getAttribute("position");
  if (!posAttr) return [] as THREE.Vector3[];

  const worldPoints: THREE.Vector3[] = [];
  const wp = new THREE.Vector3();
  for (let i = 0; i < posAttr.count; i += 1) {
    wp.fromBufferAttribute(posAttr, i);
    mesh.localToWorld(wp);
    worldPoints.push(wp.clone());
  }

  if (worldPoints.length === 0) return worldPoints;
  const cleaned: THREE.Vector3[] = [worldPoints[0]];
  for (let i = 1; i < worldPoints.length; i += 1) {
    const prev = cleaned[cleaned.length - 1];
    const cur = worldPoints[i];
    if (cur.distanceTo(prev) < 0.1) continue;
    cleaned.push(cur);
  }
  return cleaned;
}

function pointsFromPathObject(pathObj: THREE.Object3D) {
  const allPoints: THREE.Vector3[] = [];
  pathObj.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) return;
    const pts = pointsFromPathMesh(mesh);
    if (pts.length >= 2) allPoints.push(...pts);
  });
  if (allPoints.length === 0) {
    const direct = pointsFromPathMesh(pathObj);
    if (direct.length >= 2) allPoints.push(...direct);
  }
  if (allPoints.length < 2) return [] as THREE.Vector3[];

  // Build a stable centerline by height slices to avoid random vertex ordering.
  let minY = allPoints[0].y;
  let maxY = allPoints[0].y;
  for (let i = 1; i < allPoints.length; i += 1) {
    const y = allPoints[i].y;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  const range = Math.max(0.001, maxY - minY);
  const bucketCount = Math.max(20, Math.min(72, Math.floor(range / 0.12)));
  const buckets = Array.from({ length: bucketCount }, () => ({
    sumX: 0,
    sumY: 0,
    sumZ: 0,
    count: 0,
  }));

  for (const p of allPoints) {
    const t = THREE.MathUtils.clamp((p.y - minY) / range, 0, 1);
    const idx = Math.min(bucketCount - 1, Math.floor(t * (bucketCount - 1)));
    const b = buckets[idx];
    b.sumX += p.x;
    b.sumY += p.y;
    b.sumZ += p.z;
    b.count += 1;
  }

  const layeredPath: THREE.Vector3[] = [];
  for (const b of buckets) {
    if (b.count === 0) continue;
    layeredPath.push(new THREE.Vector3(b.sumX / b.count, b.sumY / b.count, b.sumZ / b.count));
  }
  if (layeredPath.length < 2) return [] as THREE.Vector3[];

  const stabilized = layeredPath.map((p) => p.clone());
  for (let pass = 0; pass < 2; pass += 1) {
    for (let i = 1; i < stabilized.length - 1; i += 1) {
      const prev = stabilized[i - 1];
      const cur = stabilized[i];
      const next = stabilized[i + 1];
      cur.x = prev.x * 0.2 + cur.x * 0.6 + next.x * 0.2;
      cur.z = prev.z * 0.2 + cur.z * 0.6 + next.z * 0.2;
    }
  }
  return stabilized;
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
  if (count <= 1) return [0.22];
  const start = 0.18;
  const end = 1;
  return Array.from({ length: count }, (_, i) => {
    const t = i / (count - 1);
    return THREE.MathUtils.lerp(start, end, t);
  });
}

export function ExperienceMilestoneTrail() {
  const {
    activeSection,
    experienceJourneyKey,
    experienceUnlockedCount,
    setExperienceUnlockedCount,
    setExperienceCatPose,
  } = usePortfolioNav();
  const { scene: worldScene } = useThree();
  const { scene: catScene, animations } = useGLTF("/cat_rigged.glb") as {
    scene: THREE.Object3D;
    animations: THREE.AnimationClip[];
  };
  const catModel = useMemo(() => clone(catScene), [catScene]);
  const catRef = useRef<THREE.Group | null>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const activeActionRef = useRef<THREE.AnimationAction | null>(null);
  const elapsedRef = useRef(0);
  const runningRef = useRef(false);
  const unlockedRef = useRef(0);
  const prevPosRef = useRef(new THREE.Vector3());
  const headingRef = useRef(0);
  const raycasterRef = useRef(new THREE.Raycaster());
  const docRayRef = useRef(new THREE.Raycaster());
  const pathPoints = useMemo(() => {
    const refreshKey = `${activeSection ?? "none"}-${experienceJourneyKey}`;
    const pathNode = worldScene.getObjectByName("doc");
    if (!pathNode) return smoothPath(FALLBACK_PATH.map((p) => new THREE.Vector3(p[0], p[1], p[2])));
    const built = pointsFromPathObject(pathNode);
    if (built.length >= 2) return smoothPath(built);
    void refreshKey;
    return smoothPath(FALLBACK_PATH.map((p) => new THREE.Vector3(p[0], p[1], p[2])));
  }, [worldScene, activeSection, experienceJourneyKey]);
  const docMeshes = useMemo(() => {
    const docRoot = worldScene.getObjectByName("doc");
    if (!docRoot) return [] as THREE.Mesh[];
    const meshes: THREE.Mesh[] = [];
    docRoot.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (mesh.isMesh) meshes.push(mesh);
    });
    return meshes;
  }, [worldScene]);
  const wallMeshes = useMemo(() => {
    const wallRoots = ["Object_231", "Object_534"]
      .map((name) => worldScene.getObjectByName(name))
      .filter(Boolean);
    if (wallRoots.length === 0) return [] as THREE.Mesh[];
    const meshes: THREE.Mesh[] = [];
    for (const wallRoot of wallRoots) {
      wallRoot?.traverse((child) => {
        const mesh = child as THREE.Mesh;
        if (mesh.isMesh && mesh.userData.isIslandCollider) meshes.push(mesh);
      });
    }
    if (meshes.length === 0) {
      for (const wallRoot of wallRoots) {
        wallRoot?.traverse((child) => {
          const mesh = child as THREE.Mesh;
          if (mesh.isMesh) meshes.push(mesh);
        });
      }
    }
    return meshes;
  }, [worldScene]);

  const progressMarks = useMemo(
    () => flagProgressMarks(EXPERIENCE_MILESTONES.length),
    []
  );
  const flagPositions = useMemo(() => {
    if (pathPoints.length < 2) return [] as THREE.Vector3[];
    const downRay = new THREE.Raycaster();
    const down = new THREE.Vector3(0, -1, 0);
    // Flags are just markers sampled from the doc path.
    return progressMarks.map((t) => {
      const p = lerpPath(pathPoints, t);
      const radial = new THREE.Vector3(p.x, 0, p.z);
      if (radial.lengthSq() > 0.0001) {
        radial.normalize();
        p.addScaledVector(radial, FLAG_OUTER_OFFSET);
      }

      if (docMeshes.length > 0) {
        const from = new THREE.Vector3(p.x, p.y + 2.5, p.z);
        downRay.set(from, down);
        downRay.far = 6;
        const hits = downRay.intersectObjects(docMeshes, true);
        if (hits.length > 0) {
          p.copy(hits[0].point);
          p.y += FLAG_SURFACE_OFFSET_Y;
          return p;
        }
      }

      p.y += 0.03;
      return p;
    });
  }, [pathPoints, progressMarks, docMeshes]);

  useEffect(() => {
    const activeWalk = animations.find((clip) => /walk|run|tro(t|d)|move/i.test(clip.name)) ?? animations[0];
    if (!activeWalk) return;
    const mixer = new THREE.AnimationMixer(catModel);
    mixerRef.current = mixer;
    const action = mixer.clipAction(activeWalk);
    activeActionRef.current = action;
    action.reset();
    action.setLoop(THREE.LoopRepeat, Infinity);
    action.setEffectiveTimeScale(0.95);
    action.play();
    return () => {
      action.stop();
      mixer.stopAllAction();
      mixerRef.current = null;
      activeActionRef.current = null;
    };
  }, [animations, catModel]);

  useEffect(() => {
    if (activeSection !== "credits" || pathPoints.length < 2) return;
    elapsedRef.current = 0;
    runningRef.current = true;
    unlockedRef.current = 0;
    setExperienceUnlockedCount(0);
    const cat = catRef.current;
    if (cat) {
      const start = pathPoints[0];
      const startTan = tangentAt(pathPoints, 0);
      cat.position.copy(offsetOutward(start, startTan, CAT_WALL_CLEARANCE));
      cat.rotation.set(0, 0, 0);
      prevPosRef.current.copy(start);
      headingRef.current = 0;
      setExperienceCatPose({
        position: [cat.position.x, cat.position.y, cat.position.z],
        heading: headingRef.current,
      });
    }
    if (activeActionRef.current) {
      activeActionRef.current.reset();
      activeActionRef.current.fadeIn(0.2);
      activeActionRef.current.play();
    }
  }, [activeSection, experienceJourneyKey, pathPoints, setExperienceUnlockedCount, setExperienceCatPose]);

  useEffect(() => {
    if (activeSection === "credits") return;
    setExperienceCatPose(null);
  }, [activeSection, setExperienceCatPose]);

  useFrame((_, delta) => {
    if (mixerRef.current) {
      mixerRef.current.update(delta);
    }
    if (activeSection !== "credits") return;
    if (!runningRef.current) return;
    if (pathPoints.length < 2) return;

    elapsedRef.current += delta;
    const progress = Math.min(1, elapsedRef.current / JOURNEY_DURATION_SECONDS);
    const pos = lerpPath(pathPoints, progress);
    const tangent = tangentAt(pathPoints, progress);
    const cat = catRef.current;
    if (cat) {
      const dx = pos.x - prevPosRef.current.x;
      const dz = pos.z - prevPosRef.current.z;
      const len = Math.sqrt(dx * dx + dz * dz);
      const targetHeading = len > 0.0001 ? Math.atan2(dx, dz) : headingRef.current;
      const smooth = 1 - Math.exp(-10 * delta);
      headingRef.current = THREE.MathUtils.lerp(headingRef.current, targetHeading, smooth);

      const gaitT = elapsedRef.current * 8.5;
      const pitchRaw = -0.03 + Math.sin(gaitT * 0.7) * 0.02 + tangent.y * 0.12;
      const pitch = THREE.MathUtils.clamp(pitchRaw, -0.14, 0.08);
      const roll = Math.sin(gaitT * 0.5) * 0.04;

      // Cat movement follows doc path and snaps to doc surface.
      const safePos = offsetOutward(pos, tangent, CAT_WALL_CLEARANCE);
      const nextPos = new THREE.Vector3(safePos.x, safePos.y, safePos.z);
      if (docMeshes.length > 0) {
        const docRay = docRayRef.current;
        docRay.set(new THREE.Vector3(nextPos.x, safePos.y + 3.5, nextPos.z), new THREE.Vector3(0, -1, 0));
        docRay.far = 8;
        const floorHits = docRay.intersectObjects(docMeshes, true);
        if (floorHits.length > 0) {
          nextPos.y = floorHits[0].point.y + DOC_SURFACE_OFFSET_Y;
        }
      }
      const currentPos = cat.position.clone();
      const moveDir = nextPos.clone().sub(currentPos);
      if (wallMeshes.length > 0 && moveDir.lengthSq() > 0.000001) {
        const ray = raycasterRef.current;
        ray.set(currentPos, moveDir.clone().normalize());
        ray.far = moveDir.length() + CAT_COLLISION_RADIUS;
        const hits = ray.intersectObjects(wallMeshes, true);
        if (hits.length > 0) {
          const hit = hits[0];
          if (hit.face) {
            const normal = hit.face.normal.clone().transformDirection(hit.object.matrixWorld).normalize();
            nextPos.copy(hit.point).addScaledVector(normal, CAT_COLLISION_RADIUS);
          } else {
            nextPos.copy(currentPos);
          }
        }
      }
      cat.position.copy(nextPos);
      cat.rotation.set(pitch, headingRef.current + Math.PI, roll);
      prevPosRef.current.copy(pos);
      setExperienceCatPose({
        position: [cat.position.x, cat.position.y, cat.position.z],
        heading: headingRef.current,
      });
    }

    let unlocked = 0;
    for (let i = 0; i < EXPERIENCE_MILESTONES.length; i += 1) {
      const threshold = progressMarks[i] ?? 1;
      if (progress >= threshold) unlocked = i + 1;
    }
    if (unlocked !== unlockedRef.current) {
      unlockedRef.current = unlocked;
      setExperienceUnlockedCount(unlocked);
    }

    if (progress >= 1) {
      if (cat) {
        const endPos = lerpPath(pathPoints, 1);
        const finalPos = offsetOutward(endPos, tangentAt(pathPoints, 1), CAT_WALL_CLEARANCE);
        if (docMeshes.length > 0) {
          const docRay = docRayRef.current;
          docRay.set(new THREE.Vector3(finalPos.x, finalPos.y + 3.5, finalPos.z), new THREE.Vector3(0, -1, 0));
          docRay.far = 8;
          const floorHits = docRay.intersectObjects(docMeshes, true);
          if (floorHits.length > 0) {
            finalPos.y = floorHits[0].point.y + DOC_SURFACE_OFFSET_Y;
          }
        }
        cat.position.copy(finalPos);
      }
      runningRef.current = false;
    }
  });

  if (activeSection !== "credits") return null;

  return (
    <group name="experience-milestone-trail">
      {flagPositions.map((flagPos, idx) => {
        const isUnlocked = idx < experienceUnlockedCount;
        const tangent = tangentAt(pathPoints, progressMarks[idx] ?? 0);
        const flagYaw = Math.atan2(tangent.x, tangent.z);
        return (
          <group key={EXPERIENCE_MILESTONES[idx].id} position={flagPos.toArray()} rotation={[0, flagYaw, 0]}>
            <mesh position={[0, 0.55, 0]} castShadow receiveShadow>
              <cylinderGeometry args={[0.035, 0.035, 1.1, 12]} />
              <meshStandardMaterial color="#c8d6df" metalness={0.35} roughness={0.5} />
            </mesh>
            <mesh position={[0.26, 0.84, 0]} castShadow receiveShadow>
              <boxGeometry args={[0.45, 0.24, 0.03]} />
              <meshStandardMaterial
                color={isUnlocked ? "#f4ad3d" : "#5f6e79"}
                emissive={isUnlocked ? "#a75a17" : "#1d252b"}
                emissiveIntensity={isUnlocked ? 0.32 : 0.1}
              />
            </mesh>
            <Html position={[0.05, 1.25, 0]} distanceFactor={16} center zIndexRange={[8, 0]}>
              <span
                className={[
                  "pointer-events-none rounded-full border px-2 py-0.5 text-[10px] tracking-[0.08em] whitespace-nowrap",
                  isUnlocked
                    ? "border-[#dca869]/80 bg-[#2f1f11]/80 text-[#fce6c4]"
                    : "border-[#4e6673]/70 bg-[#11212b]/70 text-[#9fb8c4]",
                ].join(" ")}
              >
                {EXPERIENCE_MILESTONES[idx].period}
              </span>
            </Html>
          </group>
        );
      })}

      <group ref={catRef} position={[0, 0, 0]}>
        <primitive
          object={catModel}
          scale={CAT_SCALE}
          position={[0, 0.03, 0]}
          rotation={[0, Math.PI / 2, 0]}
        />
      </group>
    </group>
  );
}

useGLTF.preload("/cat_rigged.glb");
