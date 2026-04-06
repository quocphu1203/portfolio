"use client";

import React, { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Sky } from "three/addons/objects/Sky.js";

import { useTimeOfDay, TIME_PRESETS } from "./TimeOfDayContext";

const DEFAULT = TIME_PRESETS.afternoon;
const LERP_SPEED = 1.8;
const SKY_DISTANCE = 450_000;

export function SkyBackdrop() {
  const { activePreset } = useTimeOfDay();
  const skyRef = useRef<Sky | null>(null);
  const target = activePreset;

  const sky = useMemo(() => {
    const skyObject = new Sky();
    skyObject.scale.setScalar(SKY_DISTANCE);
    return skyObject;
  }, []);

  const cur = useRef({
    sunX: DEFAULT.sunDir[0],
    sunY: DEFAULT.sunDir[1],
    sunZ: DEFAULT.sunDir[2],
    rayleigh: DEFAULT.rayleigh,
    turbidity: DEFAULT.turbidity,
    mieCoefficient: DEFAULT.mieCoefficient,
    mieDirectionalG: DEFAULT.mieDirectionalG,
    starsOpacity: DEFAULT.starsOpacity,
  });

  useFrame((state, delta) => {
    const sky = skyRef.current;
    const c = cur.current;
    const t = 1 - Math.exp(-LERP_SPEED * delta);

    c.sunX += (target.sunDir[0] - c.sunX) * t;
    c.sunY += (target.sunDir[1] - c.sunY) * t;
    c.sunZ += (target.sunDir[2] - c.sunZ) * t;
    c.rayleigh += (target.rayleigh - c.rayleigh) * t;
    c.turbidity += (target.turbidity - c.turbidity) * t;
    c.mieCoefficient += (target.mieCoefficient - c.mieCoefficient) * t;
    c.mieDirectionalG += (target.mieDirectionalG - c.mieDirectionalG) * t;
    c.starsOpacity += (target.starsOpacity - c.starsOpacity) * t;

    if (sky) {
      const mat = sky.material as THREE.ShaderMaterial;
      if (mat?.uniforms) {
        if (mat.uniforms.sunPosition) mat.uniforms.sunPosition.value.set(c.sunX, c.sunY, c.sunZ);
        if (mat.uniforms.rayleigh) mat.uniforms.rayleigh.value = c.rayleigh;
        if (mat.uniforms.turbidity) mat.uniforms.turbidity.value = c.turbidity;
        if (mat.uniforms.mieCoefficient) mat.uniforms.mieCoefficient.value = c.mieCoefficient;
        if (mat.uniforms.mieDirectionalG) mat.uniforms.mieDirectionalG.value = c.mieDirectionalG;
      }
    }

    state.scene.background = new THREE.Color(target.bgColor);
  });

  return <primitive ref={skyRef} object={sky} />;
}
