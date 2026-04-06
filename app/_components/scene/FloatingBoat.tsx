"use client";

import React, { useRef, useMemo } from "react";
import { Html, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { ISLAND_WATER_LEVEL } from "./islandSceneConstants";
import { usePortfolioNav } from "../navigation/PortfolioNavContext";
import { useTimeOfDay } from "../time/TimeOfDayContext";

const BOAT_SCALE = 0.3;
const BOAT_BASE_Y = ISLAND_WATER_LEVEL;
const PATH_SPEED = 0.2;
const ORBIT_RADIUS = 20;

function SingleBoat({ scene }: { scene: THREE.Object3D }) {
  const ref = useRef<THREE.Group>(null);
  const portLightRef = useRef<THREE.PointLight>(null);
  const starboardLightRef = useRef<THREE.PointLight>(null);
  const mastLightRef = useRef<THREE.PointLight>(null);
  const tRef = useRef(0);
  const bobTRef = useRef(0);
  const bubbleTRef = useRef(0);
  const bubbleRef = useRef<HTMLDivElement | null>(null);
  const prevPos = useRef(new THREE.Vector3());
  const wasPausedRef = useRef(false);
  const pausedXZRef = useRef(new THREE.Vector2());
  const pausedHeadingRef = useRef(0);
  const { setBoatPose, boatPaused, boatThoughtVisible } = usePortfolioNav();
  const { activePreset } = useTimeOfDay();

  const cloned = useMemo(() => {
    const c = scene.clone(true);
    c.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
    return c;
  }, [scene]);

  useFrame((_, delta) => {
    if (!ref.current) return;
    bobTRef.current += delta;
    bubbleTRef.current += delta * 1.8;
    if (bubbleRef.current) {
      const y = Math.sin(bubbleTRef.current) * 6;
      const x = Math.cos(bubbleTRef.current * 0.55) * 2;
      bubbleRef.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    }

    if (!boatPaused) {
      tRef.current += delta * PATH_SPEED;
    }
    const t = tRef.current;

    const r = ORBIT_RADIUS + Math.sin(t * 3) * 1.5;
    const x = Math.cos(t) * r;
    const z = Math.sin(t) * r;

    const travelWave = Math.sin(t * 6) * 0.05 + Math.sin(t * 9.7) * 0.025;
    const y = BOAT_BASE_Y + travelWave;

    if (!boatPaused) {
      ref.current.position.set(x, y, z);
    }

    const boatX = ref.current.position.x;
    const boatZ = ref.current.position.z;
    const dx = boatX - prevPos.current.x;
    const dz = boatZ - prevPos.current.z;
    const len = Math.sqrt(dx * dx + dz * dz);
    const heading = len > 0.0001 ? Math.atan2(dx, dz) : ref.current.rotation.y;

    const forwardTilt = -0.12;
    const roll = Math.sin(t * 4.5) * 0.06;
    if (!boatPaused) {
      ref.current.rotation.set(forwardTilt, heading, roll);
      wasPausedRef.current = false;
    } else {
      if (!wasPausedRef.current) {
        pausedXZRef.current.set(ref.current.position.x, ref.current.position.z);
        pausedHeadingRef.current = ref.current.rotation.y;
        wasPausedRef.current = true;
      }
      const anchorWave = Math.sin(bobTRef.current * 2.8) * 0.055 + Math.sin(bobTRef.current * 4.3) * 0.02;
      const anchorPitch = -0.05 + Math.sin(bobTRef.current * 1.9) * 0.018;
      const anchorRoll = Math.sin(bobTRef.current * 2.5) * 0.035;
      ref.current.position.set(pausedXZRef.current.x, BOAT_BASE_Y + anchorWave, pausedXZRef.current.y);
      ref.current.rotation.set(anchorPitch, pausedHeadingRef.current, anchorRoll);
    }

    const currentY = ref.current.position.y;
    prevPos.current.set(boatX, currentY, boatZ);
    setBoatPose({
      position: [boatX, currentY, boatZ],
      heading: ref.current.rotation.y,
    });

    const nightBlend = THREE.MathUtils.clamp((activePreset.starsOpacity - 0.3) / 0.7, 0, 1);
    const targetSideIntensity = 3.2 * nightBlend;
    const targetMastIntensity = 2.6 * nightBlend;
    const fade = 1 - Math.exp(-6 * delta);

    if (portLightRef.current) {
      portLightRef.current.intensity += (targetSideIntensity - portLightRef.current.intensity) * fade;
    }
    if (starboardLightRef.current) {
      starboardLightRef.current.intensity +=
        (targetSideIntensity - starboardLightRef.current.intensity) * fade;
    }
    if (mastLightRef.current) {
      mastLightRef.current.intensity += (targetMastIntensity - mastLightRef.current.intensity) * fade;
    }
  });

  return (
    <group ref={ref} scale={BOAT_SCALE}>
      <primitive object={cloned} dispose={null} />
      <pointLight
        ref={portLightRef}
        position={[-2.6, 4.2, 5.2]}
        color="#ffd38a"
        intensity={0}
        distance={16}
        decay={1.6}
      />
      <pointLight
        ref={starboardLightRef}
        position={[2.6, 4.2, 5.2]}
        color="#ffd38a"
        intensity={0}
        distance={16}
        decay={1.6}
      />
      <pointLight
        ref={mastLightRef}
        position={[0, 8.6, 0.8]}
        color="#fff1bf"
        intensity={0}
        distance={14}
        decay={1.7}
      />
      {boatThoughtVisible && (
        <Html position={[-7.1, 15.4, 1.0]} center distanceFactor={8}>
          <div
            ref={bubbleRef}
            className="rounded-2xl border border-[#8fb8c8]/50 bg-[#0d161d]/78 px-5 py-2.5 text-base font-semibold text-[#d8ecf5] shadow-xl backdrop-blur-md whitespace-nowrap"
            style={{ willChange: "transform" }}
          >
            Mình sẽ kể bạn nghe về kỹ năng nhé...
          </div>
        </Html>
      )}
    </group>
  );
}

export function FloatingBoats() {
  const { scene } = useGLTF("/boat.glb") as { scene: THREE.Object3D };

  return (
    <group>
      <SingleBoat scene={scene} />
    </group>
  );
}

useGLTF.preload("/boat.glb");
