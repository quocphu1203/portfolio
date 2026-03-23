"use client";

import React, { useEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";

export type OrbitControlsInstance = React.ElementRef<typeof OrbitControls>;

export function FantasyIslandFitted({
  controlsRef,
}: {
  controlsRef: React.RefObject<OrbitControlsInstance | null>;
}) {
  const { scene } = useGLTF("/fantasy_island.glb") as { scene: THREE.Object3D };
  const { camera } = useThree();
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
    const desiredRadius = 20;
    const scale = radius > 0 ? desiredRadius / radius : 1;

    // Place: X/Z centered, Y bottom aligned.
    group.scale.setScalar(scale);
    group.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);

    // Orbit around the visual "middle" height (helps show full island).
    const targetY = (size.y / 2) * scale;

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

    // Framing tuning: zoom in so the water fills the viewport.
    const cameraDistanceMultiplier = 0.12;
    const heightMultiplier = 0.12;

    cam.position.set(
      0,
      targetY + desiredRadius * heightMultiplier,
      distance * cameraDistanceMultiplier
    );
    cam.lookAt(0, targetY, 0);
    cam.updateProjectionMatrix();

    // Enforce zoom-out limit.
    // `maxDistance` in OrbitControls is the max distance from `controls.target`.
    if (controls) {
      controls.maxDistance = 40;
      controls.update();
    }
  }, [camera, controlsRef, scene]);

  return (
    <group ref={groupRef}>
      <primitive object={scene} dispose={null} />
    </group>
  );
}

