"use client";

import React from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";

type IslandIntroOverlayProps = {
  progress: number;
  canStart: boolean;
  lowPerformance: boolean;
  autoDetectedPerformance: boolean;
  onTogglePerformance: () => void;
  exiting?: boolean;
  onStart: () => void;
};

export function IslandIntroOverlay({
  progress,
  canStart,
  lowPerformance,
  autoDetectedPerformance,
  onTogglePerformance,
  exiting = false,
  onStart,
}: IslandIntroOverlayProps) {
  const t = useTranslations("intro");
  const pct = Math.min(100, Math.max(0, Math.round(progress)));

  return (
    <div
      className={[
        "absolute inset-0 z-10 flex flex-col items-center justify-center gap-6 overflow-hidden bg-[#0a0c10]/95 px-4 backdrop-blur-[14px] transition-[opacity,transform,filter] duration-700 ease-out sm:gap-8 sm:px-6 md:gap-10",
        exiting ? "pointer-events-none opacity-0 scale-[1.02] blur-[2px]" : "opacity-100 scale-100 blur-0",
      ].join(" ")}
    >
      <div className="pointer-events-none absolute inset-0 opacity-70">
        <div className="absolute left-1/2 top-1/2 h-[34rem] w-[34rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#31566b]/20 blur-3xl" />
        <div className="absolute bottom-[-10rem] left-1/2 h-[28rem] w-[46rem] -translate-x-1/2 rounded-[50%] bg-[#102636]/80 blur-3xl" />
      </div>

      <div className="relative flex flex-col items-center gap-3">
        <p className="text-[10px] font-medium tracking-[0.5em] text-[#7d95a5] uppercase">
          {t("brand")}
        </p>
        <p className="max-w-md text-center text-xs leading-relaxed text-[#8fa6b5] sm:text-sm">
          {t("loadingHint")}
        </p>
      </div>

      <div className="relative h-24 w-44 sm:h-28 sm:w-52 md:h-32 md:w-60">
        <Image
          src="/boat.gif"
          alt="Loading boat"
          fill
          unoptimized
          priority
          className="object-contain drop-shadow-[0_8px_20px_rgba(0,0,0,0.45)]"
        />
      </div>

      <h1
        className="relative max-w-4xl text-center font-sans text-[clamp(1.75rem,6vw,4rem)] font-medium leading-tight tracking-tight text-[#f0f4f8]"
        style={{ fontFeatureSettings: '"tnum"' }}
      >
        {t("loading", { pct })}
      </h1>

      <div className="relative w-full max-w-[min(24rem,92vw)] sm:max-w-[min(24rem,90vw)]">
        <div
          className="h-2 overflow-hidden rounded-full border border-[#263746] bg-[#101923]"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full rounded-full bg-linear-to-r from-[#7fb3c6] via-[#e8eef2] to-[#f5d08a] transition-[width] duration-300 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="mt-2 flex items-center justify-between text-[10px] tracking-[0.16em] text-[#657887] uppercase">
          <span>{t("assetsReady")}</span>
          <span>{pct}%</span>
        </div>
      </div>

      <button
        type="button"
        onClick={onTogglePerformance}
        className="relative rounded-full border border-[#466777]/75 bg-[#10202a]/70 px-4 py-2 text-xs font-semibold tracking-[0.14em] text-[#d8ecf5] uppercase backdrop-blur-sm transition hover:border-[#8fb8c8] hover:text-white"
      >
        {lowPerformance ? t("optimizedMode") : t("qualityMode")}
        {autoDetectedPerformance ? <span className="ml-2 text-[#8fb5c7]">{t("auto")}</span> : null}
      </button>

      <button
        type="button"
        disabled={!canStart}
        onClick={onStart}
        className={[
          "min-h-11 border-b-2 px-2 pb-1 text-sm font-semibold tracking-[0.28em] uppercase transition-colors sm:tracking-[0.35em]",
          canStart
            ? "cursor-pointer border-[#e8eef2] text-[#e8eef2] hover:border-[#8fb8c8] hover:text-[#8fb8c8]"
            : "cursor-not-allowed border-[#2f3a45] text-[#3d4a58]",
        ].join(" ")}
      >
        {t("start")}
      </button>
    </div>
  );
}
