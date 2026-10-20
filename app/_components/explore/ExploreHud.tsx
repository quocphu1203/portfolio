"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import { getExperienceMilestones } from "../../../mock/experienceData";
import type { AppLocale } from "../../../mock/locale";
import { useFishingState } from "../fishing/fishingStore";
import { usePortfolioNav } from "../navigation/PortfolioNavContext";
import { useFinePointer } from "../ui/useFinePointer";
import { explorePoi, useExploreProgress } from "./exploreProgress";

/** The controls line folds away after this long (re-open with the ? button). */
const CONTROLS_OPEN_MS = 7000;

/**
 * Compact explore HUD (top left, under the language switch): controls hint, discoveries, fish caught and a
 * compass arrow to the nearest undiscovered spot. The arrow / distance update from an animation-frame loop
 * that reads `explorePoi` (written by the cat each frame); React only re-renders on discoveries.
 */
export function ExploreHud() {
  const t = useTranslations("exploreHud");
  const tExplore = useTranslations("explore");
  const locale = useLocale() as AppLocale;
  const finePointer = useFinePointer();
  const { exploreMode, activeSection, introPhase } = usePortfolioNav();
  const fishing = useFishingState();
  const progress = useExploreProgress();
  const milestones = useMemo(() => getExperienceMilestones(locale), [locale]);
  const [controlsOpen, setControlsOpen] = useState(true);
  const arrowRef = useRef<HTMLSpanElement>(null);
  const nameRef = useRef<HTMLSpanElement>(null);
  const distRef = useRef<HTMLSpanElement>(null);
  const compassRef = useRef<HTMLDivElement>(null);

  const visible = exploreMode && !activeSection && introPhase === "idle" && fishing.phase === "off";
  const total = milestones.length;
  const found = progress.milestones.filter((idx) => idx < total).length;
  const allFound = found >= total && progress.pier;

  useEffect(() => {
    if (!exploreMode) return;
    const timer = window.setTimeout(() => setControlsOpen(false), CONTROLS_OPEN_MS);
    return () => window.clearTimeout(timer);
  }, [exploreMode]);

  const pierName = t("pier");
  useEffect(() => {
    if (!visible || allFound) return;
    let raf = 0;
    let lastName = "";
    let lastDist = "";
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const compass = compassRef.current;
      if (!compass) return;
      compass.style.visibility = explorePoi.valid ? "visible" : "hidden";
      if (!explorePoi.valid) return;
      if (arrowRef.current) arrowRef.current.style.transform = `rotate(${explorePoi.angle.toFixed(3)}rad)`;
      const m = explorePoi.kind === "milestone" ? milestones[explorePoi.idx] : undefined;
      const name = explorePoi.kind === "pier" ? pierName : m ? `${m.title} · ${m.company}` : "";
      if (name !== lastName && nameRef.current) {
        lastName = name;
        nameRef.current.textContent = name;
      }
      const dist = t("distance", { d: Math.max(1, Math.round(explorePoi.dist)) });
      if (dist !== lastDist && distRef.current) {
        lastDist = dist;
        distRef.current.textContent = dist;
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [visible, allFound, milestones, pierName, t]);

  if (!visible) return null;

  return (
    <div
      className="pointer-events-none fixed top-[calc(env(safe-area-inset-top)+3.75rem)] left-3 z-10 w-[min(16rem,calc(100vw-1.5rem))] md:top-[5.25rem] md:left-6"
      data-explore-hud
    >
      <div className="pointer-events-auto rounded-2xl border border-white/10 bg-black/40 px-3 py-2 text-[#d8e8f1] shadow-[0_8px_24px_rgba(0,0,0,0.35)] backdrop-blur-md">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] font-semibold tracking-[0.16em] text-[#fce6c4] uppercase">🐾 {t("title")}</p>
          <button
            type="button"
            onClick={() => setControlsOpen((open) => !open)}
            aria-expanded={controlsOpen}
            aria-label={controlsOpen ? t("hideControls") : t("showControls")}
            className="flex h-5 w-5 items-center justify-center rounded-full border border-white/15 text-[10px] text-[#b9ccd6] transition hover:border-[#8fb8c8] hover:text-white"
          >
            {controlsOpen ? "–" : "?"}
          </button>
        </div>
        {controlsOpen && (
          <p className="mt-1 text-[10px] leading-snug text-[#b9ccd6]" data-explore-controls>
            {finePointer ? tExplore("hintDesktop") : tExplore("hintTouch")}
          </p>
        )}
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px]" aria-live="polite">
          <span data-explore-milestones>{t("milestones", { found, total })}</span>
          <span data-explore-fish>{t("fish", { count: fishing.caught })}</span>
          <span className={progress.pier ? "text-[#bfe8c9]" : "text-[#8193a0]"} data-explore-pier>
            {t("pierFound")} {progress.pier ? "✓" : "–"}
          </span>
        </div>
        {allFound ? (
          <p className="mt-1.5 text-[11px] text-[#bfe8c9]">{t("allFound")}</p>
        ) : (
          <div ref={compassRef} className="mt-1.5 flex items-center gap-2 text-[11px]" data-explore-compass style={{ visibility: "hidden" }}>
            <span
              ref={arrowRef}
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#dca869]/50 bg-[#2f1f11]/60 text-[#fce6c4]"
              aria-hidden
              data-explore-arrow
            >
              <svg viewBox="0 0 12 12" className="h-3 w-3" fill="currentColor">
                <path d="M6 0.8 10.2 10.6 6 8.4 1.8 10.6Z" />
              </svg>
            </span>
            <span className="min-w-0 flex-1 truncate">
              <span className="text-[#8fb8c8]">{t("next")} </span>
              <span ref={nameRef} data-explore-poi />
            </span>
            <span ref={distRef} className="shrink-0 text-[#b9ccd6]" />
          </div>
        )}
      </div>
    </div>
  );
}
