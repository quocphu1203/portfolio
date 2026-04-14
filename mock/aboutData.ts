import type { AppLocale } from "./locale";

export type InfoSection = {
  title: string;
  body: string;
  links?: { label: string; href: string }[];
};

const ABOUT_SECTION_BY_LOCALE: Record<AppLocale, InfoSection> = {
  en: {
    title: "Hi, I'm Phu! People also call me Wako.",
    body: `My full name is Pham Quoc Phu, a backend developer with strong passion for technology and the systems behind digital products. I am currently working as a Project Leader at GLD-LAB, a Japanese company, where I both contribute technically and coordinate the team to turn ideas into practical products.
My journey into IT started from simple things: a love for games and curiosity about how computers work. From entertainment, I became fascinated by what happens behind the screen - how one line of code can shape an experience and how systems run quietly but powerfully. That fascination eventually grew into a serious career path.
Beyond technology, I also love visual aesthetics. Photography, especially landscapes, is how I capture peaceful moments and express emotions through frames. It gives me a balance between engineering logic and artistic feeling.
I also have special appreciation for Japan, from its culture and people to its language. Japanese is not only a skill for me, but also a bridge to the professional, disciplined, and inspiring work environment I aim for.
For me, this journey is still ongoing - keep learning, keep improving, and keep moving toward the best version of myself.`,
    links: [
      { label: "Facebook", href: "https://www.facebook.com/wako.12.k" },
      { label: "GitHub", href: "https://github.com/quocphu1203" },
    ],
  },
  ja: {
    title: "こんにちは、フーです。Wakoとも呼ばれています。",
    body: `私のフルネームはファム・クオック・フーです。デジタル製品の裏側を支える仕組みに強い関心を持つバックエンドエンジニアです。現在は日本企業 GLD-LAB でプロジェクトリーダーを務め、開発だけでなくチーム連携やアイデアの実装推進にも取り組んでいます。
ITの道に進んだきっかけは、ゲームへの興味とコンピューターの仕組みへの好奇心でした。遊びの中で、画面の裏側で動くロジックに惹かれ、コードが体験を作る力に魅了されました。その興味が本格的なキャリアへとつながりました。
技術だけでなく、美しさを大切にする気持ちもあります。特に風景写真が好きで、静かな瞬間を切り取り、感情を伝える手段になっています。エンジニアとしての論理と、表現者としての感性のバランスだと感じています。
また、日本の文化・人・言語にも強い関心があります。日本語は単なるスキルではなく、私が目指すプロフェッショナルで規律ある環境に近づくための架け橋です。
この旅はまだ続いています。学び続け、成長し続け、自分のより良い姿に近づいていきます。`,
    links: [
      { label: "Facebook", href: "https://www.facebook.com/wako.12.k" },
      { label: "GitHub", href: "https://github.com/quocphu1203" },
    ],
  },
  vi: {
    title: "Xin chào, Phú đây! Mọi người còn gọi tôi là Wako.",
    body: `Tên đầy đủ của tôi là Phạm Quốc Phú - một backend developer với niềm đam mê sâu sắc dành cho công nghệ và những hệ thống vận hành phía sau mỗi sản phẩm số. Hiện tại, tôi đang đảm nhận vai trò Project Leader tại công ty Nhật Bản GLD-LAB, nơi tôi không chỉ phát triển kỹ thuật mà còn dẫn dắt đội ngũ, kết nối ý tưởng và biến chúng thành những sản phẩm thực tế.
Hành trình đến với IT của tôi bắt đầu từ những điều rất giản dị - niềm đam mê với game và sự tò mò về cách mà máy tính hoạt động. Từ những giờ phút giải trí, tôi dần bị cuốn hút bởi thế giới phía sau màn hình: cách một dòng code có thể tạo nên trải nghiệm, cách hệ thống vận hành âm thầm nhưng mạnh mẽ. Và từ đó, đam mê ấy lớn dần lên, trở thành con đường mà tôi theo đuổi một cách nghiêm túc.
Không chỉ dừng lại ở công nghệ, tôi còn có một tâm hồn yêu cái đẹp. Nhiếp ảnh, đặc biệt là chụp phong cảnh, là cách tôi lưu giữ những khoảnh khắc yên bình và truyền tải cảm xúc qua từng khung hình. Đó là sự cân bằng giữa logic của một lập trình viên và cảm xúc của một người nghệ sĩ.
Bên cạnh đó, tôi dành một tình cảm đặc biệt cho Nhật Bản - từ văn hóa, con người cho đến ngôn ngữ. Tiếng Nhật đối với tôi không chỉ là một kỹ năng, mà còn là cầu nối để tôi tiến gần hơn tới môi trường làm việc chuyên nghiệp, kỷ luật và đầy cảm hứng mà tôi luôn hướng tới.
Với tôi, hành trình này vẫn đang tiếp tục - không ngừng học hỏi, không ngừng phát triển, và từng bước tiến gần hơn đến phiên bản tốt nhất của chính mình.`,
    links: [
      { label: "Facebook", href: "https://www.facebook.com/wako.12.k" },
      { label: "Github", href: "https://github.com/quocphu1203" },
    ],
  },
};

export function getAboutSection(locale: AppLocale): InfoSection {
  return ABOUT_SECTION_BY_LOCALE[locale];
}
