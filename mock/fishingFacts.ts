import type { AppLocale } from "./locale";

/**
 * Fun-fact cards for the fishing mini-game. Every line restates something already in the portfolio data
 * (source noted per entry) - edit freely, keep the three locales in the same order.
 */
const FISHING_FACTS_BY_LOCALE: Record<AppLocale, string[]> = {
  en: [
    // aboutData: name / nickname
    "Pham Quoc Phu is also known as Wako.",
    // aboutData: path into IT
    "Phu's path into IT started with games and curiosity about how computers work.",
    // aboutData: photography
    "Outside engineering, Phu loves landscape photography: it trains patience, composition and attention to light.",
    // skillsData: languages
    "Phu holds JLPT N2 and works in Japanese-speaking environments.",
    // experienceData: gld-lab-japan
    "Phu now works at GLD-LAB in Tottori, Japan, as a bridge between the Vietnam and Japan teams.",
    // experienceData: intern-gld-lab
    "As an intern (10/2024 - 07/2026), Phu led the GLD-LAB intern team: planning, task splitting and code reviews.",
    // experienceData: full-time-vietnam
    "At GLD-LAB Vietnam, Phu also mentored the next intern cohort.",
    // skillsData: programming languages
    "Languages Phu has worked with: C++, Java, PHP, Kotlin, JavaScript, TypeScript and Python.",
    // skillsData: frameworks
    "Frameworks in Phu's toolbox: Laravel, ReactJS, React Native and Next.js.",
    // skillsData: databases
    "Databases Phu has used: Microsoft SQL Server, MySQL, Firebase and PostgreSQL.",
    // skillsData: interests
    "Phu listens to music to balance energy and stay focused at work.",
    // projectsData: project names
    "Phu's projects include EarthCare App, Garden Advisor and an AI-powered anime product review platform.",
    // aboutData: Japan motivation
    "Phu studies Japanese language and culture as a bridge toward a disciplined, thoughtful way of working.",
  ],
  ja: [
    "ファム・クオック・フーは「Wako」とも呼ばれています。",
    "フーがITに興味を持ったきっかけは、ゲームとコンピューターへの好奇心でした。",
    "技術以外では風景写真が好き。構図、光、タイミングを意識する感覚が身につきます。",
    "フーはJLPT N2を持ち、日本語環境で業務連携ができます。",
    "現在は鳥取のGLD-LABで、ベトナムと日本のチームをつなぐ役割を担っています。",
    "インターン時代（2024年10月〜2026年7月）は、GLD-LABインターンチームのリーダーとして計画・タスク分担・コードレビューを担当。",
    "GLD-LAB ベトナムでは、後輩のインターンメンバーの支援も行いました。",
    "使ってきた言語：C++、Java、PHP、Kotlin、JavaScript、TypeScript、Python。",
    "フレームワーク：Laravel、ReactJS、React Native、Next.js。",
    "データベース：Microsoft SQL Server、MySQL、Firebase、PostgreSQL。",
    "音楽で集中力とエネルギーを整えています。",
    "プロジェクトには EarthCareアプリ、Garden Advisor、AI統合アニメ商品レビュー基盤などがあります。",
    "日本語と日本文化の学習は、規律あるプロフェッショナルな働き方への橋だと考えています。",
  ],
  vi: [
    "Phạm Quốc Phú còn được mọi người gọi là Wako.",
    "Hành trình đến với IT của Phú bắt đầu từ game và sự tò mò về cách máy tính hoạt động.",
    "Ngoài kỹ thuật, Phú thích nhiếp ảnh phong cảnh: rèn sự kiên nhẫn, bố cục và cách quan sát ánh sáng.",
    "Phú có JLPT N2 và có thể làm việc trong môi trường sử dụng tiếng Nhật.",
    "Hiện Phú làm việc tại GLD-LAB ở Tottori, Nhật Bản, làm cầu nối giữa đội ngũ Việt Nam và Nhật Bản.",
    "Thời intern (10/2024 - 07/2026), Phú là Team Leader nhóm intern GLD-LAB: lập kế hoạch, chia task và code review.",
    "Tại GLD-LAB Việt Nam, Phú còn hướng dẫn các thành viên intern khóa sau.",
    "Ngôn ngữ Phú đã dùng: C++, Java, PHP, Kotlin, JavaScript, TypeScript và Python.",
    "Framework của Phú: Laravel, ReactJS, React Native và Next.js.",
    "Cơ sở dữ liệu Phú đã dùng: Microsoft SQL Server, MySQL, Firebase và PostgreSQL.",
    "Phú nghe nhạc để cân bằng năng lượng và giữ tập trung khi làm việc.",
    "Các dự án của Phú gồm Ứng dụng EarthCare, Garden Advisor và nền tảng đánh giá sản phẩm Anime tích hợp AI.",
    "Phú học tiếng Nhật và văn hóa Nhật như một cây cầu tới môi trường làm việc chuyên nghiệp, kỷ luật.",
  ],
};

export function getFishingFacts(locale: AppLocale): string[] {
  return FISHING_FACTS_BY_LOCALE[locale];
}
