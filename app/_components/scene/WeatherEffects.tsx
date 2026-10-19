"use client";

import React, { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

import { resolveWaterLevel } from "./waterLevel";
import { stepWind, wind } from "./windState";

export type RainMode = "auto" | "on" | "off";

type WeatherEffectsProps = {
  lowPerformance: boolean;
  reducedMotion: boolean;
  rainMode: RainMode;
  /** Particles only run once the island is revealed. */
  active: boolean;
};

/** Deterministic PRNG so layouts are stable between renders. */
function makeRandom(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function collectGroundMeshes(scene: THREE.Object3D) {
  const meshes: THREE.Mesh[] = [];
  scene.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (mesh.isMesh && mesh.visible && mesh.userData.isIslandCollider) meshes.push(mesh);
  });
  return meshes;
}

/** Point the camera is roughly looking at, kept over the island. */
function viewFocus(camera: THREE.Camera, out: THREE.Vector3) {
  camera.getWorldDirection(out);
  const dist = THREE.MathUtils.clamp(camera.position.length() * 0.55, 4, 16);
  out.multiplyScalar(dist).add(camera.position);
  const r = Math.hypot(out.x, out.z);
  if (r > 11) {
    out.x *= 11 / r;
    out.z *= 11 / r;
  }
  return out;
}

export function WeatherEffects({ lowPerformance, reducedMotion, rainMode, active }: WeatherEffectsProps) {
  useFrame((_, delta) => stepWind(Math.min(delta, 0.1), reducedMotion));
  return (
    <group name="weather-effects">
      <DriftingClouds count={lowPerformance ? 5 : 8} reducedMotion={reducedMotion} />
      {active && !reducedMotion && <FallingLeaves count={lowPerformance ? 14 : 30} />}
      {active && !reducedMotion && <RainSpell count={lowPerformance ? 110 : 240} mode={rainMode} />}
    </group>
  );
}

/* ----------------------------------------------------------------------------------------------
 * Clouds: a few low-poly puff clusters in ONE instanced mesh, drifting with the wind and wrapping.
 * -------------------------------------------------------------------------------------------- */

const PUFFS_PER_CLOUD = 5;
const CLOUD_FIELD_RADIUS = 46;

type Cloud = {
  x: number;
  z: number;
  y: number;
  scale: number;
  speed: number;
  puffs: { ox: number; oy: number; oz: number; s: number }[];
};

function makeClouds(count: number): Cloud[] {
  const rnd = makeRandom(7 + count);
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2 + rnd() * 0.5;
    const r = 20 + rnd() * 22;
    return {
      x: Math.cos(angle) * r,
      z: Math.sin(angle) * r,
      y: 14.5 + rnd() * 6,
      scale: 1.5 + rnd() * 1.1,
      speed: 0.6 + rnd() * 0.5,
      puffs: Array.from({ length: PUFFS_PER_CLOUD }, (_, k) => ({
        ox: (k - 2) * 1.05 + (rnd() - 0.5) * 0.4,
        oy: (k === 2 ? 0.55 : k === 1 || k === 3 ? 0.25 : 0) + rnd() * 0.15,
        oz: (rnd() - 0.5) * 0.7,
        s: (k === 2 ? 1.35 : k === 0 || k === 4 ? 0.72 : 1.05) * (0.85 + rnd() * 0.3),
      })),
    };
  });
}

function DriftingClouds({ count, reducedMotion }: { count: number; reducedMotion: boolean }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const cloudsRef = useRef<Cloud[]>([]);
  const dummyRef = useRef(new THREE.Object3D());
  const geometry = useMemo(() => new THREE.IcosahedronGeometry(1, 1), []);
  const material = useMemo(
    () =>
      new THREE.MeshLambertMaterial({
        color: "#ffffff",
        flatShading: true,
        emissive: "#b9c8d6",
        emissiveIntensity: 0.22,
      }),
    []
  );

  useEffect(() => {
    cloudsRef.current = makeClouds(count);
  }, [count]);

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material]
  );

  useFrame((_, rawDelta) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const delta = Math.min(rawDelta, 0.1);
    const dummy = dummyRef.current;
    const drift = reducedMotion ? 0.08 : 0.4;
    let n = 0;
    for (let ci = 0; ci < cloudsRef.current.length; ci += 1) {
      const c = cloudsRef.current[ci];
      const v = drift * c.speed * (0.6 + wind.strength);
      c.x += wind.dirX * v * delta;
      c.z += wind.dirZ * v * delta;
      let r = Math.hypot(c.x, c.z);
      if (r > CLOUD_FIELD_RADIUS) {
        // Re-enter on the upwind side, where the edge fade keeps it tiny.
        c.x = -wind.dirX * (CLOUD_FIELD_RADIUS - 0.5);
        c.z = -wind.dirZ * (CLOUD_FIELD_RADIUS - 0.5);
        r = CLOUD_FIELD_RADIUS - 0.5;
      }
      const edge = 1 - THREE.MathUtils.smoothstep(r, CLOUD_FIELD_RADIUS - 7, CLOUD_FIELD_RADIUS);
      const yaw = Math.atan2(wind.dirX, wind.dirZ) + Math.PI / 2;
      const cos = Math.cos(yaw);
      const sin = Math.sin(yaw);
      for (const p of c.puffs) {
        const s = c.scale * p.s * Math.max(0.001, edge);
        const ox = p.ox * c.scale;
        const oz = p.oz * c.scale;
        dummy.position.set(c.x + ox * cos + oz * sin, c.y + p.oy * c.scale, c.z - ox * sin + oz * cos);
        dummy.scale.set(s, s * 0.62, s);
        dummy.rotation.set(0, yaw, 0);
        dummy.updateMatrix();
        mesh.setMatrixAt(n, dummy.matrix);
        n += 1;
      }
    }
    mesh.count = n;
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, count * PUFFS_PER_CLOUD]}
      frustumCulled={false}
      castShadow={false}
      receiveShadow={false}
    />
  );
}

/* ----------------------------------------------------------------------------------------------
 * Falling leaves: a few dozen instanced quads near the view focus. They tumble down with the wind,
 * rest briefly on the ground, shrink away and respawn after a random pause ("occasional").
 * -------------------------------------------------------------------------------------------- */

const LEAF_COLORS = ["#d9822b", "#c4561f", "#e3b23c", "#9c6b2f", "#b7c25a"];

type Leaf = {
  p: THREE.Vector3;
  rot: THREE.Euler;
  spin: THREE.Vector3;
  fall: number;
  phase: number;
  size: number;
  groundY: number;
  probeIn: number;
  state: 0 | 1 | 2; // 0 waiting, 1 falling, 2 resting
  timer: number;
};

function FallingLeaves({ count }: { count: number }) {
  const { camera, scene } = useThree();
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const leavesRef = useRef<Leaf[]>([]);
  const groundRef = useRef<{ meshes: THREE.Mesh[]; scanIn: number; water: number }>({ meshes: [], scanIn: 0, water: 0 });
  const toolsRef = useRef({
    dummy: new THREE.Object3D(),
    ray: new THREE.Raycaster(),
    focus: new THREE.Vector3(),
    down: new THREE.Vector3(0, -1, 0),
    origin: new THREE.Vector3(),
    rnd: makeRandom(31),
  });
  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(0, -0.11);
    shape.quadraticCurveTo(0.075, -0.02, 0, 0.11);
    shape.quadraticCurveTo(-0.075, -0.02, 0, -0.11);
    return new THREE.ShapeGeometry(shape, 3);
  }, []);
  const material = useMemo(() => new THREE.MeshLambertMaterial({ side: THREE.DoubleSide }), []);

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material]
  );

  useEffect(() => {
    const { rnd } = toolsRef.current;
    leavesRef.current = Array.from({ length: count }, () => ({
      p: new THREE.Vector3(),
      rot: new THREE.Euler(rnd() * 6, rnd() * 6, rnd() * 6),
      spin: new THREE.Vector3(1.2 + rnd() * 2.2, 0.6 + rnd() * 1.4, 0.8 + rnd() * 1.8),
      fall: 0.38 + rnd() * 0.25,
      phase: rnd() * Math.PI * 2,
      size: 0.8 + rnd() * 0.6,
      groundY: 0,
      probeIn: 0,
      state: 0,
      timer: rnd() * 7,
    }));
    const mesh = meshRef.current;
    if (mesh) {
      const color = new THREE.Color();
      for (let i = 0; i < count; i += 1) {
        mesh.setColorAt(i, color.set(LEAF_COLORS[i % LEAF_COLORS.length]));
      }
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
  }, [count]);

  useFrame((state, rawDelta) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const delta = Math.min(rawDelta, 0.1);
    const tools = toolsRef.current;
    const ground = groundRef.current;
    ground.scanIn -= delta;
    if (ground.scanIn <= 0) {
      if (ground.meshes.length === 0) ground.meshes = collectGroundMeshes(scene);
      ground.water = resolveWaterLevel(scene);
      ground.scanIn = 3;
    }
    // Leaves land on the island or on the (world-space) water surface, whichever is higher.
    const groundAt = (x: number, z: number) => {
      if (ground.meshes.length === 0) return ground.water;
      tools.ray.set(tools.origin.set(x, 30, z), tools.down);
      tools.ray.far = 40;
      const hit = tools.ray.intersectObjects(ground.meshes, false)[0];
      return hit ? Math.max(hit.point.y, ground.water) : ground.water;
    };
    const t = state.clock.elapsedTime;
    const { dummy, rnd } = tools;
    for (let i = 0; i < leavesRef.current.length; i += 1) {
      const leaf = leavesRef.current[i];
      let scale = 0;
      if (leaf.state === 0) {
        leaf.timer -= delta;
        if (leaf.timer <= 0) {
          const focus = viewFocus(camera, tools.focus);
          const a = rnd() * Math.PI * 2;
          const r = Math.sqrt(rnd()) * 6;
          // Spawn upwind so the drift carries leaves across the view.
          leaf.p.set(
            focus.x + Math.cos(a) * r - wind.dirX * 1.5,
            0,
            focus.z + Math.sin(a) * r - wind.dirZ * 1.5
          );
          leaf.groundY = groundAt(leaf.p.x, leaf.p.z);
          leaf.p.y = Math.max(leaf.groundY, focus.y - 1) + 2.5 + rnd() * 3;
          leaf.probeIn = 0.4;
          leaf.state = 1;
        }
      } else if (leaf.state === 1) {
        const sway = Math.sin(t * 1.7 + leaf.phase);
        const push = 0.35 + wind.strength * 0.9;
        leaf.p.x += (wind.dirX * push + Math.cos(t * 1.3 + leaf.phase) * 0.25) * delta;
        leaf.p.z += (wind.dirZ * push + sway * 0.25) * delta;
        leaf.p.y -= leaf.fall * (0.75 + 0.35 * Math.abs(sway)) * delta;
        leaf.rot.x += leaf.spin.x * delta * (0.7 + wind.strength);
        leaf.rot.y += leaf.spin.y * delta;
        leaf.rot.z += leaf.spin.z * delta * (0.7 + wind.gust);
        leaf.probeIn -= delta;
        if (leaf.probeIn <= 0) {
          leaf.groundY = groundAt(leaf.p.x, leaf.p.z);
          leaf.probeIn = 0.4;
        }
        if (leaf.p.y <= leaf.groundY + 0.015) {
          leaf.p.y = leaf.groundY + 0.015;
          leaf.state = 2;
          leaf.timer = 2.2 + rnd() * 1.5;
        }
        scale = leaf.size;
      } else {
        leaf.timer -= delta;
        // Settle flat-ish, then shrink away.
        leaf.rot.x += (-Math.PI / 2 - leaf.rot.x) * (1 - Math.exp(-6 * delta));
        leaf.rot.z *= 1 - Math.min(1, 6 * delta);
        scale = leaf.size * Math.min(1, leaf.timer / 0.8);
        if (leaf.timer <= 0) {
          leaf.state = 0;
          leaf.timer = 0.5 + rnd() * 6;
        }
      }
      dummy.position.copy(leaf.p);
      dummy.rotation.copy(leaf.rot);
      dummy.scale.setScalar(Math.max(0.0001, scale));
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return <instancedMesh ref={meshRef} args={[geometry, material, count]} frustumCulled={false} />;
}

/* ----------------------------------------------------------------------------------------------
 * Rain spell: low-count instanced streaks in a box around the camera, fading in/out.
 * "auto" schedules an occasional short spell; "on"/"off" force it.
 * -------------------------------------------------------------------------------------------- */

function RainSpell({ count, mode }: { count: number; mode: RainMode }) {
  const { camera } = useThree();
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dropsRef = useRef<{ p: THREE.Vector3; speed: number }[]>([]);
  const stateRef = useRef({ intensity: 0, nextSpellIn: 40, spellLeft: 0 });
  const toolsRef = useRef({
    dummy: new THREE.Object3D(),
    center: new THREE.Vector3(),
    vel: new THREE.Vector3(),
    up: new THREE.Vector3(0, 1, 0),
    rnd: makeRandom(97),
  });
  const geometry = useMemo(() => {
    const a = new THREE.PlaneGeometry(0.014, 0.42);
    const b = new THREE.PlaneGeometry(0.014, 0.42).rotateY(Math.PI / 2);
    const merged = mergeGeometries([a, b]) ?? a;
    if (merged !== a) a.dispose();
    b.dispose();
    return merged;
  }, []);
  const material = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: "#d4e6f3",
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    []
  );

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material]
  );

  useEffect(() => {
    const { rnd } = toolsRef.current;
    dropsRef.current = Array.from({ length: count }, () => ({
      p: new THREE.Vector3((rnd() - 0.5) * 14, (rnd() - 0.5) * 12, (rnd() - 0.5) * 14),
      speed: 8 + rnd() * 3,
    }));
  }, [count]);

  useEffect(() => {
    if (mode === "auto") {
      stateRef.current.nextSpellIn = 25;
      stateRef.current.spellLeft = 0;
    }
  }, [mode]);

  useFrame((_, rawDelta) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const delta = Math.min(rawDelta, 0.1);
    const s = stateRef.current;
    const tools = toolsRef.current;
    let target = 0;
    if (mode === "on") target = 1;
    else if (mode === "auto") {
      if (s.spellLeft > 0) {
        s.spellLeft -= delta;
        target = 1;
        if (s.spellLeft <= 0) s.nextSpellIn = 70 + tools.rnd() * 60;
      } else {
        s.nextSpellIn -= delta;
        if (s.nextSpellIn <= 0) s.spellLeft = 16 + tools.rnd() * 10;
      }
    }
    s.intensity += (target - s.intensity) * (1 - Math.exp(-delta / 2.2));
    if (s.intensity < 0.01) {
      mesh.visible = false;
      return;
    }
    mesh.visible = true;
    (mesh.material as THREE.MeshBasicMaterial).opacity = 0.42 * s.intensity;
    const center = tools.center;
    camera.getWorldDirection(center).multiplyScalar(5).add(camera.position);
    const vel = tools.vel;
    const drops = dropsRef.current;
    const active = Math.max(1, Math.round(drops.length * s.intensity));
    vel.set(wind.dirX * wind.strength * 2.6, -9.5, wind.dirZ * wind.strength * 2.6);
    const { dummy } = tools;
    dummy.quaternion.setFromUnitVectors(tools.up, vel.clone().normalize().negate());
    dummy.scale.setScalar(1);
    for (let i = 0; i < active; i += 1) {
      const d = drops[i];
      const k = d.speed / 9.5;
      d.p.x += vel.x * k * delta;
      d.p.y += vel.y * k * delta;
      d.p.z += vel.z * k * delta;
      // Positions are stored relative to the moving centre; wrap inside a 14 x 12 x 14 box.
      if (d.p.y < -6) {
        d.p.y += 12;
        d.p.x = (tools.rnd() - 0.5) * 14;
        d.p.z = (tools.rnd() - 0.5) * 14;
      }
      if (d.p.x > 7) d.p.x -= 14;
      else if (d.p.x < -7) d.p.x += 14;
      if (d.p.z > 7) d.p.z -= 14;
      else if (d.p.z < -7) d.p.z += 14;
      dummy.position.set(center.x + d.p.x, center.y + d.p.y, center.z + d.p.z);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.count = active;
    mesh.instanceMatrix.needsUpdate = true;
  });

  return <instancedMesh ref={meshRef} args={[geometry, material, count]} frustumCulled={false} />;
}
