"use client";

import React, { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

import { NAV_COPY, type NavId } from "./portfolioNavData";
import { usePortfolioNav } from "./PortfolioNavContext";

export function PortfolioInfoPanel({ visible }: { visible: boolean }) {
  const { activeSection, flyToDefault } = usePortfolioNav();

  useEffect(() => {
    if (!visible || !activeSection) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      flyToDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible, activeSection, flyToDefault]);

  if (!visible || !activeSection) return null;

  const copy = NAV_COPY[activeSection as NavId];
  const isAbout = activeSection === "about";
  const isSkills = activeSection === "articles";

  return (
    <AnimatePresence mode="wait">
      {isAbout ? (
        <Dialog open={isAbout} onOpenChange={(open) => !open && flyToDefault()}>
          <DialogContent
            showCloseButton={false}
            className="h-[75vh] w-[80vw] max-h-[75vh] max-w-[80vw] sm:max-w-[80vw] border border-[#87a9bb]/45 rounded-2xl bg-[#0e1318]/24 p-0 shadow-2xl backdrop-blur-3xl"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 18 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              transition={{ duration: 0.32, ease: "easeOut" }}
              className="h-full overflow-auto p-10"
            >
              <p className="mb-1 text-[10px] tracking-[0.35em] text-[#a0b2c2] uppercase">Island</p>
              <DialogTitle id="portfolio-panel-title" className="mb-4 text-3xl font-medium text-[#f0f5fa]">
                {copy.title}
              </DialogTitle>
              <DialogDescription className="mb-6 text-base leading-relaxed text-[#d3e1ea]">
                {copy.body}
              </DialogDescription>
              {copy.links && copy.links.length > 0 && (
                <ul className="mb-6 flex flex-wrap gap-2.5">
                  {copy.links.map((link) => (
                    <li key={link.href + link.label}>
                      <a
                        href={link.href}
                        className="inline-block rounded-full border border-[#7ba1b5]/70 bg-[#12212b]/25 px-3.5 py-1.5 text-sm text-[#ddedf7] transition hover:border-[#a4d0e6] hover:text-white"
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </motion.div>
          </DialogContent>
        </Dialog>
      ) : (
        <motion.div
          key="section-panel-side"
          className={[
            "fixed z-250 cursor-auto",
            isSkills
              ? "right-6 top-1/2 h-[min(74vh,44rem)] w-[min(46vw,40rem)] -translate-y-1/2"
              : "right-6 top-1/2 w-[min(22rem,calc(100vw-3rem))] -translate-y-1/2",
          ].join(" ")}
          role="dialog"
          aria-labelledby="portfolio-panel-title"
          initial={{ opacity: 0, x: isSkills ? 44 : 28 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: isSkills ? 32 : 24 }}
          transition={{ duration: 0.24, ease: "easeOut" }}
        >
          <div
            className={[
              isSkills
                ? "h-full rounded-2xl border border-[#87a9bb]/45 bg-[#0e1318]/24 p-8 shadow-2xl backdrop-blur-3xl"
                : "border border-[#2a3545]/90 bg-[#0e1318]/95 p-6 shadow-2xl backdrop-blur-md",
            ].join(" ")}
          >
            <p className="mb-1 text-[10px] tracking-[0.35em] text-[#6a7f8e] uppercase">Island</p>
            <h2
              id="portfolio-panel-title"
              className={[
                "mb-3 font-medium text-[#e8eef2]",
                isSkills ? "text-3xl" : "text-xl",
              ].join(" ")}
            >
              {copy.title}
            </h2>
            <p className={["leading-relaxed text-[#9fb0bd]", isSkills ? "mb-7 text-base" : "mb-5 text-sm"].join(" ")}>
              {copy.body}
            </p>
            {copy.links && copy.links.length > 0 && (
              <ul className={["flex flex-wrap gap-2", isSkills ? "mb-8" : "mb-5"].join(" ")}>
                {copy.links.map((link) => (
                  <li key={link.href + link.label}>
                    <a
                      href={link.href}
                      className={[
                        "inline-block rounded-full border border-[#4a6a78]/80 text-[#b8d0dc] transition hover:border-[#8fb8c8] hover:text-[#e8eef2]",
                        isSkills ? "px-3.5 py-1.5 text-sm" : "px-3 py-1.5 text-xs",
                      ].join(" ")}
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
