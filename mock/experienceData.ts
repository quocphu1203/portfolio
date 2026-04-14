import type { InfoSection } from "./aboutData";
import type { AppLocale } from "./locale";

export type ExperienceMilestone = {
  id: string;
  period: string;
  title: string;
  company: string;
  summary: string;
  skills: string[];
};

const EXPERIENCE_SECTION_BY_LOCALE: Record<AppLocale, InfoSection> = {
  en: {
    title: "Experience",
    body: "Each milestone is a step on the climb to the island peak, reflecting my learning path and real project experience.",
  },
  ja: {
    title: "経験",
    body: "各マイルストーンは島の頂上へ向かう一歩であり、学習と実案件の積み重ねを表しています。",
  },
  vi: {
    title: "Kinh nghiệm",
    body: "Mỗi cột mốc là một chặng trên hành trình đi lên đỉnh đảo, thể hiện quá trình học và làm dự án thực tế.",
  },
};

const EXPERIENCE_MILESTONES_BY_LOCALE: Record<AppLocale, ExperienceMilestone[]> = {
  en: [
    {
      id: "intern",
      period: "2024-Present",
      title: "Project Leader",
      company: "GLD-LAB",
      summary: "Communicate with the company side, receive requirements, align team members, contribute to development, and track project progress.",
      skills: ["Next.js", "React Native", "Node.js", "PostgreSQL"],
    },
  ],
  ja: [
    {
      id: "intern",
      period: "2024-現在",
      title: "Project Leader",
      company: "GLD-LAB",
      summary: "企業側との連携、要件受領、チームへの共有、開発参加、進捗管理を担当しています。",
      skills: ["Next.js", "React Native", "Node.js", "PostgreSQL"],
    },
  ],
  vi: [
    {
      id: "intern",
      period: "2024-Nay",
      title: "Project Leader",
      company: "GLD-LAB",
      summary: "Giao tiếp với bên phía công ty, nhận thông tin, truyền đạt cho thành viên, tham gia phát triển dự án và kiểm tra tiến độ.",
      skills: ["Next.js", "React Native", "Node.js", "PostgreSQL"],
    },
  ],
};

export function getExperienceSection(locale: AppLocale): InfoSection {
  return EXPERIENCE_SECTION_BY_LOCALE[locale];
}

export function getExperienceMilestones(locale: AppLocale): ExperienceMilestone[] {
  return EXPERIENCE_MILESTONES_BY_LOCALE[locale];
}
