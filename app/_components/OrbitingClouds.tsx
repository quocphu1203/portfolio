"use client";

import React, { useMemo, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface CloudConfig {
  radius: number;
  height: number;
  speed: number;
  scale: number;
  initialAngle: number;
}

function buildCloudMaterial(
  opacity: number,
  depthWrite: boolean
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: 0xffffff,
    transparent: true,
    opacity,
    side: THREE.DoubleSide,
    depthWrite,
    toneMapped: false,
  });
}

function cloneCloudScene(
  scene: THREE.Object3D,
  opacity: number,
  depthWrite: boolean
): THREE.Object3D {
  const clone = scene.clone(true);
  clone.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mesh.material = mats.map((mat) => {
        const m = mat as THREE.MeshStandardMaterial;
        const matOut = buildCloudMaterial(opacity, depthWrite);
        if (m.map) {
          matOut.map = m.map;
          matOut.color.setHex(0xffffff);
        } else {
          matOut.color.copy(m.color ?? new THREE.Color(0xffffff));
        }
        return matOut;
      });
      mesh.material =
        Array.isArray(mesh.material) && mesh.material.length === 1
          ? mesh.material[0]
          : mesh.material;
    }
  });
  return clone;
}

/** Wide ring, soft — reads as sky / atmosphere behind the island. */
function generateAtmosphereConfigs(count: number): CloudConfig[] {
  const configs: CloudConfig[] = [];
  for (let i = 0; i < count; i++) {
    configs.push({
      radius: 14 + Math.random() * 16,
      height: 8 + Math.random() * 14,
      speed: 0.02 + Math.random() * 0.012,
      scale: 0.085 + Math.random() * 0.035,
      initialAngle: (i / count) * Math.PI * 2 + Math.random() * 0.6,
    });
  }
  return configs;
}

/**
 * Fewer clouds clustered into orbital “wedges” — softly masks some directions
 * (portfolio metaphor: areas not unlocked yet). Rendered after the island.
 */
function generateVeilConfigs(count: number): CloudConfig[] {
  const sectors = 3;
  const configs: CloudConfig[] = [];
  for (let i = 0; i < count; i++) {
    const s = i % sectors;
    const sectorStart = (s / sectors) * Math.PI * 2;
    const angle = sectorStart + Math.random() * 0.95 + 0.08;
    configs.push({
      radius: 6.5 + Math.random() * 7,
      height: 3.2 + Math.random() * 6,
      speed: 0.014 + Math.random() * 0.009,
      scale: 0.12 + Math.random() * 0.055,
      initialAngle: angle,
    });
  }
  return configs;
}

function CloudOrbiter({
  opacity,
  depthWrite,
  renderOrder,
  configs,
}: {
  opacity: number;
  depthWrite: boolean;
  renderOrder: number;
  configs: CloudConfig[];
}) {
  const { scene } = useGLTF("/low_poly_cloud.glb") as { scene: THREE.Object3D };
  const groupRef = useRef<THREE.Group>(null);

  const cloudMeshes = useMemo(() => {
    return configs.map(() => cloneCloudScene(scene, opacity, depthWrite));
  }, [scene, configs, opacity, depthWrite]);

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group) return;

    group.children.forEach((child, i) => {
      const cfg = configs[i];
      if (!cfg) return;
      cfg.initialAngle += cfg.speed * delta;
      child.position.x = Math.cos(cfg.initialAngle) * cfg.radius;
      child.position.z = Math.sin(cfg.initialAngle) * cfg.radius;
      child.position.y = cfg.height + Math.sin(cfg.initialAngle * 3 + i * 2) * 0.35;
      child.rotation.y = -cfg.initialAngle + Math.PI / 2;
      child.rotation.z = Math.sin(cfg.initialAngle * 2 + i) * 0.05;
    });
  });

  return (
    <group ref={groupRef} renderOrder={renderOrder}>
      {cloudMeshes.map((mesh, i) => (
        <primitive
          key={i}
          object={mesh}
          scale={configs[i].scale}
          rotation={[0, Math.PI, 0]}
          position={[
            Math.cos(configs[i].initialAngle) * configs[i].radius,
            configs[i].height,
            Math.sin(configs[i].initialAngle) * configs[i].radius,
          ]}
        />
      ))}
    </group>
  );
}

const ATMOSPHERE_COUNT = 9;
const VEIL_COUNT = 5;

export function OrbitingCloudsAtmosphere() {
  const configs = useMemo(() => generateAtmosphereConfigs(ATMOSPHERE_COUNT), []);
  return (
    <CloudOrbiter
      configs={configs}
      opacity={0.38}
      depthWrite={false}
      renderOrder={1}
    />
  );
}

export function OrbitingCloudsVeil() {
  const configs = useMemo(() => generateVeilConfigs(VEIL_COUNT), []);
  return (
    <CloudOrbiter
      configs={configs}
      opacity={0.58}
      depthWrite={false}
      renderOrder={4}
    />
  );
}
