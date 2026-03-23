"use client";

import React, { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

import { extractFirstTextureMap } from "./textureUtils";

// Original model radius is ~41 units. Scale 50 → radius ~2050,
// well beyond the ocean (~600) but within camera far plane (5000).
const SKY_SCALE = 50;

export function SkyBackdrop() {
  const { scene } = useGLTF("/sky2.glb") as { scene: THREE.Object3D };

  const skyScene = useMemo(() => {
    const clone = scene.clone(true);

    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const mats = Array.isArray(mesh.material)
          ? mesh.material
          : [mesh.material];

        const newMats = mats.map((mat) => {
          const std = mat as THREE.MeshStandardMaterial;
          const colorMap = std.map || std.emissiveMap;

          return new THREE.MeshBasicMaterial({
            map: colorMap || undefined,
            color: colorMap ? 0xffffff : std.color,
            side: THREE.DoubleSide,
            depthWrite: false,
          });
        });

        mesh.material = newMats.length === 1 ? newMats[0] : newMats;
        mesh.renderOrder = -1;
        mesh.frustumCulled = false;
      }
    });

    return clone;
  }, [scene]);

  // Environment texture for PBR lighting/reflections on island & ocean
  const envTexture = useMemo(() => {
    const tex = extractFirstTextureMap(scene);
    if (!tex) return null;

    const envTex = tex.clone();
    envTex.mapping = THREE.EquirectangularReflectionMapping;
    envTex.needsUpdate = true;
    return envTex;
  }, [scene]);

  return (
    <>
      <primitive
        object={skyScene}
        scale={[SKY_SCALE, SKY_SCALE, SKY_SCALE]}
        dispose={null}
      />
      {envTexture && (
        <primitive attach="environment" object={envTexture} />
      )}
    </>
  );
}
