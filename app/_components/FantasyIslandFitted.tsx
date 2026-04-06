"use client";

import React, { useEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";

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

  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;

    // Compute bounds from the loaded glTF scene.
    const box = new THREE.Box3().setFromObject(scene);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    // Compute a stable scale so the whole island fits nicely.
    const sphere = new THREE.Sphere();
    box.getBoundingSphere(sphere);
    const radius = sphere.radius;

    // Adjust this to match the framing you want.
    const desiredRadius = 25;
    const scale = radius > 0 ? desiredRadius / radius : 1;

    // Place: X/Z centered, Y bottom aligned.
    group.scale.setScalar(scale);
    group.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);

    // Orbit around the visual "middle" height (helps show full island).
    const targetY = (size.y / 2) * scale;

    const envMap = (threeScene as unknown as { environment?: THREE.Texture | null }).environment ?? null;

    // Reduce island reflections but force the ocean to a PBR material so it can reflect the sky.
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
        // For non-ocean meshes, keep it a bit less reflective.
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

    // Re-apply envMap once more in case `SkyBackdrop` environment is assigned async.
    const timeoutId = window.setTimeout(() => {
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

    // Update controls target to match our centered transform.
    const controls = controlsRef.current;
    if (controls) {
      controls.target.set(0, targetY, 0);
      controls.update();
    }

    // Reposition camera to frame the object.
    // Make the ocean extend well beyond the city walls.
    // Note: `Object_238` is the water/ocean mesh inside `fantasy_island.glb`.
    const oceanObj = scene.getObjectByName("Object_238");
    if (oceanObj) {
      // Scale aggressively so we never see ocean edges.
      // If you still see edges, increase this number (e.g. 40, 60...).
      const oceanWorldMultiplier = 30;

      const oceanBoxBefore = new THREE.Box3().setFromObject(oceanObj);
      const oceanSizeBefore = oceanBoxBefore.getSize(new THREE.Vector3());

      const desiredOceanWorldSizeX = size.x * scale * oceanWorldMultiplier;
      const desiredOceanWorldSizeZ = size.z * scale * oceanWorldMultiplier;

      if (oceanSizeBefore.x > 1e-6)
        oceanObj.scale.x *= desiredOceanWorldSizeX / oceanSizeBefore.x;
      if (oceanSizeBefore.z > 1e-6)
        oceanObj.scale.z *= desiredOceanWorldSizeZ / oceanSizeBefore.z;

      // Re-center ocean in X/Z so it stays under the island after scaling.
      const oceanBoxAfter = new THREE.Box3().setFromObject(oceanObj);
      const oceanCenterAfter = oceanBoxAfter.getCenter(new THREE.Vector3());
      const desiredWorldCenter = new THREE.Vector3(0, oceanCenterAfter.y, 0);

      const deltaWorld = desiredWorldCenter.sub(oceanCenterAfter);
      const groupScaleX = group.scale.x || 1;
      const groupScaleZ = group.scale.z || 1;

      // Convert world delta to local delta (group scaling is uniform-ish here).
      oceanObj.position.x += deltaWorld.x / groupScaleX;
      oceanObj.position.z += deltaWorld.z / groupScaleZ;

      // Avoid clipping at the edges when the camera is close.
      oceanObj.frustumCulled = false;
    }

    const cam = camera as THREE.PerspectiveCamera;
    const fovRad = (cam.fov * Math.PI) / 180;
    const distance = desiredRadius / Math.tan(fovRad / 2);

    const cameraDistanceMultiplier = 0.13;

    cam.position.set(
      -5,
      targetY * 0.7,
      -(distance * cameraDistanceMultiplier)
    );
    cam.lookAt(0, targetY * 0.7, 0);
    cam.updateProjectionMatrix();

    // Enforce zoom-out limit.
    // `maxDistance` in OrbitControls is the max distance from `controls.target`.
    if (controls) {
      const currentDistance = cam.position.distanceTo(controls.target);
      controls.maxDistance = currentDistance;

      const polarAngle = controls.getPolarAngle();
      controls.minPolarAngle = polarAngle;
      controls.maxPolarAngle = polarAngle;

      controls.update();
    }

    // Cleanup for the timeout.
    return () => window.clearTimeout(timeoutId);
  }, [camera, controlsRef, scene, threeScene]);

  return (
    <group ref={groupRef}>
      <primitive object={scene} dispose={null} />
    </group>
  );
}

