"use client";

import React, { useEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";

import { usePortfolioNav } from "./PortfolioNavContext";

export type OrbitControlsInstance = React.ElementRef<typeof OrbitControls>;

type ExtendedMaterial = THREE.Material & {
  map?: THREE.Texture;
  color?: THREE.Color;
  emissive?: THREE.Color;
  emissiveMap?: THREE.Texture;
  normalMap?: THREE.Texture;
  roughness?: number;
  metalness?: number;
  roughnessMap?: THREE.Texture;
  metalnessMap?: THREE.Texture;
  aoMap?: THREE.Texture;
  aoMapIntensity?: number;
  emissiveIntensity?: number;
  transparent?: boolean;
  opacity?: number;
  side?: THREE.Side;
};

export function FantasyIslandFitted({
  controlsRef,
}: {
  controlsRef: React.RefObject<OrbitControlsInstance | null>;
}) {
  const { scene } = useGLTF("/fantasy_island.glb") as { scene: THREE.Object3D };
  const { camera, scene: threeScene } = useThree();
  const groupRef = useRef<THREE.Group | null>(null);
  const layoutAppliedRef = useRef(false);
  const { setOrbitTargetY } = usePortfolioNav();

  useEffect(() => {
    const group = groupRef.current;
    if (!group || layoutAppliedRef.current) return;

    let cancelled = false;
    let timeoutId = 0;
    let raf = 0;
    let attempts = 0;
    const maxAttempts = 180;

    const applyLayout = () => {
      if (cancelled || layoutAppliedRef.current) return;

      const controls = controlsRef.current;
      if (!controls) {
        if (attempts++ < maxAttempts) {
          raf = requestAnimationFrame(applyLayout);
        }
        return;
      }

      const box = new THREE.Box3().setFromObject(scene);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());

      const sphere = new THREE.Sphere();
      box.getBoundingSphere(sphere);
      const radius = sphere.radius;

      const desiredRadius = 25;
      const scale = radius > 0 ? desiredRadius / radius : 1;

      group.scale.setScalar(scale);
      group.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);

      const targetY = (size.y / 2) * scale;

      const envMap =
        (threeScene as unknown as { environment?: THREE.Texture | null }).environment ?? null;

      let oceanFound = false;
      scene.traverse((child) => {
        const mesh = child as THREE.Mesh;
        if (!mesh.isMesh) return;

        mesh.castShadow = true;
        mesh.receiveShadow = true;

        const isOcean = mesh.name === "Object_238" || mesh.name.includes("Object_238");
        if (isOcean) oceanFound = true;

        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];

        const updated = isOcean
          ? materials.map((mat) => {
            const m = mat as unknown as ExtendedMaterial;

            const params: THREE.MeshStandardMaterialParameters = {
              color: new THREE.Color(0x8fb8c8),
              emissive: new THREE.Color(0x1a0a12),
              emissiveIntensity: 0.15,
              roughness: 0.25,
              metalness: 0.35,
              envMap: envMap ?? undefined,
              envMapIntensity: 1.6,
              transparent: true,
              opacity: 0.92,
            };

            if (m?.map instanceof THREE.Texture) params.map = m.map;
            if (m?.emissiveMap instanceof THREE.Texture) params.emissiveMap = m.emissiveMap;
            if (m?.normalMap instanceof THREE.Texture) params.normalMap = m.normalMap;

            if (typeof m?.side !== "undefined") params.side = m.side;
            const newMat = new THREE.MeshStandardMaterial(params);
            newMat.needsUpdate = true;
            return newMat;
          })
          : materials;

        if (isOcean) {
          mesh.material = updated.length === 1 ? updated[0] : updated;
        } else {
          for (const mat of materials) {
            const m = mat as unknown as { envMapIntensity?: number };
            if (typeof m?.envMapIntensity === "number") m.envMapIntensity = 0.25;
          }
        }
      });

      if (!oceanFound) {
        console.warn("[FantasyIslandFitted] Ocean mesh not found (Object_238).");
      }
      if (oceanFound && !envMap) {
        console.warn("[FantasyIslandFitted] Ocean envMap is null at material build time.");
      }

      const oceanObj = scene.getObjectByName("Object_238");
      if (oceanObj) {
        const oceanWorldMultiplier = 30;

        const oceanBoxBefore = new THREE.Box3().setFromObject(oceanObj);
        const oceanSizeBefore = oceanBoxBefore.getSize(new THREE.Vector3());

        const desiredOceanWorldSizeX = size.x * scale * oceanWorldMultiplier;
        const desiredOceanWorldSizeZ = size.z * scale * oceanWorldMultiplier;

        if (oceanSizeBefore.x > 1e-6)
          oceanObj.scale.x *= desiredOceanWorldSizeX / oceanSizeBefore.x;
        if (oceanSizeBefore.z > 1e-6)
          oceanObj.scale.z *= desiredOceanWorldSizeZ / oceanSizeBefore.z;

        const oceanBoxAfter = new THREE.Box3().setFromObject(oceanObj);
        const oceanCenterAfter = oceanBoxAfter.getCenter(new THREE.Vector3());
        const desiredWorldCenter = new THREE.Vector3(0, oceanCenterAfter.y, 0);

        const deltaWorld = desiredWorldCenter.sub(oceanCenterAfter);
        const groupScaleX = group.scale.x || 1;
        const groupScaleZ = group.scale.z || 1;

        oceanObj.position.x += deltaWorld.x / groupScaleX;
        oceanObj.position.z += deltaWorld.z / groupScaleZ;

        oceanObj.frustumCulled = false;
      }

      const cam = camera as THREE.PerspectiveCamera;
      const orbitAimY = targetY * 0.7;
      controls.target.set(0, orbitAimY, 0);

      cam.position.set(-5.5, targetY * 0.78, -16);
      cam.lookAt(0, orbitAimY, 0);
      cam.updateProjectionMatrix();

      const currentDistance = cam.position.distanceTo(controls.target);
      controls.maxDistance = Math.max(currentDistance * 1.6, 40);

      const polarAngle = controls.getPolarAngle();
      controls.minPolarAngle = polarAngle;
      controls.maxPolarAngle = polarAngle;

      controls.update();

      setOrbitTargetY(targetY);
      layoutAppliedRef.current = true;

      timeoutId = window.setTimeout(() => {
        const envMapLate =
          (threeScene as unknown as { environment?: THREE.Texture | null }).environment ?? null;

        if (oceanFound && !envMapLate) {
          console.warn("[FantasyIslandFitted] Ocean envMap is null after late re-apply.");
        }

        scene.traverse((child) => {
          const mesh = child as THREE.Mesh;
          if (!mesh.isMesh) return;

          const isOcean = mesh.name === "Object_238" || mesh.name.includes("Object_238");
          if (!isOcean) return;

          const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          const updated = materials.map((mat) => {
            if (mat instanceof THREE.MeshStandardMaterial) {
              mat.envMap = envMapLate;
              mat.envMapIntensity = 2.0;
              mat.needsUpdate = true;
            }
            return mat;
          });

          mesh.material = updated.length === 1 ? updated[0] : updated;
        });
      }, 0);
    };

    applyLayout();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      window.clearTimeout(timeoutId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- single layout; threeScene/env would corrupt bounds if re-run
  }, [camera, controlsRef, scene, setOrbitTargetY]);

  return (
    <group ref={groupRef}>
      <primitive object={scene} dispose={null} />
    </group>
  );
}
