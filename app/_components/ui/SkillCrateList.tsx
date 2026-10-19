"use client";

import React from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { ArrowUpRight, Bird, MousePointerClick } from "lucide-react";

import { getProjectBirdItems, type ProjectBirdItem } from "../../../mock/projectsData";
import type { AppLocale } from "../../../mock/locale";
import { SKILL_GROUPS, projectIdsForSkill } from "../../../mock/skillsData";
import { usePortfolioNav } from "../navigation/PortfolioNavContext";

const LID_STAGGER_SECONDS = 0.38;

/** Skills grouped per cargo crate; picking a skill sends the matching project birds to the boat. */
export function SkillCrateList({ locale, reducedMotion }: { locale: AppLocale; reducedMotion: boolean }) {
  const t = useTranslations("skillCrates");
  const { highlightedSkill, setHighlightedSkill, openProjectFromSkill } = usePortfolioNav();
  const projects = getProjectBirdItems(locale);
  const byId = new Map<string, ProjectBirdItem>(projects.map((p) => [p.id, p]));
  const highlightedProjects = highlightedSkill
    ? projectIdsForSkill(highlightedSkill, projects).map((id) => ({ id, name: byId.get(id)?.name ?? id }))
    : [];
  const highlightedLabel = SKILL_GROUPS.flatMap((g) => g.items).find((s) => s.id === highlightedSkill)?.label;

  return (
    <div className="mb-6 space-y-4">
      <p className="flex items-start gap-2 rounded-lg border border-[#f3c77a]/30 bg-[#2f1f11]/35 px-3 py-2 text-sm leading-snug text-[#f6e3c2]">
        <MousePointerClick size={16} className="mt-0.5 shrink-0 text-[#f3c77a]" aria-hidden />
        {t("hint")}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {SKILL_GROUPS.map((group, gi) => (
          <motion.section
            key={group.id}
            // Sections appear in step with the crate lids opening on the boat.
            initial={reducedMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: reducedMotion ? 0 : 0.15 + gi * LID_STAGGER_SECONDS, duration: 0.3 }}
            className="rounded-xl border bg-[#0f1e27]/55 p-3"
            style={{ borderColor: `${group.color}66` }}
          >
            <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold tracking-[0.16em] uppercase" style={{ color: group.color }}>
              <span className="rounded border px-1 text-[10px]" style={{ borderColor: `${group.color}88` }}>
                {group.icon}
              </span>
              {t(group.id)}
            </h3>
            <ul className="flex flex-wrap gap-1.5">
              {group.items.map((skill) => {
                const count = projectIdsForSkill(skill.id, projects).length;
                const active = highlightedSkill === skill.id;
                return (
                  <li key={skill.id}>
                    <button
                      type="button"
                      onClick={() => setHighlightedSkill(active ? null : skill.id)}
                      aria-pressed={active}
                      title={count > 0 ? t("projectsCount", { count }) : t("noProjects")}
                      className={[
                        "flex cursor-pointer items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition focus-visible:ring-2 focus-visible:ring-[#f3c77a]/70 focus-visible:outline-none",
                        active
                          ? "border-[#f3c77a] bg-[#2f1f11]/85 text-[#fff1d6] shadow-[0_0_10px_rgba(243,199,122,0.5)]"
                          : "border-[#5f8495]/70 bg-[#17313d]/55 text-[#d1e7f2] hover:-translate-y-px hover:border-[#f3c77a]/80 hover:bg-[#22404d]/70 hover:text-white",
                        count === 0 ? "opacity-70" : "",
                      ].join(" ")}
                    >
                      {count > 0 && <Bird size={11} className="shrink-0 text-[#f3c77a]" aria-hidden />}
                      {skill.label}
                      {count > 0 && (
                        <span className="rounded-full bg-black/30 px-1.5 text-[10px] text-[#f3d9a8]">{count}</span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </motion.section>
        ))}
      </div>
      <div className="min-h-5 text-sm text-[#c4dbe6]" aria-live="polite">
        {highlightedSkill &&
          (highlightedProjects.length > 0 ? (
            <>
              <p className="mb-2">{t("birdsComing", { skill: highlightedLabel ?? "" })}</p>
              <ul className="flex flex-wrap gap-2">
                {highlightedProjects.map((project) => (
                  <li key={project.id}>
                    <button
                      type="button"
                      onClick={() => openProjectFromSkill(project.id)}
                      className="flex cursor-pointer items-center gap-1 rounded-full border border-[#7ea5b9]/70 bg-[#12212b]/50 px-3 py-1 text-xs text-[#e2eff8] transition hover:border-[#a9d5ec] hover:bg-[#162a35]/80 hover:text-white"
                    >
                      {project.name}
                      <ArrowUpRight size={12} aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p>{t("noProjects")}</p>
          ))}
      </div>
    </div>
  );
}
