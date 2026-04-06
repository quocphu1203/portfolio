"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef, type RefObject } from "react";
import * as THREE from "three";

import type { NavId } from "./portfolioNavData";
import type { OrbitControlsInstance } from "../scene/FantasyIslandFitted";
import { usePortfolioNav } from "./PortfolioNavContext";

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function CameraNavController({
  controlsRef,
  enabled,
}: {
  controlsRef: RefObject<OrbitControlsInstance | null>;
  enabled: boolean;
}) {
  const { camera } = useThree();
  const { pendingNav, clearPendingNav, setActiveSection } = usePortfolioNav();

  const anim = useRef<{
    fromP: THREE.Vector3;
    toP: THREE.Vector3;
    fromT: THREE.Vector3;
    toT: THREE.Vector3;
    t: number;
    mode: "section" | "menu";
    sectionId?: NavId;
  } | null>(null);

  useEffect(() => {
    if (!enabled || !pendingNav) return;
    const ctrl = controlsRef.current;
    if (!ctrl) return;

    ctrl.enabled = false;
    anim.current = {
      fromP: camera.position.clone(),
      toP: pendingNav.cameraPos.clone(),
      fromT: ctrl.target.clone(),
      toT: pendingNav.target.clone(),
      t: 0,
      mode: pendingNav.mode,
      sectionId: pendingNav.sectionId,
    };
  }, [enabled, pendingNav, camera, controlsRef]);

  useFrame((_, dt) => {
    if (!enabled) return;
    const a = anim.current;
    const ctrl = controlsRef.current;
    if (!a || !ctrl) return;

    a.t += dt * 0.72;
    const u = Math.min(1, a.t);
    const k = easeInOutCubic(u);

    camera.position.lerpVectors(a.fromP, a.toP, k);
    ctrl.target.lerpVectors(a.fromT, a.toT, k);
    ctrl.update();

    if (u >= 1) {
      const mode = a.mode;
      const sectionId = a.sectionId;
      anim.current = null;
      ctrl.enabled = true;
      ctrl.minPolarAngle = 0.12;
      ctrl.maxPolarAngle = Math.PI - 0.12;
      ctrl.maxDistance = 40;
      ctrl.update();
      if (mode === "section" && sectionId) {
        setActiveSection(sectionId);
      }
      clearPendingNav();
    }
  });

  return null;
}
