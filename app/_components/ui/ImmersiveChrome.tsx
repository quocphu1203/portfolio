"use client";

import React, { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { usePortfolioNav } from "../navigation/PortfolioNavContext";

const NOISE_SVG =
  "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E\")";

type ImmersiveChromeProps = {
  active: boolean;
};

export function ImmersiveChrome({ active }: ImmersiveChromeProps) {
  const t = useTranslations("chrome");
  const { activeSection, selectedProjectId } = usePortfolioNav();
  const [hintVisible, setHintVisible] = useState(true);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [keyboardHintAllowed, setKeyboardHintAllowed] = useState(false);

  useEffect(() => {
    const mqR = window.matchMedia("(prefers-reduced-motion: reduce)");
    const mqK = window.matchMedia("(hover: hover) and (pointer: fine)");
    const sync = () => {
      setReduceMotion(mqR.matches);
      setKeyboardHintAllowed(mqK.matches);
    };
    let raf = 0;
    raf = requestAnimationFrame(() => {
      sync();
    });
    mqR.addEventListener("change", sync);
    mqK.addEventListener("change", sync);
    return () => {
      cancelAnimationFrame(raf);
      mqR.removeEventListener("change", sync);
      mqK.removeEventListener("change", sync);
    };
  }, []);

  useEffect(() => {
    if (!active) return;
    if (activeSection === "projects") return;
    const t = window.setTimeout(() => {
      setHintVisible(false);
    }, 4500);
    return () => window.clearTimeout(t);
  }, [active, activeSection]);

  if (!active) return null;

  const hintText =
    activeSection === "projects" && !selectedProjectId
      ? t("hintProjects")
      : t("hintControls");
  const escHintText = keyboardHintAllowed ? t("hintEscBack") : null;
  const effectiveHintVisible = activeSection === "projects" ? true : hintVisible;

  return (
    <>
      {!reduceMotion && (
        <div
          className="pointer-events-none fixed inset-0 z-6 mix-blend-overlay"
          style={{
            opacity: 0.045,
            backgroundImage: NOISE_SVG,
            backgroundSize: "128px 128px",
            animation: "island-grain 0.5s steps(4) infinite",
          }}
          aria-hidden
        />
      )}

      <div
        className="pointer-events-none fixed inset-0 z-5"
        style={{
          background:
            "radial-gradient(ellipse at 50% 40%, transparent 0%, transparent 45%, rgba(5,8,12,0.55) 100%)",
        }}
        aria-hidden
      />

      <div
        className={[
          "pointer-events-none fixed left-0 right-0 z-8 text-center text-[10px] tracking-[0.18em] text-[#9fb0bd]/80 uppercase transition-opacity duration-700 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] sm:text-[11px] sm:tracking-[0.25em] sm:bottom-10",
          effectiveHintVisible ? "opacity-100" : "opacity-0",
        ].join(" ")}
        aria-live="polite"
      >
        <span>{hintText}</span>
        {escHintText ? <span>{` · ${escHintText}`}</span> : null}
      </div>
    </>
  );
}
