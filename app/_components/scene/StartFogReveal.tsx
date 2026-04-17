"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

type StartFogRevealProps = {
  active: boolean;
  open: boolean;
  durationMs?: number;
};

const START_NEAR = 1.5;
const START_FAR = 20;
const END_NEAR = 120;
const END_FAR = 520;

export function StartFogReveal({ active, open, durationMs = 1200 }: StartFogRevealProps) {
  const { scene } = useThree();
  const startedAtRef = useRef<number | null>(null);
  const fogRef = useRef<THREE.Fog | null>(null);

  useEffect(() => {
    if (!active) {
      startedAtRef.current = null;
      if (scene.fog === fogRef.current) scene.fog = null;
      fogRef.current = null;
      return;
    }

    const fog = new THREE.Fog("#dfeaf3", START_NEAR, START_FAR);
    scene.fog = fog;
    fogRef.current = fog;
    startedAtRef.current = null;

    return () => {
      if (scene.fog === fog) scene.fog = null;
      if (fogRef.current === fog) fogRef.current = null;
    };
  }, [active, scene]);

  useFrame((state) => {
    const fog = fogRef.current;
    if (!fog || scene.fog !== fog || !active) return;

    if (!open) {
      fog.near = START_NEAR;
      fog.far = START_FAR;
      return;
    }

    if (startedAtRef.current === null) startedAtRef.current = state.clock.elapsedTime;
    const elapsed = state.clock.elapsedTime - startedAtRef.current;
    const t = Math.min(elapsed / (durationMs / 1000), 1);
    const eased = 1 - (1 - t) * (1 - t);

    fog.near = THREE.MathUtils.lerp(START_NEAR, END_NEAR, eased);
    fog.far = THREE.MathUtils.lerp(START_FAR, END_FAR, eased);

    if (t >= 1 && scene.fog === fog) {
      scene.fog = null;
      fogRef.current = null;
    }
  });

  return null;
}
