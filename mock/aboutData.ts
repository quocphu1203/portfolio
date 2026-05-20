import type { AppLocale } from "./locale";

export type InfoSection = {
  title: string;
  body: string;
  highlights?: {
    label: string;
    value: string;
  }[];
  facts?: string[];
  links?: { label: string; href: string }[];
};

const ABOUT_SECTION_BY_LOCALE: Record<AppLocale, InfoSection> = {
  en: {
    title: "Hi, I'm Phu! People also call me Wako.",
    body: `My full name is Pham Quoc Phu, though many people know me as Wako. I am a developer who enjoys building the systems behind digital products: the data flow, the application logic, and the small technical decisions that make an experience feel reliable.
At GLD-LAB, I work as a Project Leader in a Japanese company environment. My work sits between communication and implementation: receiving requirements, clarifying intent, sharing direction with the team, joining development, and keeping progress aligned with the product goal.
My path into IT started with games and curiosity about computers. Over time, I became more interested in what happens behind the screen: how code shapes behavior, how systems stay stable, and how a simple idea can become something people actually use.
Outside engineering, photography gives me a different kind of focus. I especially like landscapes because they train patience, composition, and attention to light. That balance between logic and visual feeling also affects how I think about product design.
Japan is another long-term motivation for me. I study the language and culture not only as a personal interest, but also as a bridge toward a disciplined, professional, and thoughtful working style.`,
    highlights: [
      { label: "Current role", value: "Project Leader at GLD-LAB" },
      { label: "Main direction", value: "Backend, full-stack, mobile, and product delivery" },
      { label: "Working style", value: "Clear communication, practical implementation, steady improvement" },
      { label: "Personal color", value: "Engineering logic mixed with photography and visual sensitivity" },
    ],
    facts: ["Vietnamese developer", "Japanese-learning mindset", "Game-inspired IT journey", "Landscape photography lover"],
    links: [
      { label: "Facebook", href: "https://www.facebook.com/wako.12.k" },
      { label: "GitHub", href: "https://github.com/quocphu1203" },
    ],
  },
  ja: {
    title: "こんにちは、フーです。Wakoとも呼ばれています。",
    body: `私のフルネームはファム・クオック・フーです。Wakoとも呼ばれています。デジタルプロダクトの裏側にあるデータの流れ、アプリケーションロジック、安定した体験を支える仕組みに強い関心があります。
現在は日本企業 GLD-LAB でProject Leaderとして働いています。要件を受け取り、意図を確認し、チームへ共有し、開発にも参加しながら、プロダクトの方向性と進捗を合わせる役割を担っています。
ITに興味を持ったきっかけはゲームとコンピューターへの好奇心でした。次第に、画面の裏側でコードがどのように動き、体験を形作り、システムが安定して動くのかに惹かれるようになりました。
技術以外では、風景写真が好きです。構図、光、タイミングを意識する写真の感覚は、UIやプロダクトを見るときの感性にもつながっていると感じています。
日本語と日本文化も長期的なモチベーションの一つです。単なる言語学習ではなく、規律あるプロフェッショナルな働き方へ近づくための橋だと考えています。`,
    highlights: [
      { label: "現在の役割", value: "GLD-LAB Project Leader" },
      { label: "主な方向性", value: "バックエンド、フルスタック、モバイル、プロダクト開発" },
      { label: "仕事の姿勢", value: "明確な共有、実用的な実装、継続的な改善" },
      { label: "自分らしさ", value: "エンジニアの論理と写真の感性のバランス" },
    ],
    facts: ["ベトナム出身の開発者", "日本語学習中", "ゲームから始まったITへの興味", "風景写真が好き"],
    links: [
      { label: "Facebook", href: "https://www.facebook.com/wako.12.k" },
      { label: "GitHub", href: "https://github.com/quocphu1203" },
    ],
  },
  vi: {
    title: "Xin chào, Phú đây! Mọi người còn gọi tôi là Wako.",
    body: `Tên đầy đủ của tôi là Phạm Quốc Phú, mọi người cũng hay gọi tôi là Wako. Tôi là một developer thích xây dựng những phần nằm phía sau sản phẩm số: luồng dữ liệu, logic ứng dụng, API, database và những chi tiết kỹ thuật giúp trải nghiệm vận hành ổn định.
Hiện tại, tôi đang đảm nhận vai trò Project Leader tại GLD-LAB, một công ty Nhật Bản. Công việc của tôi nằm giữa giao tiếp và triển khai: tiếp nhận yêu cầu, làm rõ ý tưởng, truyền đạt cho team, tham gia phát triển và giữ tiến độ đi đúng với mục tiêu sản phẩm.
Hành trình đến với IT của tôi bắt đầu từ game và sự tò mò về cách máy tính hoạt động. Từ việc thích chơi, tôi dần muốn hiểu điều gì xảy ra phía sau màn hình: vì sao một dòng code có thể thay đổi trải nghiệm, vì sao hệ thống có thể vận hành âm thầm nhưng mạnh mẽ.
Ngoài kỹ thuật, tôi cũng thích cái đẹp thị giác. Nhiếp ảnh phong cảnh giúp tôi rèn sự kiên nhẫn, bố cục và cách quan sát ánh sáng. Điều đó cũng ảnh hưởng tới cách tôi nhìn UI, sản phẩm và trải nghiệm người dùng.
Nhật Bản cũng là một động lực dài hạn của tôi. Tôi học tiếng Nhật không chỉ như một kỹ năng, mà như một cây cầu để tiến gần hơn tới môi trường làm việc chuyên nghiệp, kỷ luật và có chiều sâu.`,
    highlights: [
      { label: "Vai trò hiện tại", value: "Project Leader tại GLD-LAB" },
      { label: "Hướng phát triển", value: "Backend, full-stack, mobile và triển khai sản phẩm" },
      { label: "Phong cách làm việc", value: "Giao tiếp rõ ràng, triển khai thực tế, cải thiện đều đặn" },
      { label: "Màu sắc cá nhân", value: "Logic kỹ thuật kết hợp với cảm quan nhiếp ảnh và thẩm mỹ" },
    ],
    facts: ["Developer Việt Nam", "Đang học và dùng tiếng Nhật", "Bắt đầu yêu IT từ game", "Thích nhiếp ảnh phong cảnh"],
    links: [
      { label: "Facebook", href: "https://www.facebook.com/wako.12.k" },
      { label: "Github", href: "https://github.com/quocphu1203" },
    ],
  },
};

export function getAboutSection(locale: AppLocale): InfoSection {
  return ABOUT_SECTION_BY_LOCALE[locale];
}
