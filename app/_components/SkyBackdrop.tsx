"use client";

import React, { useEffect, useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";

import { extractFirstTextureMap } from "./textureUtils";

// Original model radius is ~41 units. Scale 50 → radius ~2050,
// well beyond the ocean (~600) but within camera far plane (5000).
const SKY_SCALE = 50;

export function SkyBackdrop() {
  const { scene } = useGLTF("/sea_sky.glb") as { scene: THREE.Object3D };
  const { gl } = useThree();

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

          // Ensure color textures are treated as sRGB for correct, vibrant colors.
          if (colorMap && colorMap instanceof THREE.Texture) {
            colorMap.colorSpace = THREE.SRGBColorSpace;
            colorMap.needsUpdate = true;
          }

          return new THREE.MeshBasicMaterial({
            map: colorMap || undefined,
            color: colorMap ? 0xffffff : std.color,
            side: THREE.DoubleSide,
            depthWrite: false,
            // Sky is already "baked" as colors in the texture; disable tone-mapping for punchier colors.
            toneMapped: false,
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
    envTex.colorSpace = THREE.SRGBColorSpace;
    envTex.needsUpdate = true;
    return envTex;
  }, [scene]);

  const pmremEnvMap = useMemo(() => {
    if (!envTexture) return null;

    // Three.js expects a prefiltered environment map (PMREM) for physically-based reflections.
    const pmremGenerator = new THREE.PMREMGenerator(gl);
    pmremGenerator.compileEquirectangularShader();
    const renderTarget = pmremGenerator.fromEquirectangular(envTexture);

    // Dispose generator but keep the generated texture.
    pmremGenerator.dispose();

    return renderTarget.texture;
  }, [envTexture, gl]);

  useEffect(() => {
    if (!envTexture) {
      console.warn("[SkyBackdrop] Could not extract an environment texture from sky.glb.");
    }
    if (envTexture && !pmremEnvMap) {
      console.warn("[SkyBackdrop] PMREM env map generation returned null/undefined.");
    }
  }, [envTexture, pmremEnvMap]);

  return (
    <>
      <primitive
        object={skyScene}
        scale={[SKY_SCALE, SKY_SCALE, SKY_SCALE]}
        position={[0, -1.5, 0]}
        rotation={[0, Math.PI / 2 + Math.PI, 0]}
        dispose={null}
      />
      {pmremEnvMap && <primitive attach="environment" object={pmremEnvMap} />}
    </>
  );
}
