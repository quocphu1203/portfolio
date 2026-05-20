"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

type PerformanceContextValue = {
  lowPerformance: boolean;
  autoDetected: boolean;
  toggleLowPerformance: () => void;
};

const STORAGE_KEY = "portfolio-low-performance";
const PerformanceContext = createContext<PerformanceContextValue | null>(null);

function shouldPreferLowPerformance() {
  const nav = navigator as Navigator & { deviceMemory?: number };
  const memoryIsLimited = typeof nav.deviceMemory === "number" && nav.deviceMemory <= 4;
  const mobileLike = window.matchMedia("(max-width: 767px), (pointer: coarse)").matches;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  return memoryIsLimited || mobileLike || reducedMotion;
}

export function PerformanceProvider({ children }: { children: React.ReactNode }) {
  const [lowPerformance, setLowPerformance] = useState(false);
  const [autoDetected, setAutoDetected] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "on" || stored === "off") {
      setLowPerformance(stored === "on");
      setAutoDetected(false);
      return;
    }

    const preferred = shouldPreferLowPerformance();
    setLowPerformance(preferred);
    setAutoDetected(preferred);
  }, []);

  const toggleLowPerformance = useCallback(() => {
    setLowPerformance((current) => {
      const next = !current;
      window.localStorage.setItem(STORAGE_KEY, next ? "on" : "off");
      setAutoDetected(false);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ lowPerformance, autoDetected, toggleLowPerformance }),
    [lowPerformance, autoDetected, toggleLowPerformance]
  );

  return <PerformanceContext.Provider value={value}>{children}</PerformanceContext.Provider>;
}

export function usePerformanceMode() {
  const ctx = useContext(PerformanceContext);
  if (!ctx) throw new Error("usePerformanceMode must be used within PerformanceProvider");
  return ctx;
}
