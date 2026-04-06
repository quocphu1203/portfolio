"use client";

import React, { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import { Water } from "three/addons/objects/Water.js";

import { useTimeOfDay } from "../time/TimeOfDayContext";

const WATER_NORMALS_URL = "https://threejs.org/examples/textures/waternormals.jpg";

export function IslandWater({ size, y }: { size: number; y: number }) {
  const { activePreset } = useTimeOfDay();
  const waterNormals = useTexture(WATER_NORMALS_URL);
  waterNormals.wrapS = THREE.RepeatWrapping;
  waterNormals.wrapT = THREE.RepeatWrapping;

  const waterObject = useMemo(() => {
    // A circular water mesh avoids visible square corners near the horizon.
    const geometry = new THREE.CircleGeometry(size, 128);
    const object = new Water(geometry, {
      textureWidth: 1024,
      textureHeight: 1024,
      waterNormals,
      sunDirection: new THREE.Vector3(...activePreset.sunDir).normalize(),
      sunColor: 0xffffff,
      waterColor: 0x1f4f6b,
      distortionScale: 3.4,
      alpha: 0.95,
      fog: false,
    });
    object.rotation.x = -Math.PI / 2;
    object.position.y = y;
    object.receiveShadow = true;
    return object;
  }, [activePreset.sunDir, size, waterNormals, y]);

  useFrame((_, delta) => {
    const material = waterObject.material as THREE.ShaderMaterial;
    const uniforms = material.uniforms as Record<string, { value: unknown }> | undefined;
    if (!uniforms) return;

    const time = uniforms.time;
    if (typeof time?.value === "number") {
      time.value += delta * 0.35;
    }

    const sunDirection = uniforms.sunDirection;
    if (sunDirection?.value instanceof THREE.Vector3) {
      sunDirection.value.set(...activePreset.sunDir).normalize();
    }
  });

  return <primitive object={waterObject} dispose={null} />;
}

useTexture.preload(WATER_NORMALS_URL);
