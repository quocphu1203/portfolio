"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { getExperienceMilestones } from "../../../mock/experienceData";
import type { AppLocale } from "../../../mock/locale";
import { getNavCopy, getProjectBirdItems, type NavId } from "../navigation/portfolioNavData";
import { usePortfolioNav } from "../navigation/PortfolioNavContext";

export function PortfolioInfoPanel({ visible }: { visible: boolean }) {
  const locale = useLocale() as AppLocale;
  const t = useTranslations("panel");
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

  const panelRef = useRef<HTMLDivElement>(null);
  const [isMobileLike, setIsMobileLike] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px), (pointer: coarse)");
    const sync = () => setIsMobileLike(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  const handleClose = useCallback(() => {
    if (activeSection === "projects" && selectedProjectId) {
      setSelectedProjectId(null);
      return;
    }
    flyToDefault();
  }, [activeSection, selectedProjectId, setSelectedProjectId, flyToDefault]);

  useEffect(() => {
    if (!visible || !activeSection) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        handleClose();
      }
    };
    window.addEventListener("mousedown", handleClickOutside);
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, [visible, activeSection, handleClose]);

  if (!visible || !activeSection) return null;

  const navCopy = getNavCopy(locale);
  const projectBirdItems = getProjectBirdItems(locale);
  const experienceMilestones = getExperienceMilestones(locale);
  const copy = navCopy[activeSection as NavId];
  const isAbout = activeSection === "about";
  const isSkills = activeSection === "articles";
  const isProjects = activeSection === "projects";
  const isExperience = activeSection === "credits";
  const selectedProject = projectBirdItems.find((p) => p.id === selectedProjectId) ?? null;
  const aboutParagraphsFromLineBreaks = copy.body
    .split(/\n\s*\n|\n/g)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  const aboutParagraphs =
    aboutParagraphsFromLineBreaks.length > 1
      ? aboutParagraphsFromLineBreaks
      : (() => {
        const sentences =
          copy.body
            .match(/[^.!?]+[.!?]+(?:\s|$)|[^.!?]+$/g)
            ?.map((sentence) => sentence.trim())
            .filter(Boolean) ?? [];

        if (sentences.length <= 2) return aboutParagraphsFromLineBreaks;

        const grouped: string[] = [];
        for (let i = 0; i < sentences.length; i += 2) {
          grouped.push(sentences.slice(i, i + 2).join(" "));
        }
        return grouped;
      })();

  if (isProjects && !selectedProject) {
    if (!isMobileLike) return null;
    return (
      <div className="fixed inset-x-3 bottom-3 z-520 flex justify-center md:hidden">
        <button
          type="button"
          onClick={flyToDefault}
          className="rounded-full border border-[#5a7a8a]/70 bg-[#0e1a22]/80 px-4 py-2 text-sm text-[#d7e8f1] backdrop-blur-sm transition hover:border-[#8fb8c8] hover:text-white"
        >
          {t("close")}
        </button>
      </div>
    );
  }

  const closeButton = (
    <button
      type="button"
      onClick={handleClose}
      className="absolute top-3 right-3 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-[#5a7a8a]/60 bg-[#0e1a22]/70 text-[#b0c8d4] backdrop-blur-sm transition hover:border-[#8fb8c8] hover:bg-[#162a35]/80 hover:text-white md:top-4 md:right-4 md:h-8 md:w-8"
      aria-label={t("close")}
    >
      <X size={16} />
    </button>
  );

  return (
    <AnimatePresence mode="wait">
      {isAbout ? (
        <Dialog open={isAbout} onOpenChange={(open) => !open && flyToDefault()}>
          <DialogContent
            showCloseButton={false}
            className="h-[74vh] w-[94vw] max-h-[74vh] max-w-[94vw] grid-rows-[minmax(0,1fr)] gap-0 overflow-hidden rounded-2xl border border-[#87a9bb]/50 bg-[#0a1118]/78 p-0 shadow-[0_20px_80px_rgba(0,0,0,0.55)] backdrop-blur-2xl sm:h-[72vh] sm:w-[90vw] sm:max-w-[90vw] md:w-[72vw] md:max-w-[72vw] xl:h-[70vh] xl:w-[66vw] xl:max-w-[66vw]"
          >
            <DialogClose asChild>
              <button
                type="button"
                className="absolute top-3 right-3 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-[#5a7a8a]/60 bg-[#0e1a22]/70 text-[#b0c8d4] backdrop-blur-sm transition hover:border-[#8fb8c8] hover:bg-[#162a35]/80 hover:text-white md:top-4 md:right-4 md:h-8 md:w-8"
                aria-label={t("close")}
              >
                <X size={16} />
              </button>
            </DialogClose>
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 18 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              transition={{ duration: 0.32, ease: "easeOut" }}
              className="flex h-full min-h-0 flex-col"
            >
              <div className="shrink-0 px-4 pb-4 pt-12 sm:px-6 sm:pt-12 md:px-8 md:pt-14 lg:px-10">
                <div className="mx-auto w-full">
                  <p className="mb-2 text-[10px] tracking-[0.3em] text-[#c5d8e3]/95 uppercase">{t("island")}</p>
                  <DialogTitle
                    id="portfolio-panel-title"
                    className="text-[1.85rem] font-medium leading-[1.2] text-[#f8fbff] drop-shadow-[0_2px_4px_rgba(0,0,0,0.45)] sm:text-[2rem] md:text-[2.08rem]"
                  >
                    {copy.title}
                  </DialogTitle>
                </div>
              </div>

              <ScrollArea className="min-h-0 flex-1">
                <div className="px-4 sm:px-6 md:px-8 lg:px-10">
                  <div className="mx-auto w-full">
                    <DialogDescription className="max-w-none text-[1rem] leading-[1.9] text-[#e6f0f7] sm:text-[1.03rem] sm:leading-[1.92]">
                      <div className="space-y-5 text-pretty md:space-y-6">
                        {aboutParagraphs.map((paragraph) => (
                          <p key={paragraph} className="text-[#e2edf5]/95">
                            {paragraph}
                          </p>
                        ))}
                      </div>
                    </DialogDescription>
                  </div>
                </div>
              </ScrollArea>

              {copy.links && copy.links.length > 0 && (
                <div className="sticky bottom-0 shrink-0 border-t border-[#7f9aac]/30 bg-[#0a1118]/88 px-4 pb-7 pt-5 backdrop-blur-md sm:px-6 sm:pb-8 md:px-8 md:pb-9 lg:px-10 lg:pb-10">
                  <div className="mx-auto w-full">
                    <ul className="flex flex-wrap gap-2.5">
                      {copy.links.map((link) => (
                        <li key={link.href + link.label}>
                          <a
                            href={link.href}
                            className="inline-flex items-center rounded-full border border-[#7ea5b9]/70 bg-[#12212b]/35 px-4 py-1.5 text-sm font-medium text-[#e2eff8] transition hover:border-[#a9d5ec] hover:bg-[#162a35]/65 hover:text-white"
                          >
                            {link.label}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </motion.div>
          </DialogContent>
        </Dialog>
      ) : (
        <motion.div
          ref={panelRef}
          key="section-panel-side"
          className={[
            "fixed z-520 cursor-auto",
            isSkills || isProjects || isExperience
              ? "inset-x-3 bottom-3 h-[min(72vh,40rem)] w-auto md:inset-x-auto md:right-4 md:top-1/2 md:bottom-auto md:h-[min(78vh,46rem)] md:w-[min(52vw,40rem)] md:-translate-y-1/2 lg:right-6 lg:w-[min(46vw,40rem)]"
              : "inset-x-3 bottom-3 w-auto md:inset-x-auto md:right-4 md:top-1/2 md:bottom-auto md:w-[min(22rem,calc(100vw-3rem))] md:-translate-y-1/2 lg:right-6",
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
              "relative",
              isSkills || isProjects || isExperience
                ? "h-full [overflow-anchor:none] rounded-2xl border border-[#87a9bb]/50 bg-[#0a1118]/68 p-4 pt-12 shadow-[0_20px_80px_rgba(0,0,0,0.55)] backdrop-blur-2xl sm:p-6 sm:pt-12 md:p-8 md:pt-14"
                : "rounded-2xl border border-[#2a3545]/90 bg-[#0e1318]/95 p-4 pt-12 shadow-2xl backdrop-blur-md sm:p-6 sm:pt-12",
            ].join(" ")}
          >
            {closeButton}
            <ScrollArea className="h-full min-h-0">
              <div>
                <p className="mb-1 text-[10px] tracking-[0.35em] text-[#bfd2de] uppercase">{t("island")}</p>
                <h2
                  id="portfolio-panel-title"
                  className={[
                    "mb-3 font-medium text-[#f7fbff] drop-shadow-[0_2px_4px_rgba(0,0,0,0.45)]",
                    isSkills || isProjects || isExperience ? "text-2xl sm:text-3xl" : "text-lg sm:text-xl",
                  ].join(" ")}
                >
                  {isProjects ? selectedProject?.name ?? t("projectsFallbackTitle") : copy.title}
                </h2>
                <p
                  className={[
                    "leading-relaxed text-[#dce9f1]",
                    !isProjects ? "whitespace-pre-line" : "",
                    isSkills || isProjects || isExperience ? "mb-6 text-sm sm:mb-7 sm:text-base" : "mb-5 text-sm",
                  ].join(" ")}
                >
                  {isProjects
                    ? selectedProject?.description ?? t("projectFallbackDescription")
                    : copy.body}
                </p>
                {isExperience && (
                  <ol className="mb-6 space-y-4">
                    {experienceMilestones.map((milestone, index) => (
                      <li key={milestone.id} className="relative pl-7">
                        <span className="absolute top-2 left-0 h-3 w-3 rounded-full border border-[#9ad0e4]/80 bg-[#2b7b96]" />
                        {index < experienceMilestones.length - 1 && (
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
                            <p className="text-sm text-[#8fa6b1]">{t("lockedMilestone")}</p>
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
                        {t("github")}
                      </a>
                    ) : (
                      <span className="inline-block rounded-full border border-[#3d4e59]/70 px-3.5 py-1.5 text-sm text-[#8899a3]">
                        {t("noGithub")}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
