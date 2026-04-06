"use client";

import React, { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";

import { CameraNavController } from "./_components/CameraNavController";
import { FantasyIslandFitted, type OrbitControlsInstance } from "./_components/FantasyIslandFitted";
import { ImmersiveChrome } from "./_components/ImmersiveChrome";
import { IslandIntroOverlay } from "./_components/IslandIntroOverlay";
import { IslandSignpostMenu } from "./_components/IslandSignpostMenu";
import {
  IslandLoadProgress,
  type IslandLoadSnapshot,
} from "./_components/IslandLoadProgress";
import { PortfolioInfoPanel } from "./_components/PortfolioInfoPanel";
import { PortfolioNavProvider } from "./_components/PortfolioNavContext";
import { SkyBackdrop } from "./_components/SkyBackdrop";
import { OrbitingCloudsAtmosphere, OrbitingCloudsVeil } from "./_components/OrbitingClouds";

function FantasyIslandCanvasInner() {
  const controlsRef = useRef<OrbitControlsInstance | null>(null);
  const [started, setStarted] = useState(false);
  const [load, setLoad] = useState<IslandLoadSnapshot>({
    progress: 0,
    active: false,
    loaded: 0,
    total: 0,
  });

  const onLoadChange = useCallback((s: IslandLoadSnapshot) => {
    setLoad(s);
  }, []);

  const canStart = !load.active && load.total > 0 && load.progress >= 99.5;

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <div
      className={[
        "relative h-screen w-full overflow-hidden bg-[#0c0f14]",
        started ? "cursor-none" : "",
      ].join(" ")}
    >
      <Canvas
        shadows
        camera={{ position: [0, 4.5, 14], fov: 34, near: 0.1, far: 2_000_000 }}
        className={started ? "opacity-100" : "opacity-[0.22]"}
        style={{
          width: "100%",
          height: "100%",
          transition: "opacity 0.9s ease-out",
        }}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.1,
          outputColorSpace: THREE.SRGBColorSpace,
        }}
      >
        <IslandLoadProgress onChange={onLoadChange} />
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
            minDistance={2.5}
            maxDistance={40}
          />
          <CameraNavController controlsRef={controlsRef} enabled={started} />
          {/* <OrbitingCloudsAtmosphere /> */}
          <FantasyIslandFitted controlsRef={controlsRef} />
          <IslandSignpostMenu visible={started} />
          {/* <OrbitingCloudsVeil /> */}
        </Suspense>
      </Canvas>

      {!started && (
        <IslandIntroOverlay
          progress={load.progress}
          canStart={canStart}
          onStart={() => setStarted(true)}
        />
      )}

      <ImmersiveChrome active={started} />
      <PortfolioInfoPanel visible={started} />
    </div>
  );
}

export default function FantasyIslandCanvas() {
  return (
    <PortfolioNavProvider>
      <FantasyIslandCanvasInner />
    </PortfolioNavProvider>
  );
}
