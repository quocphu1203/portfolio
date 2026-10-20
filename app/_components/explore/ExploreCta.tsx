"use client";

import React, { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { useFishingState } from "../fishing/fishingStore";
import { usePortfolioNav } from "../navigation/PortfolioNavContext";
import { useFinePointer } from "../ui/useFinePointer";

/** One invite per visitor. */
const INVITE_KEY = "portfolio-explore-invite";
const INVITE_DELAY_MS = 5000;
const INVITE_VISIBLE_MS = 6000;

function inviteSeen() {
  try {
    return window.localStorage.getItem(INVITE_KEY) === "seen";
  } catch {
    return false;
  }
}

function markInviteSeen() {
  try {
    window.localStorage.setItem(INVITE_KEY, "seen");
  } catch {
    // Storage unavailable: the invite may show again next visit.
  }
}

const keyCap =
  "inline-flex h-4 min-w-4 items-center justify-center rounded-[4px] border border-[#fce6c4]/40 bg-black/30 px-1 text-[9px] leading-none font-semibold text-[#fce6c4]";

function ClickIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
      <rect x="4" y="1.5" width="8" height="13" rx="4" />
      <path d="M8 1.5v4.5M4 6h8" />
      <path d="M4.2 6V5.5a3.8 3.8 0 0 1 3.8-4" fill="currentColor" fillOpacity="0.45" stroke="none" />
    </svg>
  );
}

/**
 * Primary explore toggle (bottom centre on desktop; bottom left on phones, clear of the right-hand button stack)
 * plus a one-time speech-bubble invite ~5 s after Start. Hidden while a dialog / sheet or the intro is up.
 */
export function ExploreCta({ started }: { started: boolean }) {
  const t = useTranslations("exploreCta");
  const finePointer = useFinePointer();
  const { exploreMode, enterExplore, exitExplore, activeSection, introPhase } = usePortfolioNav();
  const fishing = useFishingState();
  const [armed, setArmed] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!started) return;
    const timer = window.setTimeout(() => {
      if (!inviteSeen()) setArmed(true);
    }, INVITE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [started]);

  const visible = started && !activeSection && introPhase === "idle";
  const inviteOpen = armed && !dismissed && visible && !exploreMode && fishing.phase === "off";

  useEffect(() => {
    if (!inviteOpen) return;
    markInviteSeen();
    const hide = () => setDismissed(true);
    const timer = window.setTimeout(hide, INVITE_VISIBLE_MS);
    window.addEventListener("pointerdown", hide, true);
    window.addEventListener("keydown", hide, true);
    window.addEventListener("wheel", hide, { capture: true, passive: true });
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pointerdown", hide, true);
      window.removeEventListener("keydown", hide, true);
      window.removeEventListener("wheel", hide, true);
    };
  }, [inviteOpen]);

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-[calc(env(safe-area-inset-bottom)+2.4rem)] left-3 z-20 sm:bottom-16 sm:left-1/2 sm:-translate-x-1/2"
      data-explore-cta
    >
      {inviteOpen && (
        <div
          className="absolute bottom-[calc(100%+0.7rem)] left-0 w-max max-w-[min(17rem,calc(100vw-1.5rem))] sm:left-1/2 sm:-translate-x-1/2"
          role="status"
          aria-live="polite"
          data-explore-invite
        >
          <div className="explore-invite-float relative rounded-2xl border border-[#dca869]/45 bg-[#1b130c]/85 px-3.5 py-2.5 text-[#fce6c4] shadow-[0_10px_30px_rgba(0,0,0,0.45)] backdrop-blur-md">
            <p className="text-xs font-medium">{t("invite")}</p>
            <div className="mt-1.5 flex items-center gap-2 text-[10px] text-[#e8cfa8]">
              {finePointer && (
                <span className="flex items-center gap-0.5" aria-label={t("inviteKeys")}>
                  <span className={keyCap}>W</span>
                  <span className={keyCap}>A</span>
                  <span className={keyCap}>S</span>
                  <span className={keyCap}>D</span>
                </span>
              )}
              <span className="flex items-center gap-1">
                <ClickIcon />
                {finePointer ? t("inviteClick") : t("inviteTap")}
              </span>
            </div>
            <span
              className="absolute top-full left-7 h-0 w-0 border-x-[7px] border-t-[7px] border-x-transparent border-t-[#1b130c]/85 sm:left-1/2 sm:-translate-x-1/2"
              aria-hidden
            />
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={() => {
          markInviteSeen();
          setDismissed(true);
          if (exploreMode) exitExplore();
          else enterExplore();
        }}
        aria-pressed={exploreMode}
        className={[
          "relative flex items-center gap-2 rounded-full border px-4 py-2.5 text-[11px] font-semibold tracking-[0.12em] uppercase shadow-[0_8px_26px_rgba(0,0,0,0.4)] backdrop-blur-md transition sm:px-5 sm:text-xs",
          exploreMode
            ? "border-white/15 bg-black/50 text-[#d8e8f1] hover:border-[#8fb8c8] hover:text-white"
            : "border-[#dca869]/70 bg-[#2f1f11]/75 text-[#fce6c4] hover:border-[#f3c98f] hover:bg-[#3a2715]/80",
        ].join(" ")}
      >
        {!exploreMode && <span className="explore-cta-glow" aria-hidden />}
        <span aria-hidden className="text-base leading-none">
          🐾
        </span>
        <span>{exploreMode ? t("exit") : t("enter")}</span>
        {exploreMode && finePointer && (
          <span className="rounded border border-white/20 px-1 py-px text-[9px] tracking-normal text-[#b9ccd6]">Esc</span>
        )}
      </button>
    </div>
  );
}
