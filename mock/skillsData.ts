import type { InfoSection } from "./aboutData";
import type { AppLocale } from "./locale";

const SKILLS_SECTION_BY_LOCALE: Record<AppLocale, InfoSection> = {
  en: {
    title: "Skills",
    body: `● Applied experience, knowledge, and skills:
- Languages: JLPT N2 (able to work and communicate in Japanese-speaking environments).
- Office tools: Word, Excel, PowerPoint.
- Programming languages: C++, Java, PHP, Kotlin, JavaScript, TypeScript, Python.
- Frameworks/Platforms: Laravel, ReactJS, React Native, Next.js.
- Databases: Microsoft SQL Server, MySQL, Firebase, PostgreSQL.

● Interests and growth direction:
- Proactively learning and experimenting with new technologies.
- Maintaining continuous learning habits to expand expertise.
- Listening to music to balance energy and stay focused at work.

● Key strengths:
- Strong logical thinking with systematic problem solving.
- Fast learning and practical application.
- Persistent, hardworking, and highly responsible.
- Effective teamwork and willingness to support shared goals.`,
    links: [{ label: "Blog", href: "#" }],
  },
  ja: {
    title: "スキル",
    body: `● 実務で活用している経験・知識・スキル:
- 語学: JLPT N2（日本語環境での業務連携が可能）。
- オフィスツール: Word, Excel, PowerPoint。
- プログラミング言語: C++, Java, PHP, Kotlin, JavaScript, TypeScript, Python。
- フレームワーク/プラットフォーム: Laravel, ReactJS, React Native, Next.js。
- データベース: Microsoft SQL Server, MySQL, Firebase, PostgreSQL。

● 興味・成長方針:
- 新しい技術を積極的に学び、試す。
- 継続的な学習習慣で専門性を高める。
- 音楽で集中力とエネルギーを整える。

● 強み:
- 論理的で体系的な問題解決力。
- 吸収が早く、実践への適用が得意。
- 粘り強く、責任感が高い。
- チーム連携を重視し、目標達成に貢献できる。`,
    links: [{ label: "Blog", href: "#" }],
  },
  vi: {
    title: "Kỹ năng",
    body: `● Kinh nghiệm, kiến thức và kỹ năng áp dụng:
- Ngoại ngữ: JLPT N2 (có thể làm việc và trao đổi trong môi trường sử dụng tiếng Nhật).
- Công cụ văn phòng: Word, Excel, PowerPoint.
- Ngôn ngữ lập trình: C++, Java, PHP, Kotlin, JavaScript, TypeScript, Python.
- Frameworks/Platforms: Laravel, ReactJS, React Native, Next.js.
- Cơ sở dữ liệu: Microsoft SQL Server, MySQL, Firebase, PostgreSQL.

● Sở thích và định hướng phát triển:
- Chủ động cập nhật và thử nghiệm công nghệ mới.
- Duy trì thói quen học tập liên tục để mở rộng kiến thức chuyên môn.
- Nghe nhạc để cân bằng năng lượng và duy trì sự tập trung trong công việc.

● Điểm mạnh nổi bật:
- Tư duy logic tốt, tiếp cận vấn đề có hệ thống.
- Khả năng tiếp thu thông tin nhanh và áp dụng vào thực tế.
- Kiên trì, siêng năng, có tinh thần trách nhiệm cao.
- Phối hợp đội nhóm hiệu quả, sẵn sàng hỗ trợ và cùng hoàn thành mục tiêu.`,
    links: [{ label: "Blog", href: "#" }],
  },
};

export function getSkillsSection(locale: AppLocale): InfoSection {
  return SKILLS_SECTION_BY_LOCALE[locale];
}

/* ------------------------------------------------------------------------------------------------
 * Structured skills (one cargo crate on the boat per group) and the skill -> project link.
 * Skill names are the ones listed in the Skills text above; group titles live in messages (skillCrates.*).
 * ---------------------------------------------------------------------------------------------- */

export type SkillGroupId = "code" | "frameworks" | "data" | "tools";

export type SkillItem = {
  id: string;
  label: string;
  /**
   * Matched (case-insensitive) against each project's `techStack` entries in projectsData.ts.
   * A trailing "*" means prefix match (e.g. "firebase*" matches "Firebase Auth").
   */
  usedIn: string[];
};

export type SkillGroup = {
  id: SkillGroupId;
  /** Crate accent colour (lid band, gem, dialog section). */
  color: string;
  icon: string;
  items: SkillItem[];
};

export const SKILL_GROUPS: SkillGroup[] = [
  {
    id: "code",
    color: "#e0a458",
    icon: "</>",
    items: [
      { id: "cpp", label: "C++", usedIn: [] },
      { id: "java", label: "Java", usedIn: ["java"] },
      { id: "php", label: "PHP", usedIn: ["php", "laravel"] },
      { id: "kotlin", label: "Kotlin", usedIn: ["kotlin"] },
      // JavaScript is not listed explicitly; assumed for React / React Native / Next.js / Vite projects.
      { id: "javascript", label: "JavaScript", usedIn: ["javascript", "react", "react native", "next.js", "vite"] },
      { id: "typescript", label: "TypeScript", usedIn: ["typescript"] },
      // Assumed: the TensorFlow / TFLite sentiment model was trained in Python.
      { id: "python", label: "Python", usedIn: ["python", "tensorflow", "tflite"] },
    ],
  },
  {
    id: "frameworks",
    color: "#6fc3df",
    icon: "{ }",
    items: [
      { id: "laravel", label: "Laravel", usedIn: ["laravel"] },
      { id: "reactjs", label: "ReactJS", usedIn: ["react", "next.js"] },
      { id: "react-native", label: "React Native", usedIn: ["react native"] },
      { id: "nextjs", label: "Next.js", usedIn: ["next.js"] },
    ],
  },
  {
    id: "data",
    color: "#8fd18b",
    icon: "DB",
    items: [
      { id: "sqlserver", label: "SQL Server", usedIn: ["sql server", "microsoft sql server"] },
      { id: "mysql", label: "MySQL", usedIn: ["mysql"] },
      { id: "firebase", label: "Firebase", usedIn: ["firebase*", "firestore"] },
      { id: "postgresql", label: "PostgreSQL", usedIn: ["postgresql"] },
    ],
  },
  {
    id: "tools",
    color: "#d58ad6",
    icon: "✦",
    items: [
      { id: "jlpt", label: "JLPT N2", usedIn: [] },
      { id: "word", label: "Word", usedIn: [] },
      { id: "excel", label: "Excel", usedIn: [] },
      { id: "powerpoint", label: "PowerPoint", usedIn: [] },
    ],
  },
];

function techMatches(rules: string[], tech: string) {
  const value = tech.trim().toLowerCase();
  return rules.some((rule) => (rule.endsWith("*") ? value.startsWith(rule.slice(0, -1)) : value === rule));
}

/** Project ids (shared across locales) whose tech stack uses the given skill. */
export function projectIdsForSkill(
  skillId: string,
  projects: { id: string; techStack?: string[] }[]
): string[] {
  const skill = SKILL_GROUPS.flatMap((g) => g.items).find((s) => s.id === skillId);
  if (!skill || skill.usedIn.length === 0) return [];
  return projects.filter((p) => (p.techStack ?? []).some((tech) => techMatches(skill.usedIn, tech))).map((p) => p.id);
}

/** The Skills text without its first block (the skill list, which the crates / chips now show). */
export function getSkillsExtraText(locale: AppLocale) {
  const blocks = SKILLS_SECTION_BY_LOCALE[locale].body.split(/\n\s*\n/);
  return blocks.slice(1).join("\n\n").trim();
}
