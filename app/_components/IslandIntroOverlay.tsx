"use client";

import React from "react";

type IslandIntroOverlayProps = {
  progress: number;
  canStart: boolean;
  onStart: () => void;
};

export function IslandIntroOverlay({
  progress,
  canStart,
  onStart,
}: IslandIntroOverlayProps) {
  const pct = Math.min(100, Math.max(0, Math.round(progress)));

  return (
    <div
      className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-12 bg-[#0a0c10]/95 px-6 backdrop-blur-[14px]"
    >
      <p className="text-[10px] font-medium tracking-[0.5em] text-[#6a7f8e] uppercase">
        Island portfolio
      </p>

      <h1
        className="max-w-4xl text-center font-sans text-[clamp(1.75rem,6vw,4rem)] font-medium leading-tight tracking-tight text-[#f0f4f8]"
        style={{ fontFeatureSettings: '"tnum"' }}
      >
        Đang dựng đảo… {pct}
        <span className="text-[#6a7f8e]">%</span>
      </h1>

      <div className="w-full max-w-[min(22rem,90vw)]">
        <div
          className="h-[2px] overflow-hidden rounded-full bg-[#1a222c]"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full rounded-full bg-[#e8eef2] transition-[width] duration-300 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <button
        type="button"
        disabled={!canStart}
        onClick={onStart}
        className={[
          "border-b-2 pb-1 text-sm font-semibold tracking-[0.35em] uppercase transition-colors",
          canStart
            ? "cursor-pointer border-[#e8eef2] text-[#e8eef2] hover:border-[#8fb8c8] hover:text-[#8fb8c8]"
            : "cursor-not-allowed border-[#2f3a45] text-[#3d4a58]",
        ].join(" ")}
      >
        Start
      </button>
    </div>
  );
}
