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
import { FloatingBoats } from "./_components/FloatingBoat";
import { TimeOfDayProvider } from "./_components/TimeOfDayContext";
import { TimeOfDayLighting } from "./_components/TimeOfDayLighting";
import { TimeOfDayToggle } from "./_components/TimeOfDayToggle";

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
        <TimeOfDayLighting />

        <Suspense fallback={null}>
          <SkyBackdrop />
          <OrbitControls
            ref={controlsRef}
            enablePan={false}
            minDistance={2.5}
            maxDistance={40}
          />
          <CameraNavController controlsRef={controlsRef} enabled={started} />
          <FantasyIslandFitted controlsRef={controlsRef} />
          <FloatingBoats />
          <IslandSignpostMenu visible={started} />
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
      <TimeOfDayToggle visible={started} />
    </div>
  );
}

export default function FantasyIslandCanvas() {
  return (
    <PortfolioNavProvider>
      <TimeOfDayProvider>
        <FantasyIslandCanvasInner />
      </TimeOfDayProvider>
    </PortfolioNavProvider>
  );
}
