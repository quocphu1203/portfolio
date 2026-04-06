"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export const TIME_IDS = ["dawn", "morning", "noon", "afternoon", "dusk", "evening"] as const;
export type TimeId = (typeof TIME_IDS)[number];

export const TIME_LABELS: Record<TimeId, string> = {
  dawn: "Bình minh",
  morning: "Sáng",
  noon: "Trưa",
  afternoon: "Chiều",
  dusk: "Hoàng hôn",
  evening: "Tối",
};

export const TIME_DOT_COLORS: Record<TimeId, string> = {
  dawn: "#e88090",
  morning: "#ffb87a",
  noon: "#87ceeb",
  afternoon: "#e8a040",
  dusk: "#e06030",
  evening: "#304878",
};

export type TimePreset = {
  sunDir: [number, number, number];
  rayleigh: number;
  turbidity: number;
  mieCoefficient: number;
  mieDirectionalG: number;
  envPreset: string;
  envIntensity: number;
  ambientColor: string;
  ambientIntensity: number;
  dirColor: string;
  dirIntensity: number;
  dirPos: [number, number, number];
  hemiSkyColor: string;
  hemiGroundColor: string;
  hemiIntensity: number;
  bgColor: string;
  exposure: number;
  starsOpacity: number;
};

export const TIME_PRESETS: Record<TimeId, TimePreset> = {
  dawn: {
    sunDir: [0.9, 0.04, 0.4],
    rayleigh: 4,
    turbidity: 5,
    mieCoefficient: 0.018,
    mieDirectionalG: 0.85,
    envPreset: "dawn",
    envIntensity: 0.3,
    ambientColor: "#e0b0c8",
    ambientIntensity: 0.25,
    dirColor: "#ff8050",
    dirIntensity: 0.5,
    dirPos: [12, 3, 6],
    hemiSkyColor: "#c898b0",
    hemiGroundColor: "#2a2838",
    hemiIntensity: 0.3,
    bgColor: "#b8889a",
    exposure: 0.85,
    starsOpacity: 0.12,
  },
  morning: {
    sunDir: [0.8, 0.15, 0.6],
    rayleigh: 3.5,
    turbidity: 8,
    mieCoefficient: 0.012,
    mieDirectionalG: 0.8,
    envPreset: "dawn",
    envIntensity: 0.4,
    ambientColor: "#ffecd2",
    ambientIntensity: 0.4,
    dirColor: "#ffb87a",
    dirIntensity: 0.8,
    dirPos: [10, 6, 4],
    hemiSkyColor: "#ffd0a0",
    hemiGroundColor: "#3a4a5a",
    hemiIntensity: 0.4,
    bgColor: "#dfc4a8",
    exposure: 1.0,
    starsOpacity: 0,
  },
  noon: {
    sunDir: [0.1, 1.0, 0.2],
    rayleigh: 1.2,
    turbidity: 3,
    mieCoefficient: 0.003,
    mieDirectionalG: 0.9,
    envPreset: "park",
    envIntensity: 0.5,
    ambientColor: "#ffffff",
    ambientIntensity: 0.75,
    dirColor: "#fffaf2",
    dirIntensity: 1.3,
    dirPos: [3, 20, 3],
    hemiSkyColor: "#87ceeb",
    hemiGroundColor: "#5a7e8e",
    hemiIntensity: 0.55,
    bgColor: "#b0d4e8",
    exposure: 1.25,
    starsOpacity: 0,
  },
  afternoon: {
    sunDir: [-0.55, 0.12, -0.82],
    rayleigh: 2,
    turbidity: 10,
    mieCoefficient: 0.005,
    mieDirectionalG: 0.8,
    envPreset: "sunset",
    envIntensity: 0.45,
    ambientColor: "#ffffff",
    ambientIntensity: 0.6,
    dirColor: "#fff0e8",
    dirIntensity: 0.9,
    dirPos: [-8, 15, -4],
    hemiSkyColor: "#d4c8d0",
    hemiGroundColor: "#4a6e7e",
    hemiIntensity: 0.5,
    bgColor: "#d4c8d0",
    exposure: 1.1,
    starsOpacity: 0,
  },
  dusk: {
    sunDir: [-0.7, 0.03, -0.7],
    rayleigh: 3,
    turbidity: 15,
    mieCoefficient: 0.018,
    mieDirectionalG: 0.75,
    envPreset: "sunset",
    envIntensity: 0.35,
    ambientColor: "#ffc080",
    ambientIntensity: 0.3,
    dirColor: "#ff6838",
    dirIntensity: 0.55,
    dirPos: [-10, 3, -8],
    hemiSkyColor: "#d07848",
    hemiGroundColor: "#382830",
    hemiIntensity: 0.3,
    bgColor: "#a06848",
    exposure: 0.85,
    starsOpacity: 0.06,
  },
  evening: {
    sunDir: [-0.3, -0.2, -0.8],
    rayleigh: 4,
    turbidity: 20,
    mieCoefficient: 0.008,
    mieDirectionalG: 0.6,
    envPreset: "night",
    envIntensity: 0.18,
    ambientColor: "#3a5080",
    ambientIntensity: 0.18,
    dirColor: "#80a8d8",
    dirIntensity: 0.3,
    dirPos: [-4, 10, -6],
    hemiSkyColor: "#1a1a40",
    hemiGroundColor: "#080812",
    hemiIntensity: 0.18,
    bgColor: "#060810",
    exposure: 0.6,
    starsOpacity: 1,
  },
};

type TimeMode = "manual" | "realtime";

type RealtimeFrame = {
  from: TimeId;
  to: TimeId;
  mix: number;
};

const TIME_HOURS: Record<TimeId, number> = {
  dawn: 5.5,
  morning: 8,
  noon: 12,
  afternoon: 16,
  dusk: 18.25,
  evening: 21,
};

type ContextValue = {
  timeOfDay: TimeId;
  setTimeOfDay: (t: TimeId) => void;
  mode: TimeMode;
  setRealtimeMode: (enabled: boolean) => void;
  activePreset: TimePreset;
};

const Ctx = createContext<ContextValue | null>(null);

export function TimeOfDayProvider({ children }: { children: React.ReactNode }) {
  const [timeOfDay, setTimeOfDay] = useState<TimeId>("afternoon");
  const [mode, setMode] = useState<TimeMode>("manual");
  const [clockTick, setClockTick] = useState(0);

  useEffect(() => {
    if (mode !== "realtime") return;
    const id = window.setInterval(() => {
      setClockTick((v) => v + 1);
    }, 1000);
    return () => window.clearInterval(id);
  }, [mode]);

  const handleSetTime = useCallback((t: TimeId) => {
    setMode("manual");
    setTimeOfDay(t);
  }, []);

  const setRealtimeMode = useCallback((enabled: boolean) => {
    setMode(enabled ? "realtime" : "manual");
  }, []);

  const activePreset = useMemo(() => {
    if (mode === "manual") return TIME_PRESETS[timeOfDay];
    const frame = getRealtimeFrame(new Date());
    const from = TIME_PRESETS[frame.from];
    const to = TIME_PRESETS[frame.to];
    return mixPreset(from, to, frame.mix);
  }, [mode, timeOfDay, clockTick]);

  const value = useMemo(
    () => ({ timeOfDay, setTimeOfDay: handleSetTime, mode, setRealtimeMode, activePreset }),
    [timeOfDay, handleSetTime, mode, setRealtimeMode, activePreset],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTimeOfDay() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useTimeOfDay must be within TimeOfDayProvider");
  return ctx;
}

function getRealtimeFrame(now: Date): RealtimeFrame {
  const hour = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
  const points = TIME_IDS.map((id) => ({ id, hour: TIME_HOURS[id] }));
  const extended = [...points, { id: points[0].id, hour: points[0].hour + 24 }];

  let localHour = hour;
  if (localHour < points[0].hour) localHour += 24;

  for (let i = 0; i < extended.length - 1; i++) {
    const a = extended[i];
    const b = extended[i + 1];
    if (localHour >= a.hour && localHour < b.hour) {
      const span = b.hour - a.hour || 1;
      const mix = (localHour - a.hour) / span;
      return { from: a.id, to: b.id, mix };
    }
  }

  return { from: "evening", to: "dawn", mix: 1 };
}

function mixPreset(a: TimePreset, b: TimePreset, mix: number): TimePreset {
  return {
    sunDir: [
      lerp(a.sunDir[0], b.sunDir[0], mix),
      lerp(a.sunDir[1], b.sunDir[1], mix),
      lerp(a.sunDir[2], b.sunDir[2], mix),
    ],
    rayleigh: lerp(a.rayleigh, b.rayleigh, mix),
    turbidity: lerp(a.turbidity, b.turbidity, mix),
    mieCoefficient: lerp(a.mieCoefficient, b.mieCoefficient, mix),
    mieDirectionalG: lerp(a.mieDirectionalG, b.mieDirectionalG, mix),
    envPreset: mix < 0.5 ? a.envPreset : b.envPreset,
    envIntensity: lerp(a.envIntensity, b.envIntensity, mix),
    ambientColor: lerpHex(a.ambientColor, b.ambientColor, mix),
    ambientIntensity: lerp(a.ambientIntensity, b.ambientIntensity, mix),
    dirColor: lerpHex(a.dirColor, b.dirColor, mix),
    dirIntensity: lerp(a.dirIntensity, b.dirIntensity, mix),
    dirPos: [
      lerp(a.dirPos[0], b.dirPos[0], mix),
      lerp(a.dirPos[1], b.dirPos[1], mix),
      lerp(a.dirPos[2], b.dirPos[2], mix),
    ],
    hemiSkyColor: lerpHex(a.hemiSkyColor, b.hemiSkyColor, mix),
    hemiGroundColor: lerpHex(a.hemiGroundColor, b.hemiGroundColor, mix),
    hemiIntensity: lerp(a.hemiIntensity, b.hemiIntensity, mix),
    bgColor: lerpHex(a.bgColor, b.bgColor, mix),
    exposure: lerp(a.exposure, b.exposure, mix),
    starsOpacity: lerp(a.starsOpacity, b.starsOpacity, mix),
  };
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function lerpHex(a: string, b: string, t: number): string {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  const r = Math.round(lerp(ca.r, cb.r, t));
  const g = Math.round(lerp(ca.g, cb.g, t));
  const bl = Math.round(lerp(ca.b, cb.b, t));
  return `#${toHex(r)}${toHex(g)}${toHex(bl)}`;
}

function hexToRgb(hex: string) {
  const raw = hex.replace("#", "");
  const norm = raw.length === 3 ? raw.split("").map((x) => `${x}${x}`).join("") : raw;
  return {
    r: Number.parseInt(norm.slice(0, 2), 16) || 0,
    g: Number.parseInt(norm.slice(2, 4), 16) || 0,
    b: Number.parseInt(norm.slice(4, 6), 16) || 0,
  };
}

function toHex(v: number) {
  return Math.max(0, Math.min(255, v)).toString(16).padStart(2, "0");
}
