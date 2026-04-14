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
