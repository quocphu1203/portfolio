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

const formatExperienceSummary = (...paragraphs: string[]) => paragraphs.join("\n\n");

const EXPERIENCE_SECTION_BY_LOCALE: Record<AppLocale, InfoSection> = {
  en: {
    title: "Experience",
    body:
      "My experience focuses on turning requirements into working products while keeping communication, planning, and delivery aligned. I often work between the business side and the development side, so I care not only about implementation, but also about making sure the team understands what needs to be built and why.",
  },
  ja: {
    title: "経験",
    body:
      "私の経験は、要件を実際に動くプロダクトへ落とし込み、コミュニケーション、計画、開発、進捗管理をつなげることに重点を置いています。ビジネス側と開発側の間に立つことが多いため、実装だけでなく、チーム全体が「何を、なぜ作るのか」を理解できる状態づくりを大切にしています。",
  },
  vi: {
    title: "Kinh nghiệm",
    body:
      "Kinh nghiệm của mình tập trung vào việc biến yêu cầu thành sản phẩm có thể chạy thực tế, đồng thời giữ cho giao tiếp, kế hoạch và tiến độ phát triển đi đúng hướng. Mình thường làm việc ở giữa phía công ty và nhóm phát triển, nên không chỉ quan tâm đến code mà còn chú trọng việc cả team hiểu đúng cần xây gì, vì sao cần xây và ưu tiên phần nào trước.",
  },
};

const EXPERIENCE_MILESTONES_BY_LOCALE: Record<AppLocale, ExperienceMilestone[]> = {
  en: [
    {
      id: "intern",
      period: "2024-Present",
      title: "Project Leader",
      company: "GLD-LAB",
      summary: formatExperienceSummary(
        "I work as a project leader, connecting the company side with the development team. My role starts from receiving requirements, clarifying unclear points, breaking work into manageable tasks, and making sure each member understands the expected outcome before implementation begins.",
        "Alongside coordination, I also contribute directly to development. I have worked on web and mobile features using Next.js, React Native, Node.js, and PostgreSQL, while reviewing progress, checking blockers, and adjusting priorities when the project changes.",
        "This role helped me grow in both technical execution and team operation: requirement reading, task planning, communication, progress tracking, code contribution, and keeping the product direction consistent across the team."
      ),
      skills: ["Project planning", "Requirement analysis", "Next.js", "React Native", "Node.js", "PostgreSQL"],
    },
  ],
  ja: [
    {
      id: "intern",
      period: "2024-現在",
      title: "Project Leader",
      company: "GLD-LAB",
      summary: formatExperienceSummary(
        "プロジェクトリーダーとして、企業側と開発チームの橋渡しを担当しています。要件を受け取り、不明点を確認し、作業をタスクに分解し、実装前に各メンバーが成果物のイメージを共有できるようにしています。",
        "進行管理だけでなく、開発にも直接参加しています。Next.js、React Native、Node.js、PostgreSQLを使ったWeb・モバイル機能の実装に関わりながら、進捗確認、課題の把握、優先順位の調整も行っています。",
        "この経験を通じて、要件理解、タスク設計、チーム内コミュニケーション、進捗管理、コード実装、プロダクト全体の方向性を保つ力を伸ばしました。"
      ),
      skills: ["Project planning", "Requirement analysis", "Next.js", "React Native", "Node.js", "PostgreSQL"],
    },
  ],
  vi: [
    {
      id: "intern",
      period: "2024-Nay",
      title: "Project Leader",
      company: "GLD-LAB",
      summary: formatExperienceSummary(
        "Mình đảm nhận vai trò Project Leader, làm cầu nối giữa phía công ty và nhóm phát triển. Công việc bắt đầu từ việc tiếp nhận yêu cầu, làm rõ những điểm chưa rõ, chia nhỏ đầu việc và truyền đạt lại cho từng thành viên để mọi người hiểu đúng mục tiêu trước khi bắt tay vào code.",
        "Bên cạnh việc điều phối, mình cũng tham gia trực tiếp vào phát triển sản phẩm. Mình đã làm các phần web và mobile với Next.js, React Native, Node.js và PostgreSQL, đồng thời theo dõi tiến độ, kiểm tra blocker, điều chỉnh ưu tiên khi yêu cầu hoặc tình hình dự án thay đổi.",
        "Vai trò này giúp mình phát triển cả kỹ năng kỹ thuật lẫn cách vận hành team: đọc hiểu yêu cầu, lập kế hoạch task, giao tiếp với stakeholder, theo dõi tiến độ, tham gia code và giữ cho hướng phát triển sản phẩm nhất quán với mục tiêu ban đầu."
      ),
      skills: ["Project planning", "Requirement analysis", "Next.js", "React Native", "Node.js", "PostgreSQL"],
    },
  ],
};

export function getExperienceSection(locale: AppLocale): InfoSection {
  return EXPERIENCE_SECTION_BY_LOCALE[locale];
}

export function getExperienceMilestones(locale: AppLocale): ExperienceMilestone[] {
  return EXPERIENCE_MILESTONES_BY_LOCALE[locale];
}
