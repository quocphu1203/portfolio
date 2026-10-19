"use client";

import React, { useEffect, useMemo, useRef } from "react";
import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

import { SKILL_GROUPS } from "../../../mock/skillsData";

/**
 * Cargo crates lashed on the boat's cabin roof, one per skill group. Three instanced meshes (bodies, lids, gems) so the
 * whole cargo costs 3 draw calls. Coordinates are in the boat's local space (the boat group is scaled 0.3).
 */

const CRATE_SIZE = 1.25;
const CRATE_HEIGHT = 0.95;
const LID_THICKNESS = 0.16;
/** Cabin roof top (boat.glb local units). The deck itself sits ~2 units below the bulwark and is hidden. */
const DECK_Y = 14.43;
/** 2 x 2 around the mast lamp in the middle of the roof (roof spans x +-3, z +-1.9). */
const CRATE_SLOTS: [number, number, number][] = [
  [1.68, 0.93, 0.06],
  [1.68, -0.93, -0.05],
  [-1.68, 0.93, -0.07],
  [-1.68, -0.93, 0.05],
];
const LID_OPEN_ANGLE = 1.95;
const LID_STAGGER_SECONDS = 0.38;
const LID_SPEED = 3.2;

const bodyGeometry = new THREE.BoxGeometry(CRATE_SIZE, CRATE_HEIGHT, CRATE_SIZE).translate(0, CRATE_HEIGHT / 2, 0);
// Hinged at the back edge: the lid's origin sits on the hinge line.
const lidGeometry = new THREE.BoxGeometry(CRATE_SIZE + 0.08, LID_THICKNESS, CRATE_SIZE + 0.08).translate(
  0,
  LID_THICKNESS / 2,
  (CRATE_SIZE + 0.08) / 2
);
const gemGeometry = new THREE.OctahedronGeometry(0.26, 0);

export function SkillCrates({
  open,
  highlightGroup,
  reducedMotion,
}: {
  /** Lids open one by one while true (camera has arrived at the boat), close when false. */
  open: boolean;
  /** Group of the currently highlighted skill (its gem bobs higher). */
  highlightGroup: string | null;
  reducedMotion: boolean;
}) {
  const bodiesRef = useRef<THREE.InstancedMesh>(null);
  const lidsRef = useRef<THREE.InstancedMesh>(null);
  const gemsRef = useRef<THREE.InstancedMesh>(null);
  const stateRef = useRef({
    openFor: 0,
    lid: CRATE_SLOTS.map(() => 0),
    time: 0,
    dummy: new THREE.Object3D(),
  });
  const groups = SKILL_GROUPS.slice(0, CRATE_SLOTS.length);

  const materials = useMemo(
    () => ({
      body: new THREE.MeshLambertMaterial({ color: "#9a6a3f" }),
      lid: new THREE.MeshLambertMaterial({ color: "#ffffff" }),
      gem: new THREE.MeshBasicMaterial({ color: "#ffffff", toneMapped: false }),
    }),
    []
  );

  useEffect(() => () => Object.values(materials).forEach((m) => m.dispose()), [materials]);

  // Static parts: crate bodies, and per-crate colours (lid tint + gem colour).
  useEffect(() => {
    const bodies = bodiesRef.current;
    const lids = lidsRef.current;
    const gems = gemsRef.current;
    if (!bodies || !lids || !gems) return;
    const dummy = stateRef.current.dummy;
    const color = new THREE.Color();
    const wood = new THREE.Color("#8a5a32");
    CRATE_SLOTS.forEach(([x, z, yaw], i) => {
      dummy.position.set(x, DECK_Y, z);
      dummy.rotation.set(0, yaw, 0);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      bodies.setMatrixAt(i, dummy.matrix);
      bodies.setColorAt(i, color.set(i % 2 === 0 ? "#9a6a3f" : "#8c5f37"));
      const accent = groups[i]?.color ?? "#cccccc";
      lids.setColorAt(i, color.set(accent).lerp(wood, 0.45));
      gems.setColorAt(i, color.set(accent));
    });
    bodies.instanceMatrix.needsUpdate = true;
    if (bodies.instanceColor) bodies.instanceColor.needsUpdate = true;
    if (lids.instanceColor) lids.instanceColor.needsUpdate = true;
    if (gems.instanceColor) gems.instanceColor.needsUpdate = true;
  }, [groups]);

  useFrame((_, rawDelta) => {
    const lids = lidsRef.current;
    const gems = gemsRef.current;
    if (!lids || !gems) return;
    const delta = Math.min(rawDelta, 0.1);
    const s = stateRef.current;
    s.time += delta;
    s.openFor = open ? s.openFor + delta : 0;
    const dummy = s.dummy;
    CRATE_SLOTS.forEach(([x, z, yaw], i) => {
      // Open one by one; close all together.
      const target = open && (reducedMotion || s.openFor >= i * LID_STAGGER_SECONDS) ? 1 : 0;
      s.lid[i] = reducedMotion ? target : THREE.MathUtils.clamp(s.lid[i] + Math.sign(target - s.lid[i]) * LID_SPEED * delta, 0, 1);
      const k = s.lid[i];
      // Ease-out with a tiny overshoot when opening.
      const eased = k * k * (3 - 2 * k) + Math.sin(k * Math.PI) * 0.06;
      const back = -CRATE_SIZE / 2 - 0.04;
      dummy.position.set(x + Math.sin(yaw) * back, DECK_Y + CRATE_HEIGHT, z + Math.cos(yaw) * back);
      dummy.rotation.set(-LID_OPEN_ANGLE * eased, yaw, 0, "YXZ");
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      lids.setMatrixAt(i, dummy.matrix);

      // Gem rises out of the open crate and spins slowly.
      const isHot = groups[i]?.id === highlightGroup;
      const rise = THREE.MathUtils.smoothstep(k, 0.35, 1);
      const bob = reducedMotion ? 0 : Math.sin(s.time * 2 + i) * 0.08;
      dummy.position.set(x, DECK_Y + CRATE_HEIGHT * 0.55 + rise * (isHot ? 1.25 : 0.85) + bob * rise, z);
      dummy.rotation.set(0, s.time * (reducedMotion ? 0 : 0.9) + i, 0);
      dummy.scale.setScalar(Math.max(0.0001, rise * (isHot ? 1.35 : 1)));
      dummy.updateMatrix();
      gems.setMatrixAt(i, dummy.matrix);
    });
    lids.instanceMatrix.needsUpdate = true;
    gems.instanceMatrix.needsUpdate = true;
  });

  return (
    <group name="skill-crates">
      <instancedMesh ref={bodiesRef} args={[bodyGeometry, materials.body, CRATE_SLOTS.length]} castShadow={false} />
      <instancedMesh ref={lidsRef} args={[lidGeometry, materials.lid, CRATE_SLOTS.length]} castShadow={false} />
      <instancedMesh ref={gemsRef} args={[gemGeometry, materials.gem, CRATE_SLOTS.length]} frustumCulled={false} />
      {open &&
        groups.map((group, i) => {
          const [x, z] = CRATE_SLOTS[i];
          return (
            <Html key={group.id} position={[x, DECK_Y + CRATE_HEIGHT + 1.5 + (i % 2) * 0.6, z]} center distanceFactor={9} zIndexRange={[6, 0]}>
              {/* Icon-only tag (same icon / colour as the crate's section in the Skills dialog). */}
              <span
                className="pointer-events-none rounded-md border bg-[#0c151d]/80 px-1.5 py-0.5 text-[10px] font-bold whitespace-nowrap backdrop-blur-sm"
                style={{ borderColor: `${group.color}aa`, color: group.color }}
              >
                {group.icon}
              </span>
            </Html>
          );
        })}
    </group>
  );
}
