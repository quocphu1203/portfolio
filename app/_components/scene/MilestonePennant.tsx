"use client";

import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

import { wind } from "./windState";

const POLE_HEIGHT = 0.78;
const FLAG_WIDTH = 0.32;
const FLAG_HEIGHT = 0.18;

type FlagShader = { uniforms: Record<string, THREE.IUniform<number>> };

// Pennant cloth: plane anchored at the pole (x = 0); a travelling sine wave whose amplitude grows
// towards the free end, driven by the shared wind. Normals are left as-is (cheap, reads fine).
function flagOnBeforeCompile(this: THREE.Material, shader: THREE.WebGLProgramParametersWithUniforms) {
  shader.uniforms.uTime = { value: 0 };
  shader.uniforms.uWind = { value: 0.5 };
  shader.uniforms.uAmp = { value: 1 };
  shader.vertexShader = shader.vertexShader
    .replace("#include <common>", "#include <common>\nuniform float uTime;\nuniform float uWind;\nuniform float uAmp;")
    .replace(
      "#include <begin_vertex>",
      `#include <begin_vertex>
      float flagK = clamp(position.x / ${FLAG_WIDTH.toFixed(3)}, 0.0, 1.0);
      float flagSpeed = 4.0 + uWind * 6.0;
      float flagWave = sin(position.x * 19.0 - uTime * flagSpeed) * 0.032
        + sin(position.x * 33.0 - uTime * (flagSpeed * 1.7) + position.y * 11.0) * 0.012 * uWind;
      transformed.z += flagWave * flagK * (0.35 + uWind) * uAmp;
      transformed.y -= flagK * flagK * 0.035 * (1.0 - uWind);`
    );
  this.userData.flagShader = shader as FlagShader;
}

const flagGeometry = new THREE.PlaneGeometry(FLAG_WIDTH, FLAG_HEIGHT, 12, 3).translate(FLAG_WIDTH / 2, 0, 0);

export function MilestonePennant({
  position,
  parentYaw,
  color,
  reducedMotion,
}: {
  position: [number, number, number];
  parentYaw: number;
  color: string;
  reducedMotion: boolean;
}) {
  const clothRef = useRef<THREE.Group>(null);
  const flagMeshRef = useRef<THREE.Mesh>(null);

  useFrame((state, rawDelta) => {
    const delta = Math.min(rawDelta, 0.1);
    const cloth = clothRef.current;
    if (cloth) {
      // Stream downwind: local +x should point along the wind (minus the milestone's own yaw).
      const target = Math.atan2(-wind.dirZ, wind.dirX) - parentYaw;
      const diff = Math.atan2(Math.sin(target - cloth.rotation.y), Math.cos(target - cloth.rotation.y));
      cloth.rotation.y += diff * (1 - Math.exp(-1.5 * delta));
    }
    const mat = flagMeshRef.current?.material as THREE.Material | undefined;
    const shader = mat?.userData.flagShader as FlagShader | undefined;
    if (shader) {
      shader.uniforms.uTime.value = state.clock.elapsedTime;
      shader.uniforms.uWind.value = wind.strength;
      shader.uniforms.uAmp.value = reducedMotion ? 0.3 : 1;
    }
  });

  return (
    <group position={position}>
      <mesh position={[0, POLE_HEIGHT / 2, 0]} castShadow={false}>
        <cylinderGeometry args={[0.007, 0.009, POLE_HEIGHT, 6]} />
        <meshLambertMaterial color="#5a3d26" />
      </mesh>
      <group ref={clothRef} position={[0, POLE_HEIGHT - FLAG_HEIGHT / 2 - 0.01, 0]}>
        <mesh ref={flagMeshRef} geometry={flagGeometry}>
          <meshLambertMaterial color={color} side={THREE.DoubleSide} onBeforeCompile={flagOnBeforeCompile} />
        </mesh>
      </group>
    </group>
  );
}
