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
      id: "intern-gld-lab",
      period: "10/2024 - 07/2026",
      title: "Intern",
      company: "GLD-LAB",
      summary: formatExperienceSummary(
        "As the team leader of the intern group, I helped turn requirements into an actionable development plan, coordinated day-to-day work, and divided tasks according to each member's strengths.",
        "Alongside leadership responsibilities, I contributed directly to web and mobile development. I facilitated code reviews, exchanged implementation feedback, and supported the team in improving both code quality and problem-solving skills."
      ),
      skills: ["Requirements analysis", "Task planning", "Team leadership", "Code review", "Mentoring", "Next.js", "React Native", "Node.js", "PostgreSQL"],
    },
    {
      id: "full-time-vietnam",
      period: "07/2026 - 08/2026",
      title: "Full-time Employee",
      company: "GLD-LAB Vietnam",
      summary: formatExperienceSummary(
        "I worked directly with the Japan-based team throughout the development lifecycle, using Japanese to clarify requirements, discuss implementation details, and maintain smooth day-to-day collaboration.",
        "In parallel, I supported the next intern cohort by sharing technical context, explaining the team's workflow, and helping new members build confidence in their development responsibilities."
      ),
      skills: ["Requirements analysis", "Japanese communication", "Cross-cultural collaboration", "Technical mentoring", "Agile teamwork", "Next.js", "React Native", "Node.js", "PostgreSQL"],
    },
    {
      id: "gld-lab-japan",
      period: "08/2026 - Present",
      title: "Employee",
      company: "GLD-LAB, Tottori, Japan",
      summary: formatExperienceSummary(
        "Working directly in Tottori, Japan, I act as a bridge between the Vietnam and Japan teams, helping both sides maintain a shared understanding of product goals, requirements, and delivery priorities.",
        "I also provide technical support to the Japan-based team by clarifying development issues, coordinating with engineers in Vietnam, and helping turn business expectations into practical implementation steps."
      ),
      skills: ["Requirements analysis", "Technical coordination", "Bridge SE communication", "Cross-cultural collaboration", "Technical support", "Japanese communication", "Next.js", "React Native", "Node.js", "PostgreSQL"],
    },
  ],
  ja: [
    {
      id: "intern-gld-lab",
      period: "2024年10月 - 2026年7月",
      title: "インターン",
      company: "GLD-LAB",
      summary: formatExperienceSummary(
        "インターンチームのリーダーとして、要件を具体的な開発計画へ落とし込み、日々の進行を調整し、メンバーの強みに合わせてタスクを分担しました。",
        "リーダー業務と並行してWeb・モバイル開発にも直接参加し、コードレビューや実装に関する意見交換を通じて、コード品質と問題解決力の向上を支援しました。"
      ),
      skills: ["要件分析", "タスク設計", "チームリーダーシップ", "コードレビュー", "メンタリング", "Next.js", "React Native", "Node.js", "PostgreSQL"],
    },
    {
      id: "full-time-vietnam",
      period: "2026年7月 - 2026年8月",
      title: "正社員",
      company: "GLD-LAB ベトナム",
      summary: formatExperienceSummary(
        "日本側のチームと開発ライフサイクル全体に直接参加し、日本語で要件を確認し、実装方針を話し合い、日々の連携を進めました。",
        "同時に、後輩のインターンメンバーへ技術的な背景やチームの進め方を共有し、開発業務へスムーズに適応できるよう支援しました。"
      ),
      skills: ["要件分析", "日本語コミュニケーション", "異文化協働", "技術メンタリング", "アジャイル開発", "Next.js", "React Native", "Node.js", "PostgreSQL"],
    },
    {
      id: "gld-lab-japan",
      period: "2026年8月 - 現在",
      title: "社員",
      company: "GLD-LAB 鳥取・日本",
      summary: formatExperienceSummary(
        "鳥取で日本側のチームと直接働きながら、ベトナムと日本のチームをつなぎ、プロダクトの目的、要件、優先順位について共通認識をつくる役割を担っています。",
        "開発上の課題を整理し、ベトナム側のエンジニアと連携しながら、日本側の期待を実装可能な開発ステップへ落とし込む技術サポートも行っています。"
      ),
      skills: ["要件分析", "技術調整", "ブリッジSE業務", "異文化協働", "技術サポート", "日本語コミュニケーション", "Next.js", "React Native", "Node.js", "PostgreSQL"],
    },
  ],
  vi: [
    {
      id: "intern-gld-lab",
      period: "10/2024 - 07/2026",
      title: "Intern",
      company: "GLD-LAB",
      summary: formatExperienceSummary(
        "Mình giữ vai trò Team Leader của nhóm intern, phụ trách chuyển yêu cầu thành kế hoạch phát triển rõ ràng, điều phối công việc hằng ngày và phân chia nhiệm vụ dựa trên thế mạnh của từng thành viên.",
        "Bên cạnh vai trò dẫn dắt, mình vẫn trực tiếp tham gia phát triển web và mobile. Mình tổ chức code review, trao đổi về hướng triển khai và hỗ trợ cả nhóm nâng cao chất lượng mã nguồn cũng như khả năng giải quyết vấn đề."
      ),
      skills: ["Phân tích tài liệu yêu cầu", "Lập kế hoạch task", "Team Leadership", "Code Review", "Mentoring", "Next.js", "React Native", "Node.js", "PostgreSQL"],
    },
    {
      id: "full-time-vietnam",
      period: "07/2026 - 08/2026",
      title: "Nhân viên chính thức",
      company: "GLD-LAB tại Việt Nam",
      summary: formatExperienceSummary(
        "Mình trực tiếp tham gia phát triển cùng đội ngũ Nhật Bản trong toàn bộ vòng đời dự án, sử dụng tiếng Nhật để xác nhận yêu cầu, trao đổi chi tiết triển khai và duy trì phối hợp hằng ngày.",
        "Song song đó, mình hướng dẫn các thành viên khóa sau bằng cách chia sẻ bối cảnh kỹ thuật, giải thích quy trình làm việc và hỗ trợ các bạn tự tin hơn khi đảm nhận nhiệm vụ phát triển."
      ),
      skills: ["Phân tích tài liệu yêu cầu", "Giao tiếp tiếng Nhật", "Làm việc đa văn hóa", "Technical Mentoring", "Agile Teamwork", "Next.js", "React Native", "Node.js", "PostgreSQL"],
    },
    {
      id: "gld-lab-japan",
      period: "08/2026 - Nay",
      title: "Nhân viên",
      company: "GLD-LAB tại Tottori, Nhật Bản",
      summary: formatExperienceSummary(
        "Mình làm việc trực tiếp tại Tottori, Nhật Bản và đảm nhận vai trò cầu nối giữa đội ngũ Việt Nam và Nhật Bản, giúp hai bên thống nhất về mục tiêu sản phẩm, yêu cầu và thứ tự ưu tiên.",
        "Mình hỗ trợ kỹ thuật cho phía Nhật Bản bằng cách làm rõ vấn đề phát triển, phối hợp với kỹ sư tại Việt Nam và chuyển hóa kỳ vọng nghiệp vụ thành các bước triển khai thực tế."
      ),
      skills: ["Phân tích tài liệu yêu cầu", "Điều phối kỹ thuật", "Bridge SE", "Làm việc đa văn hóa", "Technical Support", "Giao tiếp tiếng Nhật", "Next.js", "React Native", "Node.js", "PostgreSQL"],
    },
  ],
};

export function getExperienceSection(locale: AppLocale): InfoSection {
  return EXPERIENCE_SECTION_BY_LOCALE[locale];
}

export function getExperienceMilestones(locale: AppLocale): ExperienceMilestone[] {
  return EXPERIENCE_MILESTONES_BY_LOCALE[locale];
}
