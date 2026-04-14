import { getAboutSection, type InfoSection } from "../../../mock/aboutData";
import { getExperienceSection } from "../../../mock/experienceData";
import { getProjectBirdItems, getProjectsSection, type ProjectBirdItem } from "../../../mock/projectsData";
import type { AppLocale } from "../../../mock/locale";
import { getSkillsSection } from "../../../mock/skillsData";

export const NAV_IDS = ["projects", "articles", "about", "credits"] as const;
export type NavId = (typeof NAV_IDS)[number];

/** Gốc chân cột (world). */
export const SIGNPOST_ANCHOR: [number, number, number] = [3, 10, -10];
export const SIGNPOST_SCALE = 2;

export type CameraPreset = {
  position: [number, number, number];
  target: [number, number, number];
};

export function getCameraPresets(orbitY: number): Record<NavId | "menu" | "default", CameraPreset> {
  const mid = orbitY * 0.72;
  const hi = orbitY * 1.08;
  /** Cùng công thức `orbitAimY` trong FantasyIslandFitted — góc menu / mặc định không bám signpost. */
  const defaultLookY = orbitY * 0.7;

  return {
    default: {
      position: [-11, orbitY * 0.92, -34],
      target: [0, defaultLookY, 0],
    },
    menu: {
      position: [-6.2, orbitY * 0.9, -15.2],
      target: [0, defaultLookY, 0],
    },
    projects: {
      position: [17, hi, 12],
      target: [5, mid, 1],
    },
    articles: {
      position: [6, orbitY * 1.28, -19],
      target: [0, mid * 1.05, 0],
    },
    about: {
      position: [-19, orbitY * 0.9, 8],
      target: [-5.5, mid, -3],
    },
    credits: {
      position: [-4.5, orbitY * 0.85, -21],
      target: [0, mid * 0.92, 0],
    },
  };
}

export function getNavCopy(locale: AppLocale): Record<NavId, InfoSection> {
  return {
    projects: getProjectsSection(locale),
    articles: getSkillsSection(locale),
    about: getAboutSection(locale),
    credits: getExperienceSection(locale),
  };
}

export { getProjectBirdItems };
export type { ProjectBirdItem };
