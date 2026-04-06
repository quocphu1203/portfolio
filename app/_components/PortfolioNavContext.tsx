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
  pendingNav: NavTransition | null;
  requestNav: (id: NavId) => void;
  clearPendingNav: () => void;
  activeSection: NavId | null;
  setActiveSection: (id: NavId | null) => void;
  flyToMenu: () => void;
};

const PortfolioNavContext = createContext<PortfolioNavContextValue | null>(null);

export function PortfolioNavProvider({ children }: { children: React.ReactNode }) {
  const [orbitTargetY, setOrbitTargetY] = useState(12);
  const [pendingNav, setPendingNav] = useState<NavTransition | null>(null);
  const [activeSection, setActiveSection] = useState<NavId | null>(null);

  const requestNav = useCallback(
    (id: NavId) => {
      const p = getCameraPresets(orbitTargetY)[id];
      setPendingNav({
        mode: "section",
        sectionId: id,
        cameraPos: new THREE.Vector3(...p.position),
        target: new THREE.Vector3(...p.target),
      });
      setActiveSection(null);
    },
    [orbitTargetY]
  );

  const flyToMenu = useCallback(() => {
    const p = getCameraPresets(orbitTargetY).menu;
    setPendingNav({
      mode: "menu",
      cameraPos: new THREE.Vector3(...p.position),
      target: new THREE.Vector3(...p.target),
    });
    setActiveSection(null);
  }, [orbitTargetY]);

  const clearPendingNav = useCallback(() => setPendingNav(null), []);

  const value = useMemo(
    () => ({
      orbitTargetY,
      setOrbitTargetY,
      pendingNav,
      requestNav,
      clearPendingNav,
      activeSection,
      setActiveSection,
      flyToMenu,
    }),
    [
      orbitTargetY,
      pendingNav,
      requestNav,
      clearPendingNav,
      activeSection,
      flyToMenu,
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
