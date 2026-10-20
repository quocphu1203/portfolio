"use client";

import React, { useEffect, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";

import { getFishingFacts } from "../../../mock/fishingFacts";
import type { AppLocale } from "../../../mock/locale";
import { usePortfolioNav } from "../navigation/PortfolioNavContext";
import { useReducedMotion } from "../performance/useReducedMotion";
import {
  FISHING_BITE_WINDOW_MS,
  castAgain,
  clearFishingNotice,
  exitFishing,
  hookFish,
  setFishingFacts,
  startFishing,
  useFishingState,
} from "./fishingStore";

const NOTICE_MS = 3500;
const RING_R = 30;
const RING_C = 2 * Math.PI * RING_R;

const pill =
  "rounded-full border border-white/10 bg-black/45 px-3 py-1.5 text-[10px] font-semibold tracking-[0.14em] text-[#d8e8f1] uppercase backdrop-blur-md transition hover:border-[#8fb8c8] hover:text-white";

/** Fishing HUD: "go fishing" prompt, status + caught count, the "!" timing ring, fact card, Esc / Space / tap. */
export function FishingHud() {
  const t = useTranslations("fishing");
  const locale = useLocale() as AppLocale;
  const reducedMotion = useReducedMotion();
  const { exploreMode, activeSection } = usePortfolioNav();
  const s = useFishingState();
  const facts = useMemo(() => getFishingFacts(locale), [locale]);
  const active = s.phase !== "off";

  useEffect(() => setFishingFacts(facts), [facts]);

  useEffect(() => {
    if (!s.unreachable) return;
    const timer = window.setTimeout(clearFishingNotice, NOTICE_MS);
    return () => window.clearTimeout(timer);
  }, [s.unreachable]);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        // Capture phase on window: runs before explore's Esc (which would leave explore mode).
        e.preventDefault();
        e.stopImmediatePropagation();
        exitFishing();
        return;
      }
      if (e.code === "Space" && !(e.target instanceof HTMLButtonElement)) {
        e.preventDefault();
        if (!e.repeat) hookFish();
      }
    };
    const onDown = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      if (e.target instanceof Element && e.target.closest("[data-fishing-ui]")) return;
      hookFish();
    };
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("pointerdown", onDown, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("pointerdown", onDown, true);
    };
  }, [active]);

  if (!exploreMode && !active && !s.unreachable) return null;
  const showPrompt = exploreMode && !active && s.near && !activeSection;
  const status =
    s.phase === "walking"
      ? t("walking")
      : s.phase === "missed"
        ? t("missed")
        : s.phase === "bite"
          ? t("bite")
          : s.phase === "caught" || s.phase === "reeling"
            ? ""
            : t("waiting");
  const fact = facts[s.factIndex]?.text ?? "";

  return (
    <>
      {showPrompt && (
        <div className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+6.25rem)] z-20 flex justify-center sm:bottom-32" data-fishing-ui>
          <button type="button" onClick={startFishing} className={`${pill} border-[#8fd0e8]/40 text-[#e9f8ff]`}>
            {t("prompt")}
          </button>
        </div>
      )}

      {s.unreachable && !active && (
        <div className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+4.5rem)] z-20 flex justify-center px-4" role="status">
          <p className="max-w-sm rounded-2xl bg-black/55 px-4 py-2 text-center text-xs text-[#e7f1f6] backdrop-blur-md">{t("unreachable")}</p>
        </div>
      )}

      {active && (
        <div
          className="fixed inset-x-0 top-[calc(env(safe-area-inset-top)+4.5rem)] z-20 flex justify-center px-4"
          data-fishing-ui
        >
          <div className="flex max-w-[92vw] items-center gap-3 rounded-full border border-white/10 bg-black/50 py-1.5 pr-1.5 pl-4 text-xs text-[#e7f1f6] backdrop-blur-md">
            <span className="font-semibold whitespace-nowrap" aria-label={t("count", { count: s.caught })}>
              🎣 {s.caught}
              {s.golden > 0 && <span className="ml-2 text-[#ffd76a]">✨ {s.golden}</span>}
            </span>
            {status && (
              <span className="truncate text-[#cfe3ec]" role="status" aria-live="polite">
                {status}
              </span>
            )}
            <button type="button" onClick={exitFishing} className={pill} aria-label={t("close")}>
              ✕
            </button>
          </div>
        </div>
      )}

      {/* "!" + timing ring: the reaction window, emptying over FISHING_BITE_WINDOW_MS. Clicks pass through. */}
      {s.phase === "bite" && (
        <div className="pointer-events-none fixed inset-0 z-20 flex items-center justify-center" aria-hidden>
          <motion.div
            key={s.biteId}
            initial={reducedMotion ? { opacity: 1 } : { scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.12 }}
            className="relative flex h-20 w-20 items-center justify-center"
            data-fishing-bite
          >
            <svg viewBox="0 0 72 72" className="absolute inset-0 h-full w-full -rotate-90">
              <circle cx="36" cy="36" r={RING_R} fill="rgba(0,0,0,0.35)" stroke="rgba(255,255,255,0.18)" strokeWidth="5" />
              <motion.circle
                cx="36"
                cy="36"
                r={RING_R}
                fill="none"
                stroke="#ffd76a"
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray={RING_C}
                initial={{ strokeDashoffset: 0 }}
                animate={{ strokeDashoffset: RING_C }}
                transition={{ duration: FISHING_BITE_WINDOW_MS / 1000, ease: "linear" }}
              />
            </svg>
            <span className="relative text-4xl font-black text-[#fff3c4] drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)]">!</span>
          </motion.div>
        </div>
      )}

      <AnimatePresence>
        {s.phase === "caught" && (
          <motion.div
            key={`card-${s.caught}`}
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+6.25rem)] z-20 mx-auto w-[min(92vw,24rem)] rounded-2xl border border-[#8fd0e8]/30 bg-[#0d1a22]/85 p-4 text-[#e7f1f6] shadow-[0_12px_40px_rgba(0,0,0,0.45)] backdrop-blur-md sm:bottom-32"
            role="dialog"
            aria-label={s.lastGolden ? t("goldenTitle") : t("caughtTitle")}
            data-fishing-ui
            data-fishing-card
          >
            <p className={`text-sm font-semibold ${s.lastGolden ? "text-[#ffd76a]" : "text-[#e9f8ff]"}`}>
              {s.lastGolden ? t("goldenTitle") : t("caughtTitle")}
            </p>
            <p className="mt-2 text-[10px] font-semibold tracking-[0.16em] text-[#8fb8c8] uppercase">{t("factLabel")}</p>
            <p className="mt-1 text-sm leading-relaxed">{fact}</p>
            <div className="mt-3 flex justify-end gap-2">
              <button type="button" onClick={exitFishing} className={pill}>
                {t("stop")}
              </button>
              <button type="button" onClick={castAgain} className={`${pill} border-[#8fd0e8]/40 text-[#e9f8ff]`} autoFocus>
                {t("again")}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
