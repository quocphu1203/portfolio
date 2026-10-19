"use client";

import React, { useEffect, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";

import { usePortfolioNav } from "../navigation/PortfolioNavContext";
import type { RainMode } from "../scene/WeatherEffects";

const FINE_POINTER = "(hover: hover) and (pointer: fine)";

function subscribeFinePointer(onChange: () => void) {
  const mq = window.matchMedia(FINE_POINTER);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

const RAIN_NEXT: Record<RainMode, RainMode> = { auto: "on", on: "off", off: "auto" };

const buttonClass =
  "rounded-full border border-white/10 bg-black/35 px-3 py-1.5 text-[10px] font-semibold tracking-[0.16em] text-[#d8e8f1] uppercase backdrop-blur-md transition hover:border-[#8fb8c8] hover:text-white";

export function ExploreControls({
  visible,
  rainMode,
  onRainModeChange,
  rainAvailable,
}: {
  visible: boolean;
  rainMode: RainMode;
  onRainModeChange: (mode: RainMode) => void;
  /** Rain is disabled when the user prefers reduced motion. */
  rainAvailable: boolean;
}) {
  const t = useTranslations("explore");
  const tWeather = useTranslations("weather");
  const { exploreMode, enterExplore, exitExplore, activeSection } = usePortfolioNav();
  const finePointer = useSyncExternalStore(
    subscribeFinePointer,
    () => window.matchMedia(FINE_POINTER).matches,
    () => true
  );

  useEffect(() => {
    if (!exploreMode) return;
    const onKey = (e: KeyboardEvent) => {
      // With a panel open, Esc closes the panel first (handled by PortfolioInfoPanel).
      if (e.key === "Escape" && !activeSection) exitExplore();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [exploreMode, activeSection, exitExplore]);

  if (!visible) return null;

  const rainLabel =
    rainMode === "on" ? tWeather("rainOn") : rainMode === "off" ? tWeather("rainOff") : tWeather("rainAuto");

  return (
    <>
      <div className="fixed right-3 bottom-[calc(env(safe-area-inset-bottom)+3.1rem)] z-10 flex flex-col items-end gap-2 sm:right-6 sm:bottom-16">
        {rainAvailable && (
          <button
            type="button"
            onClick={() => onRainModeChange(RAIN_NEXT[rainMode])}
            className={buttonClass}
            aria-label={rainLabel}
          >
            {rainLabel}
          </button>
        )}
        <button
          type="button"
          onClick={() => (exploreMode ? exitExplore() : enterExplore())}
          aria-pressed={exploreMode}
          className={[
            buttonClass,
            exploreMode ? "border-[#dca869]/70 bg-[#2f1f11]/70 text-[#fce6c4]" : "",
          ].join(" ")}
        >
          {exploreMode ? t("exit") : t("enter")}
        </button>
      </div>
      {exploreMode && (
        <div
          className="pointer-events-none fixed left-0 right-0 z-8 px-4 text-center text-[10px] tracking-[0.14em] text-[#d8e8f1]/90 uppercase bottom-[calc(env(safe-area-inset-bottom)+2.4rem)] sm:bottom-20 sm:text-[11px]"
          aria-live="polite"
        >
          {finePointer ? t("hintDesktop") : t("hintTouch")}
        </div>
      )}
    </>
  );
}
