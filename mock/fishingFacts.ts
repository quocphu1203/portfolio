import type { AppLocale } from "./locale";

/**
 * Fun-fact cards for the fishing mini-game, written in my own voice ("I ...").
 *   personal: true -> my own fun facts; shown first (interleaved, so one appears within the first 2 catches)
 *   special: true  -> what the rare golden fish reveals (they also show up in the normal rotation)
 * Profile facts restate the portfolio data (source noted). Edit freely; every entry needs all three locales.
 */
export type FishingFact = { text: string; personal: boolean; special: boolean };

type FactEntry = { personal?: boolean; special?: boolean; text: Record<AppLocale, string> };

const FISHING_FACTS: FactEntry[] = [
  // ---- personal ---------------------------------------------------------------------------------
  {
    personal: true,
    text: {
      en: "I'm usually pretty quiet, but once we're close (or you start a chat with me), I can talk a lot!",
      ja: "普段はけっこう無口ですが、仲良くなったり話しかけてもらえたりすると、たくさんしゃべります！",
      vi: "Bình thường mình khá ít nói, nhưng khi đã thân hoặc được bắt chuyện thì mình nói nhiều lắm đó!",
    },
  },
  {
    personal: true,
    text: {
      en: "When I work in a team, I take it very seriously.",
      ja: "チームで仕事をするときは、とても真剣に取り組みます。",
      vi: "Khi làm việc nhóm, mình rất nghiêm túc.",
    },
  },
  {
    personal: true,
    text: {
      en: "In person I'm a bit shy, but in games and online chats I'm full of energy.",
      ja: "実際に会うと少し人見知りですが、ゲームやオンラインでのおしゃべりでは元気いっぱいです。",
      vi: "Gặp ngoài đời thì mình khá ngại ngùng, nhưng khi chơi game hay trò chuyện online thì cực kỳ năng nổ.",
    },
  },
  {
    personal: true,
    special: true,
    text: {
      en: "I'd love to make lots of Japanese friends, so I often play on Japanese game servers. Say hi if you see me!",
      ja: "日本の友達をたくさん作りたくて、よく日本のゲームサーバーで遊んでいます。見かけたら気軽に声をかけてくださいね！",
      vi: "Mình muốn kết bạn với thật nhiều người Nhật, nên hay chơi trên server game Nhật Bản. Gặp thì chào mình nhé!",
    },
  },
  {
    personal: true,
    text: {
      en: "I love learning new things and tinkering with anything I can get my hands on.",
      ja: "新しいことを学ぶのが好きで、いろいろいじって試してみるのが大好きです。",
      vi: "Mình thích học cái mới và rất mê vọc vạch đủ thứ.",
    },
  },
  {
    personal: true,
    text: {
      en: "I love playing FPS games.",
      ja: "FPSゲームが大好きです。",
      vi: "Mình rất thích chơi game FPS.",
    },
  },
  {
    personal: true,
    special: true,
    text: {
      en: "I'm a huge Pokémon fan! Reeling in a rare golden fish feels like finding a shiny. ✨",
      ja: "ポケモンの大ファンです！金色の魚が釣れると、色違いに出会えたような気分になります。✨",
      vi: "Mình là fan cuồng Pokémon! Câu được cá vàng hiếm thế này cứ như gặp được Pokémon shiny vậy. ✨",
    },
  },
  // ---- profile (from the portfolio data) ---------------------------------------------------------
  {
    // aboutData: name / nickname
    text: {
      en: "My full name is Pham Quoc Phu, but many people call me Wako.",
      ja: "フルネームはファム・クオック・フーですが、「Wako」とも呼ばれています。",
      vi: "Tên đầy đủ của mình là Phạm Quốc Phú, mọi người còn hay gọi là Wako.",
    },
  },
  {
    // aboutData: path into IT
    text: {
      en: "My path into IT started with games and curiosity about how computers work.",
      ja: "ITに興味を持ったきっかけは、ゲームとコンピューターへの好奇心でした。",
      vi: "Hành trình đến với IT của mình bắt đầu từ game và sự tò mò về cách máy tính hoạt động.",
    },
  },
  {
    // aboutData: photography
    text: {
      en: "Outside engineering, I love landscape photography: it trains patience, composition and attention to light.",
      ja: "技術以外では風景写真が好きです。構図や光、タイミングを意識する感覚が身につきます。",
      vi: "Ngoài kỹ thuật, mình thích nhiếp ảnh phong cảnh: rèn sự kiên nhẫn, bố cục và cách quan sát ánh sáng.",
    },
  },
  {
    // skillsData: languages
    text: {
      en: "I hold JLPT N2 and can work in Japanese-speaking environments.",
      ja: "JLPT N2を持っていて、日本語環境での業務連携ができます。",
      vi: "Mình có JLPT N2 và có thể làm việc trong môi trường sử dụng tiếng Nhật.",
    },
  },
  {
    // experienceData: gld-lab-japan
    text: {
      en: "I now work at GLD-LAB in Tottori, Japan, as a bridge between the Vietnam and Japan teams.",
      ja: "現在は鳥取のGLD-LABで、ベトナムと日本のチームをつなぐ役割を担っています。",
      vi: "Hiện mình làm việc tại GLD-LAB ở Tottori, Nhật Bản, làm cầu nối giữa đội ngũ Việt Nam và Nhật Bản.",
    },
  },
  {
    // experienceData: intern-gld-lab
    text: {
      en: "As an intern (10/2024 - 07/2026), I led the GLD-LAB intern team: planning, task splitting and code reviews.",
      ja: "インターン時代（2024年10月〜2026年7月）は、GLD-LABインターンチームのリーダーとして計画・タスク分担・コードレビューを担当しました。",
      vi: "Thời intern (10/2024 - 07/2026), mình là Team Leader nhóm intern GLD-LAB: lập kế hoạch, chia task và code review.",
    },
  },
  {
    // experienceData: full-time-vietnam
    text: {
      en: "At GLD-LAB Vietnam, I also mentored the next intern cohort.",
      ja: "GLD-LAB ベトナムでは、後輩のインターンメンバーのサポートもしました。",
      vi: "Tại GLD-LAB Việt Nam, mình còn hướng dẫn các bạn intern khóa sau.",
    },
  },
  {
    // skillsData: programming languages
    text: {
      en: "Languages I've worked with: C++, Java, PHP, Kotlin, JavaScript, TypeScript and Python.",
      ja: "これまで使ってきた言語：C++、Java、PHP、Kotlin、JavaScript、TypeScript、Python。",
      vi: "Những ngôn ngữ mình đã dùng: C++, Java, PHP, Kotlin, JavaScript, TypeScript và Python.",
    },
  },
  {
    // skillsData: frameworks
    text: {
      en: "Frameworks in my toolbox: Laravel, ReactJS, React Native and Next.js.",
      ja: "使えるフレームワーク：Laravel、ReactJS、React Native、Next.js。",
      vi: "Framework của mình: Laravel, ReactJS, React Native và Next.js.",
    },
  },
  {
    // skillsData: databases
    text: {
      en: "Databases I've used: Microsoft SQL Server, MySQL, Firebase and PostgreSQL.",
      ja: "使ってきたデータベース：Microsoft SQL Server、MySQL、Firebase、PostgreSQL。",
      vi: "Cơ sở dữ liệu mình đã dùng: Microsoft SQL Server, MySQL, Firebase và PostgreSQL.",
    },
  },
  {
    // skillsData: interests
    text: {
      en: "I listen to music to balance my energy and stay focused at work.",
      ja: "音楽を聴いて、集中力とエネルギーを整えています。",
      vi: "Mình nghe nhạc để cân bằng năng lượng và giữ tập trung khi làm việc.",
    },
  },
  {
    // projectsData: project names
    text: {
      en: "My projects include EarthCare App, Garden Advisor and an AI-powered anime product review platform.",
      ja: "これまでのプロジェクトには、EarthCareアプリ、Garden Advisor、AI統合アニメ商品レビュー基盤などがあります。",
      vi: "Các dự án của mình gồm Ứng dụng EarthCare, Garden Advisor và nền tảng đánh giá sản phẩm Anime tích hợp AI.",
    },
  },
  {
    // aboutData: Japan motivation
    text: {
      en: "I study Japanese language and culture as a bridge toward a disciplined, thoughtful way of working.",
      ja: "日本語と日本文化の学習は、規律あるプロフェッショナルな働き方への橋だと考えています。",
      vi: "Mình học tiếng Nhật và văn hóa Nhật như một cây cầu tới môi trường làm việc chuyên nghiệp, kỷ luật.",
    },
  },
];

/** Same order in every locale (the game keeps indices across a language switch). */
export function getFishingFacts(locale: AppLocale): FishingFact[] {
  return FISHING_FACTS.map((fact) => ({
    text: fact.text[locale],
    personal: Boolean(fact.personal),
    special: Boolean(fact.special),
  }));
}
