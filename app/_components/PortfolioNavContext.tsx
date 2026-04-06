"use client";

import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import * as THREE from "three";

import { getCameraPresets, type NavId } from "./portfolioNavData";

export type NavTransition = {
  mode: "section" | "menu";
  sectionId?: NavId;
  cameraPos: THREE.Vector3;
  target: THREE.Vector3;
};

type PortfolioNavContextValue = {
  orbitTargetY: number;
  setOrbitTargetY: (y: number) => void;
  signpostTransform: { position: [number, number, number]; rotationY: number } | null;
  setSignpostTransform: (t: { position: [number, number, number]; rotationY: number } | null) => void;
  pendingNav: NavTransition | null;
  requestNav: (id: NavId) => void;
  clearPendingNav: () => void;
  activeSection: NavId | null;
  setActiveSection: (id: NavId | null) => void;
  flyToMenu: () => void;
  flyToDefault: () => void;
  boatPose: { position: [number, number, number]; heading: number } | null;
  setBoatPose: (pose: { position: [number, number, number]; heading: number } | null) => void;
  boatPaused: boolean;
  boatThoughtVisible: boolean;
};

const PortfolioNavContext = createContext<PortfolioNavContextValue | null>(null);

export function PortfolioNavProvider({ children }: { children: React.ReactNode }) {
  const [orbitTargetY, setOrbitTargetY] = useState(12);
  const [signpostTransform, setSignpostTransform] = useState<{
    position: [number, number, number];
    rotationY: number;
  } | null>(null);
  const [pendingNav, setPendingNav] = useState<NavTransition | null>(null);
  const [activeSection, setActiveSection] = useState<NavId | null>(null);
  const [boatPose, setBoatPose] = useState<{
    position: [number, number, number];
    heading: number;
  } | null>(null);
  const [boatPaused, setBoatPaused] = useState(false);
  const [boatThoughtVisible, setBoatThoughtVisible] = useState(false);

  const requestNav = useCallback(
    (id: NavId) => {
      if (id === "about") {
        setPendingNav(null);
        setActiveSection(id);
        setBoatPaused(false);
        setBoatThoughtVisible(false);
        return;
      }

      if (id === "articles" && boatPose) {
        const [bx, by, bz] = boatPose.position;
        const outward = new THREE.Vector2(bx, bz);
        if (outward.lengthSq() < 0.0001) outward.set(1, 0);
        outward.normalize();
        const tangent = new THREE.Vector2(outward.y, -outward.x);

        // Keep the camera on the ocean side of the boat so island terrain
        // does not block or clip the skills framing.
        const camX = bx + outward.x * 13.5 + tangent.x * 4.2;
        const camZ = bz + outward.y * 13.5 + tangent.y * 4.2;
        const camPos = new THREE.Vector3(
          camX,
          by + 4.6,
          camZ
        );
        const target = new THREE.Vector3(
          bx + tangent.x * 3.8,
          by + 1.5,
          bz + tangent.y * 3.8
        );
        setPendingNav({
          mode: "section",
          sectionId: id,
          cameraPos: camPos,
          target,
        });
        setActiveSection(null);
        setBoatPaused(true);
        setBoatThoughtVisible(true);
        return;
      }
      const p = getCameraPresets(orbitTargetY)[id];
      setPendingNav({
        mode: "section",
        sectionId: id,
        cameraPos: new THREE.Vector3(...p.position),
        target: new THREE.Vector3(...p.target),
      });
      setActiveSection(null);
      setBoatPaused(false);
      setBoatThoughtVisible(false);
    },
    [boatPose, orbitTargetY]
  );

  const flyToMenu = useCallback(() => {
    const p = getCameraPresets(orbitTargetY).menu;
    setPendingNav({
      mode: "menu",
      cameraPos: new THREE.Vector3(...p.position),
      target: new THREE.Vector3(...p.target),
    });
    setActiveSection(null);
    setBoatPaused(false);
    setBoatThoughtVisible(false);
  }, [orbitTargetY]);

  const flyToDefault = useCallback(() => {
    const p = getCameraPresets(orbitTargetY).default;
    setPendingNav({
      mode: "menu",
      cameraPos: new THREE.Vector3(...p.position),
      target: new THREE.Vector3(...p.target),
    });
    setActiveSection(null);
    setBoatPaused(false);
    setBoatThoughtVisible(false);
  }, [orbitTargetY]);

  const clearPendingNav = useCallback(() => setPendingNav(null), []);

  const value = useMemo(
    () => ({
      orbitTargetY,
      setOrbitTargetY,
      signpostTransform,
      setSignpostTransform,
      pendingNav,
      requestNav,
      clearPendingNav,
      activeSection,
      setActiveSection,
      flyToMenu,
      flyToDefault,
      boatPose,
      setBoatPose,
      boatPaused,
      boatThoughtVisible,
    }),
    [
      orbitTargetY,
      signpostTransform,
      pendingNav,
      requestNav,
      clearPendingNav,
      activeSection,
      flyToMenu,
      flyToDefault,
      boatPose,
      boatPaused,
      boatThoughtVisible,
    ]
  );

  return (
    <PortfolioNavContext.Provider value={value}>{children}</PortfolioNavContext.Provider>
  );
}

export function usePortfolioNav() {
  const ctx = useContext(PortfolioNavContext);
  if (!ctx) throw new Error("usePortfolioNav must be used within PortfolioNavProvider");
  return ctx;
}
