"use client";

import React, { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

import { EXPERIENCE_MILESTONES } from "../../../mock/experienceData";
import { PROJECT_BIRD_ITEMS } from "../../../mock/projectsData";
import { NAV_COPY, type NavId } from "../navigation/portfolioNavData";
import { usePortfolioNav } from "../navigation/PortfolioNavContext";

export function PortfolioInfoPanel({ visible }: { visible: boolean }) {
  const {
    activeSection,
    flyToDefault,
    selectedProjectId,
    setSelectedProjectId,
    experienceUnlockedCount,
  } = usePortfolioNav();

  useEffect(() => {
    if (!visible || !activeSection) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (activeSection === "projects" && selectedProjectId) {
        setSelectedProjectId(null);
        return;
      }
      flyToDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible, activeSection, flyToDefault, selectedProjectId, setSelectedProjectId]);

  if (!visible || !activeSection) return null;

  const copy = NAV_COPY[activeSection as NavId];
  const isAbout = activeSection === "about";
  const isSkills = activeSection === "articles";
  const isProjects = activeSection === "projects";
  const isExperience = activeSection === "credits";
  const selectedProject = PROJECT_BIRD_ITEMS.find((p) => p.id === selectedProjectId) ?? null;

  if (isProjects && !selectedProject) return null;

  return (
    <AnimatePresence mode="wait">
      {isAbout ? (
        <Dialog open={isAbout} onOpenChange={(open) => !open && flyToDefault()}>
          <DialogContent
            showCloseButton={false}
            className="h-[75vh] w-[80vw] max-h-[75vh] max-w-[80vw] sm:max-w-[80vw] rounded-2xl border border-[#87a9bb]/50 bg-[#0a1118]/70 p-0 shadow-[0_20px_80px_rgba(0,0,0,0.55)] backdrop-blur-2xl"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 18 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              transition={{ duration: 0.32, ease: "easeOut" }}
              className="h-full overflow-auto p-10"
            >
              <p className="mb-1 text-[10px] tracking-[0.35em] text-[#bfd2de] uppercase">Island</p>
              <DialogTitle id="portfolio-panel-title" className="mb-4 text-3xl font-medium text-[#f7fbff] drop-shadow-[0_2px_4px_rgba(0,0,0,0.45)]">
                {copy.title}
              </DialogTitle>
              <DialogDescription className="mb-6 text-base leading-relaxed text-[#e4eef5]">
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
            "fixed z-520 cursor-auto",
            isSkills || isProjects || isExperience
              ? "right-6 top-1/2 h-[min(78vh,46rem)] w-[min(46vw,40rem)] -translate-y-1/2"
              : "right-6 top-1/2 w-[min(22rem,calc(100vw-3rem))] -translate-y-1/2",
          ].join(" ")}
          role="dialog"
          aria-labelledby="portfolio-panel-title"
          initial={{ opacity: 0, x: isSkills || isProjects || isExperience ? 44 : 28 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: isSkills || isProjects || isExperience ? 32 : 24 }}
          transition={{ duration: 0.24, ease: "easeOut" }}
        >
          <div
            className={[
              isSkills || isProjects || isExperience
                ? "h-full overflow-y-auto [overflow-anchor:none] rounded-2xl border border-[#87a9bb]/50 bg-[#0a1118]/68 p-8 shadow-[0_20px_80px_rgba(0,0,0,0.55)] backdrop-blur-2xl"
                : "border border-[#2a3545]/90 bg-[#0e1318]/95 p-6 shadow-2xl backdrop-blur-md",
            ].join(" ")}
          >
            <p className="mb-1 text-[10px] tracking-[0.35em] text-[#bfd2de] uppercase">Island</p>
            <h2
              id="portfolio-panel-title"
              className={[
                "mb-3 font-medium text-[#f7fbff] drop-shadow-[0_2px_4px_rgba(0,0,0,0.45)]",
                isSkills || isProjects || isExperience ? "text-3xl" : "text-xl",
              ].join(" ")}
            >
              {isProjects ? selectedProject?.name ?? "Projects" : copy.title}
            </h2>
            <p
              className={[
                "leading-relaxed text-[#dce9f1]",
                isSkills || isProjects || isExperience ? "mb-7 text-base" : "mb-5 text-sm",
              ].join(" ")}
            >
              {isProjects
                ? selectedProject?.description ?? "Chọn một con chim để xem thông tin chi tiết dự án."
                : copy.body}
            </p>
            {isExperience && (
              <ol className="mb-6 space-y-4">
                {EXPERIENCE_MILESTONES.map((milestone, index) => (
                  <li key={milestone.id} className="relative pl-7">
                    <span className="absolute top-2 left-0 h-3 w-3 rounded-full border border-[#9ad0e4]/80 bg-[#2b7b96]" />
                    {index < EXPERIENCE_MILESTONES.length - 1 && (
                      <span className="absolute top-5 left-[5px] h-[calc(100%+0.75rem)] w-[2px] bg-linear-to-b from-[#7fb3c6]/80 to-[#2e4f60]/20" />
                    )}
                    <article className="rounded-xl border border-[#5f7d8b]/65 bg-[#11212a]/45 p-4">
                      <p className="mb-1 text-xs tracking-[0.14em] text-[#9cc4d4] uppercase">
                        {milestone.period}
                      </p>
                      {index < experienceUnlockedCount ? (
                        <>
                          <h3 className="text-lg font-medium text-[#e7f4fb]">{milestone.title}</h3>
                          <p className="mb-2 text-sm text-[#b6d3df]">{milestone.company}</p>
                          <p className="mb-3 text-sm leading-relaxed text-[#c4dbe6]">{milestone.summary}</p>
                          <ul className="flex flex-wrap gap-2">
                            {milestone.skills.map((skill) => (
                              <li
                                key={skill}
                                className="rounded-full border border-[#5f8495]/70 bg-[#17313d]/55 px-2.5 py-1 text-xs text-[#d1e7f2]"
                              >
                                {skill}
                              </li>
                            ))}
                          </ul>
                        </>
                      ) : (
                        <p className="text-sm text-[#8fa6b1]">Chưa mở khóa, chờ mèo tới cột cờ này.</p>
                      )}
                    </article>
                  </li>
                ))}
              </ol>
            )}
            {!isProjects && !isExperience && copy.links && copy.links.length > 0 && (
              <ul className={["flex flex-wrap gap-2", isSkills || isProjects ? "mb-8" : "mb-5"].join(" ")}>
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
            {isProjects && (
              <div className="mb-5 flex flex-wrap gap-2">
                {selectedProject?.github ? (
                  <a
                    href={selectedProject.github}
                    className="inline-block rounded-full border border-[#4a6a78]/80 px-3.5 py-1.5 text-sm text-[#b8d0dc] transition hover:border-[#8fb8c8] hover:text-[#e8eef2]"
                  >
                    GitHub
                  </a>
                ) : (
                  <span className="inline-block rounded-full border border-[#3d4e59]/70 px-3.5 py-1.5 text-sm text-[#8899a3]">
                    Chưa có GitHub
                  </span>
                )}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
