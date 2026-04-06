"use client";

import React, { Suspense, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";

import { FantasyIslandFitted, type OrbitControlsInstance } from "./_components/FantasyIslandFitted";
import { SkyBackdrop } from "./_components/SkyBackdrop";
import { OrbitingClouds } from "./_components/OrbitingClouds";

useGLTF.preload("/fantasy_island.glb");
useGLTF.preload("/sky.glb");
useGLTF.preload("/low_poly_cloud.glb");

export default function FantasyIslandCanvas() {
  const controlsRef = useRef<OrbitControlsInstance | null>(null);

  return (
    <div className="w-full h-screen bg-black">
      <Canvas
        shadows
        camera={{ position: [0, 4.5, 14], fov: 40, near: 0.1, far: 5000 }}
        style={{ width: "100%", height: "100%" }}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.1,
          outputColorSpace: THREE.SRGBColorSpace,
        }}
      >
        <color attach="background" args={["#d4c8d0"]} />

        <Suspense fallback={null}>
          <ambientLight intensity={0.6} />
          <directionalLight
            position={[-8, 15, -4]}
            intensity={0.9}
            color="#fff0e8"
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
          <hemisphereLight args={["#d4c8d0", "#4a6e7e", 0.5]} />
          <SkyBackdrop />
          <OrbitControls
            ref={controlsRef}
            enablePan={false}
            minDistance={6}
            maxDistance={40}
          />
          <OrbitingClouds />
          <FantasyIslandFitted controlsRef={controlsRef} />
        </Suspense>
      </Canvas>
    </div>
  );
}

