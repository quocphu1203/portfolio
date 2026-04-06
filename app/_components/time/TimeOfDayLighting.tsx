"use client";

import React, { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

import { useTimeOfDay, TIME_PRESETS } from "./TimeOfDayContext";

const DEFAULT = TIME_PRESETS.afternoon;
const LERP_SPEED = 1.8;

export function TimeOfDayLighting() {
  const { activePreset } = useTimeOfDay();
  const { scene, gl } = useThree();

  const ambientRef = useRef<THREE.AmbientLight>(null);
  const dirRef = useRef<THREE.DirectionalLight>(null);
  const hemiRef = useRef<THREE.HemisphereLight>(null);

  const cur = useRef({
    ambientColor: new THREE.Color(DEFAULT.ambientColor),
    ambientIntensity: DEFAULT.ambientIntensity,
    dirColor: new THREE.Color(DEFAULT.dirColor),
    dirIntensity: DEFAULT.dirIntensity,
    dirPos: new THREE.Vector3(...DEFAULT.dirPos),
    hemiSky: new THREE.Color(DEFAULT.hemiSkyColor),
    hemiGround: new THREE.Color(DEFAULT.hemiGroundColor),
    hemiIntensity: DEFAULT.hemiIntensity,
    bgColor: new THREE.Color(DEFAULT.bgColor),
    exposure: DEFAULT.exposure,
    envIntensity: DEFAULT.envIntensity,
  });

  const tgt = useRef({
    ambientColor: new THREE.Color(DEFAULT.ambientColor),
    ambientIntensity: DEFAULT.ambientIntensity,
    dirColor: new THREE.Color(DEFAULT.dirColor),
    dirIntensity: DEFAULT.dirIntensity,
    dirPos: new THREE.Vector3(...DEFAULT.dirPos),
    hemiSky: new THREE.Color(DEFAULT.hemiSkyColor),
    hemiGround: new THREE.Color(DEFAULT.hemiGroundColor),
    hemiIntensity: DEFAULT.hemiIntensity,
    bgColor: new THREE.Color(DEFAULT.bgColor),
    exposure: DEFAULT.exposure,
    envIntensity: DEFAULT.envIntensity,
  });

  useEffect(() => {
    scene.background = cur.current.bgColor;
    gl.toneMappingExposure = cur.current.exposure;
  }, [scene, gl]);

  useEffect(() => {
    const p = activePreset;
    const t = tgt.current;
    t.ambientColor.set(p.ambientColor);
    t.ambientIntensity = p.ambientIntensity;
    t.dirColor.set(p.dirColor);
    t.dirIntensity = p.dirIntensity;
    t.dirPos.set(...p.dirPos);
    t.hemiSky.set(p.hemiSkyColor);
    t.hemiGround.set(p.hemiGroundColor);
    t.hemiIntensity = p.hemiIntensity;
    t.bgColor.set(p.bgColor);
    t.exposure = p.exposure;
    t.envIntensity = p.envIntensity;
  }, [activePreset]);

  useFrame((state, delta) => {
    const t = 1 - Math.exp(-LERP_SPEED * delta);
    const c = cur.current;
    const g = tgt.current;

    c.ambientColor.lerp(g.ambientColor, t);
    c.ambientIntensity += (g.ambientIntensity - c.ambientIntensity) * t;
    c.dirColor.lerp(g.dirColor, t);
    c.dirIntensity += (g.dirIntensity - c.dirIntensity) * t;
    c.dirPos.lerp(g.dirPos, t);
    c.hemiSky.lerp(g.hemiSky, t);
    c.hemiGround.lerp(g.hemiGround, t);
    c.hemiIntensity += (g.hemiIntensity - c.hemiIntensity) * t;
    c.bgColor.lerp(g.bgColor, t);
    c.exposure += (g.exposure - c.exposure) * t;
    c.envIntensity += (g.envIntensity - c.envIntensity) * t;

    if (ambientRef.current) {
      ambientRef.current.color.copy(c.ambientColor);
      ambientRef.current.intensity = c.ambientIntensity;
    }
    if (dirRef.current) {
      dirRef.current.color.copy(c.dirColor);
      dirRef.current.intensity = c.dirIntensity;
      dirRef.current.position.copy(c.dirPos);
    }
    if (hemiRef.current) {
      hemiRef.current.color.copy(c.hemiSky);
      hemiRef.current.groundColor.copy(c.hemiGround);
      hemiRef.current.intensity = c.hemiIntensity;
    }

    state.gl.toneMappingExposure = c.exposure;

    const s = state.scene as THREE.Scene & { environmentIntensity?: number };
    if (typeof s.environmentIntensity === "number") {
      s.environmentIntensity = c.envIntensity;
    }
  });

  return (
    <>
      <ambientLight ref={ambientRef} intensity={DEFAULT.ambientIntensity} />
      <directionalLight
        ref={dirRef}
        position={DEFAULT.dirPos}
        intensity={DEFAULT.dirIntensity}
        color={DEFAULT.dirColor}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-50}
        shadow-camera-right={50}
        shadow-camera-top={50}
        shadow-camera-bottom={-50}
        shadow-camera-near={0.5}
        shadow-camera-far={80}
        shadow-bias={-0.001}
      />
      <hemisphereLight
        ref={hemiRef}
        args={[DEFAULT.hemiSkyColor, DEFAULT.hemiGroundColor, DEFAULT.hemiIntensity]}
      />
    </>
  );
}
