import { ABOUT_SECTION } from "../../../mock/aboutData";
import { EXPERIENCE_SECTION } from "../../../mock/experienceData";
import { PROJECTS_SECTION, PROJECT_BIRD_ITEMS, type ProjectBirdItem } from "../../../mock/projectsData";
import { SKILLS_SECTION } from "../../../mock/skillsData";

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

export const NAV_COPY: Record<
  NavId,
  { title: string; body: string; links?: { label: string; href: string }[] }
> = {
  projects: PROJECTS_SECTION,
  articles: SKILLS_SECTION,
  about: ABOUT_SECTION,
  credits: EXPERIENCE_SECTION,
};

export const SIGN_LABELS: Record<NavId, string> = {
  projects: "Project",
  articles: "Kỹ năng",
  about: "Giới thiệu",
  credits: "Kinh nghiệm",
};

export { PROJECT_BIRD_ITEMS };
export type { ProjectBirdItem };
