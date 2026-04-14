"use client";

import React from "react";
import { useTranslations } from "next-intl";

import {
  useTimeOfDay,
  TIME_IDS,
  TIME_DOT_COLORS,
} from "./TimeOfDayContext";

export function TimeOfDayToggle({ visible }: { visible: boolean }) {
  const t = useTranslations("time");
  const { timeOfDay, setTimeOfDay, mode, setRealtimeMode } = useTimeOfDay();

  return (
    <div
      className={[
        "fixed right-3 top-3 z-10 flex max-w-[calc(100vw-1.5rem)] items-center gap-0.5 overflow-x-auto rounded-full border border-white/10 bg-black/30 p-1 backdrop-blur-md md:right-6 md:top-6",
        "transition-opacity duration-700",
        visible ? "opacity-100" : "pointer-events-none opacity-0",
      ].join(" ")}
    >
      {TIME_IDS.map((id) => (
        <button
          key={id}
          type="button"
          onClick={() => setTimeOfDay(id)}
          className={[
            "flex shrink-0 items-center gap-1 rounded-full px-1.5 py-1.5 text-[8px] font-medium uppercase tracking-[0.08em] transition-all duration-300 sm:gap-1.5 sm:px-2 sm:text-[9px] sm:tracking-[0.12em]",
            timeOfDay === id
              ? "bg-white/15 text-white/90"
              : "text-white/35 hover:text-white/60",
          ].join(" ")}
        >
          <span
            className="inline-block h-1.5 w-1.5 rounded-full transition-transform duration-300"
            style={{
              backgroundColor: TIME_DOT_COLORS[id],
              transform: timeOfDay === id ? "scale(1.5)" : "scale(1)",
            }}
          />
          <span className="hidden sm:inline">{t(id)}</span>
          <span className="sm:hidden">{t(id).slice(0, 3)}</span>
        </button>
      ))}

      <span className="mx-0.5 h-4 w-px bg-white/15" />

      <button
        type="button"
        onClick={() => setRealtimeMode(mode !== "realtime")}
        title={mode === "realtime" ? t("realtimeOn") : t("realtimeOff")}
        className={[
          "flex shrink-0 items-center justify-center rounded-full px-1.5 py-1.5 text-[8px] font-medium uppercase tracking-[0.08em] transition-all duration-300 sm:px-2 sm:text-[9px] sm:tracking-[0.12em]",
          mode === "realtime"
            ? "bg-white/15 text-white/90"
            : "text-white/35 hover:text-white/60",
        ].join(" ")}
      >
        {t("realButton")}
      </button>
    </div>
  );
}
