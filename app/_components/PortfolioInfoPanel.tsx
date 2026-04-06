"use client";

import React, { useEffect } from "react";

import { NAV_COPY, type NavId } from "./portfolioNavData";
import { usePortfolioNav } from "./PortfolioNavContext";

export function PortfolioInfoPanel({ visible }: { visible: boolean }) {
  const { activeSection, flyToMenu } = usePortfolioNav();

  useEffect(() => {
    if (!visible || !activeSection) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") flyToMenu();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible, activeSection, flyToMenu]);

  if (!visible || !activeSection) return null;

  const copy = NAV_COPY[activeSection as NavId];

  return (
    <div
      className="fixed right-6 top-1/2 z-[250] w-[min(22rem,calc(100vw-3rem))] cursor-auto -translate-y-1/2 opacity-100 transition-opacity duration-500"
      role="dialog"
      aria-labelledby="portfolio-panel-title"
    >
      <div className="border border-[#2a3545]/90 bg-[#0e1318]/95 p-6 shadow-2xl backdrop-blur-md">
        <p className="mb-1 text-[10px] tracking-[0.35em] text-[#6a7f8e] uppercase">Island</p>
        <h2 id="portfolio-panel-title" className="mb-3 text-xl font-medium text-[#e8eef2]">
          {copy.title}
        </h2>
        <p className="mb-5 text-sm leading-relaxed text-[#9fb0bd]">{copy.body}</p>
        {copy.links && copy.links.length > 0 && (
          <ul className="mb-5 flex flex-wrap gap-2">
            {copy.links.map((link) => (
              <li key={link.href + link.label}>
                <a
                  href={link.href}
                  className="inline-block rounded-full border border-[#4a6a78]/80 px-3 py-1.5 text-xs text-[#b8d0dc] transition hover:border-[#8fb8c8] hover:text-[#e8eef2]"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        )}
        <button
          type="button"
          onClick={flyToMenu}
          className="w-full rounded-full border border-[#8fb8c8]/50 bg-[#8fb8c8]/10 py-2.5 text-xs font-semibold tracking-[0.2em] text-[#c8dde6] uppercase transition hover:bg-[#8fb8c8]/20"
        >
          Quay lại biển báo
        </button>
      </div>
    </div>
  );
}
