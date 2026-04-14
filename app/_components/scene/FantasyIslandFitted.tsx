"use client";

import React, { useEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";

import { IslandWater } from "./IslandWater";
import { usePortfolioNav } from "../navigation/PortfolioNavContext";
import { ISLAND_WATER_LEVEL } from "./islandSceneConstants";

export type OrbitControlsInstance = React.ElementRef<typeof OrbitControls>;

export function FantasyIslandFitted({
  controlsRef,
}: {
  controlsRef: React.RefObject<OrbitControlsInstance | null>;
}) {
  const { scene } = useGLTF("/island2.glb") as { scene: THREE.Object3D };
  const { camera } = useThree();
  const groupRef = useRef<THREE.Group | null>(null);
  const layoutAppliedRef = useRef(false);
  const { setOrbitTargetY, setSignpostTransform } = usePortfolioNav();

  useEffect(() => {
    const group = groupRef.current;
    if (!group || layoutAppliedRef.current) return;

    let cancelled = false;
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

      const desiredRadius = 20;
      const scale = radius > 0 ? desiredRadius / radius : 1;

      group.scale.setScalar(scale);
      group.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);

      const targetY = (size.y / 2) * scale;

      scene.traverse((child) => {
        const mesh = child as THREE.Mesh;
        if (!mesh.isMesh) return;

        mesh.castShadow = true;
        mesh.receiveShadow = true;
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const mat of materials) {
          const m = mat as unknown as { envMapIntensity?: number };
          if (typeof m?.envMapIntensity === "number") m.envMapIntensity = 0.25;
        }
      });

      // Mark selected objects as collision meshes for runtime raycast checks.
      const colliderRoots = ["Object_231", "Object_534", "doc", "Object_546"]
        .map((name) => scene.getObjectByName(name))
        .filter(Boolean);
      for (const root of colliderRoots) {
        root?.traverse((child) => {
          const mesh = child as THREE.Mesh;
          if (!mesh.isMesh) return;
          mesh.userData.isIslandCollider = true;
          const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          for (const mat of materials) {
            const m = mat as THREE.Material & { side?: THREE.Side };
            if (typeof m.side === "number") m.side = THREE.DoubleSide;
          }
        });
      }

      const cam = camera as THREE.PerspectiveCamera;
      const orbitAimY = targetY * 0.7;
      controls.target.set(0, orbitAimY, 0);

      cam.position.set(-11, targetY * 0.92, -34);
      cam.lookAt(0, orbitAimY, 0);
      cam.updateProjectionMatrix();

      const currentDistance = cam.position.distanceTo(controls.target);
      controls.maxDistance = Math.max(currentDistance * 1, 40);

      controls.minPolarAngle = 0.12;
      controls.maxPolarAngle = Math.PI - 0.12;

      controls.update();

      group.updateWorldMatrix(true, true);
      const signpost = scene.getObjectByName("Object_196");
      if (signpost) {
        const wp = new THREE.Vector3();
        const wq = new THREE.Quaternion();
        const euler = new THREE.Euler();
        signpost.getWorldPosition(wp);
        signpost.getWorldQuaternion(wq);
        euler.setFromQuaternion(wq, "YXZ");
        setSignpostTransform({
          position: [wp.x, wp.y, wp.z],
          rotationY: euler.y,
        });
      } else {
        setSignpostTransform(null);
      }

      setOrbitTargetY(targetY);
      layoutAppliedRef.current = true;
    };

    applyLayout();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [camera, controlsRef, scene, setOrbitTargetY, setSignpostTransform]);

  const waterSize = 6000;

  return (
    <group ref={groupRef}>
      <primitive object={scene} dispose={null} />
      <IslandWater size={waterSize} y={ISLAND_WATER_LEVEL} />
    </group>
  );
}

useGLTF.preload("/island2.glb");
