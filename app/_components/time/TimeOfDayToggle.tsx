"use client";

import React from "react";

import {
  useTimeOfDay,
  TIME_IDS,
  TIME_LABELS,
  TIME_DOT_COLORS,
} from "./TimeOfDayContext";

export function TimeOfDayToggle({ visible }: { visible: boolean }) {
  const { timeOfDay, setTimeOfDay, mode, setRealtimeMode } = useTimeOfDay();

  return (
    <div
      className={[
        "fixed right-6 top-6 z-10 flex items-center gap-0.5 rounded-full border border-white/10 bg-black/30 p-1 backdrop-blur-md",
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
            "flex items-center gap-1.5 rounded-full px-2 py-1.5 text-[9px] font-medium uppercase tracking-[0.12em] transition-all duration-300",
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
          {TIME_LABELS[id]}
        </button>
      ))}

      <span className="mx-0.5 h-4 w-px bg-white/15" />

      <button
        type="button"
        onClick={() => setRealtimeMode(mode !== "realtime")}
        title={mode === "realtime" ? "Đang theo giờ thực" : "Bật giờ thực"}
        className={[
          "flex items-center justify-center rounded-full px-2 py-1.5 text-[9px] font-medium uppercase tracking-[0.12em] transition-all duration-300",
          mode === "realtime"
            ? "bg-white/15 text-white/90"
            : "text-white/35 hover:text-white/60",
        ].join(" ")}
      >
        Real
      </button>
    </div>
  );
}
