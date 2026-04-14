"use client";

import React, { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Physics } from "@react-three/rapier";
import * as THREE from "three";

import { CameraNavController } from "./_components/navigation/CameraNavController";
import { IslandSignpostMenu } from "./_components/navigation/IslandSignpostMenu";
import { PortfolioNavProvider } from "./_components/navigation/PortfolioNavContext";
import { FantasyIslandFitted, type OrbitControlsInstance } from "./_components/scene/FantasyIslandFitted";
import { FloatingBoats } from "./_components/scene/FloatingBoat";
import { ExperienceMilestoneTrail } from "./_components/scene/ExperienceMilestoneTrail";
import { ProjectBirdFlock } from "./_components/scene/ProjectBirdFlock";
import { SkyBackdrop } from "./_components/scene/SkyBackdrop";
import { TimeOfDayProvider } from "./_components/time/TimeOfDayContext";
import { TimeOfDayLighting } from "./_components/time/TimeOfDayLighting";
import { TimeOfDayToggle } from "./_components/time/TimeOfDayToggle";
import { ImmersiveChrome } from "./_components/ui/ImmersiveChrome";
import { IslandIntroOverlay } from "./_components/ui/IslandIntroOverlay";
import { LanguageSwitcher } from "./_components/ui/LanguageSwitcher";
import {
  IslandLoadProgress,
  type IslandLoadSnapshot,
} from "./_components/ui/IslandLoadProgress";
import { PortfolioInfoPanel } from "./_components/ui/PortfolioInfoPanel";

function FantasyIslandCanvasInner() {
  const controlsRef = useRef<OrbitControlsInstance | null>(null);
  const oceanAudioRef = useRef<HTMLAudioElement | null>(null);
  const [started, setStarted] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(1440);
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

  useEffect(() => {
    const sync = () => setViewportWidth(window.innerWidth);
    sync();
    window.addEventListener("resize", sync, { passive: true });
    return () => window.removeEventListener("resize", sync);
  }, []);

  useEffect(() => {
    const audio = oceanAudioRef.current;
    if (!audio) return;

    audio.volume = 0.15;

    if (!started) {
      audio.pause();
      audio.currentTime = 0;
      return;
    }

    void audio.play().catch(() => {
      // Ignore autoplay policy errors; user can retry with interaction.
    });
  }, [started]);

  const isMobile = viewportWidth < 768;
  const isTablet = viewportWidth >= 768 && viewportWidth < 1024;
  const cameraFov = isMobile ? 40 : isTablet ? 37 : 34;
  const controlsMinDistance = isMobile ? 2.2 : 2.5;
  const controlsMaxDistance = isMobile ? 34 : isTablet ? 38 : 40;
  const signpostScaleMultiplier = isMobile ? 1.22 : isTablet ? 1.1 : 1;

  return (
    <div
      className={[
        "relative h-screen w-full overflow-hidden bg-[#0c0f14]",
        started ? "cursor-none" : "",
      ].join(" ")}
    >
      <Canvas
        shadows
        camera={{ position: [0, 4.5, 14], fov: cameraFov, near: 0.1, far: 2_000_000 }}
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
            minDistance={controlsMinDistance}
            maxDistance={controlsMaxDistance}
          />
          <Physics gravity={[0, -24, 0]} timeStep="vary">
            <CameraNavController controlsRef={controlsRef} enabled={started} />
            <FantasyIslandFitted controlsRef={controlsRef} />
            <FloatingBoats />
            <ProjectBirdFlock />
            <ExperienceMilestoneTrail />
            <IslandSignpostMenu visible={started} scaleMultiplier={signpostScaleMultiplier} />
          </Physics>
        </Suspense>
      </Canvas>

      <audio ref={oceanAudioRef} src="/ocean.mp3" loop preload="auto" />

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
      <LanguageSwitcher />
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
