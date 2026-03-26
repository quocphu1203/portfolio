"use client";

import React, { Suspense, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";

import { FantasyIslandFitted, type OrbitControlsInstance } from "./_components/FantasyIslandFitted";
import { SkyBackdrop } from "./_components/SkyBackdrop";

useGLTF.preload("/fantasy_island.glb");
useGLTF.preload("/sky.glb");

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
        <color attach="background" args={["#c8d8e0"]} />

        <Suspense fallback={null}>
          <ambientLight intensity={0.6} />
          <directionalLight position={[6, 12, 6]} intensity={0.9} />
          <hemisphereLight args={["#c8d8e0", "#3a6e6e", 0.45]} />
          <SkyBackdrop />
          <OrbitControls
            ref={controlsRef}
            enablePan={false}
            minDistance={6}
            maxDistance={40}
          />
          <FantasyIslandFitted controlsRef={controlsRef} />
        </Suspense>
      </Canvas>
    </div>
  );
}

