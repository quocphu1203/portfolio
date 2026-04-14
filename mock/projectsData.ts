import type { InfoSection } from "./aboutData";
import type { AppLocale } from "./locale";

export type ProjectBirdItem = {
  id: string;
  name: string;
  description: string;
  github?: string;
};

const PROJECTS_SECTION_BY_LOCALE: Record<AppLocale, InfoSection> = {
  en: {
    title: "Projects",
    body: "Highlighted projects I have built, focused on user experience, system thinking, and turning ideas into practical products.",
    links: [
      { label: "GitHub", href: "https://github.com/quocphu1203" },
      { label: "Live demo", href: "#" },
    ],
  },
  ja: {
    title: "プロジェクト",
    body: "ユーザー体験、システム設計、そしてアイデアを実運用可能な形にする実装力を重視した代表的なプロジェクトです。",
    links: [
      { label: "GitHub", href: "https://github.com/quocphu1203" },
      { label: "デモ", href: "#" },
    ],
  },
  vi: {
    title: "Project",
    body: "Những dự án tiêu biểu mình đã thực hiện, tập trung vào trải nghiệm người dùng, tư duy hệ thống và khả năng triển khai sản phẩm từ ý tưởng đến phiên bản có thể vận hành thực tế.",
    links: [
      { label: "GitHub", href: "https://github.com/quocphu1203" },
      { label: "Live demo", href: "#" },
    ],
  },
};

const PROJECT_BIRD_ITEMS_BY_LOCALE: Record<AppLocale, ProjectBirdItem[]> = {
  en: [
    {
      id: "1",
      name: "Movie Streaming Website",
      description: "A web movie platform with core features such as browsing, searching, detailed views, and content ratings. Built with Laravel and MySQL, focused on smooth user flow and stable data handling.",
      github: "https://github.com/quocphu1203/DACS2",
    },
    {
      id: "2",
      name: "Android Movie App",
      description: "An Android movie app with quick search, content discovery, and community ratings. Built with Kotlin and Firebase for rapid delivery and real-time data sync.",
      github: "https://github.com",
    },
    {
      id: "3",
      name: "EarthCare App",
      description: "EarthCare is a community environment app where users can view maps of polluted areas, waste dumping spots, and green activities. Users can also add locations and join events. Built with React Native and Firebase.",
      github: "https://github.com/quocphu1203/EarthCare",
    },
    {
      id: "4",
      name: "Garden Advisor",
      description: "An app that helps gardeners identify and manage plants through photo capture, information lookup, status tracking, and health evaluation. Built with React Native and Firebase with a simple UX focus.",
      github: "https://github.com/quocphu1203/gardening_advisor",
    },
    {
      id: "5",
      name: "AI-powered Anime Product Review Platform",
      description: "My graduation project. A platform where users upload products, post reviews, and interact with the community. The highlight is a custom AI sentiment model to analyze comments and support more objective product scoring.",
      github: "https://github.com/quocphu1203/DATN",
    },
  ],
  ja: [
    {
      id: "1",
      name: "映画視聴Webサイト",
      description: "映画の閲覧・検索・詳細表示・評価などの主要機能を備えたWebプラットフォームです。LaravelとMySQLで構築し、スムーズな操作性と安定したデータ管理を重視しました。",
      github: "https://github.com/quocphu1203/DACS2",
    },
    {
      id: "2",
      name: "Android映画アプリ",
      description: "高速検索、作品探索、ユーザー評価の確認に対応したAndroidアプリです。KotlinとFirebaseで開発し、開発速度とリアルタイム同期を最適化しました。",
      github: "https://github.com",
    },
    {
      id: "3",
      name: "EarthCareアプリ",
      description: "EarthCareは環境コミュニティ向けアプリです。汚染地点、不法投棄エリア、環境イベントの場所を地図で確認できます。新規地点の追加やイベント参加登録も可能です。React NativeとFirebaseで構築しました。",
      github: "https://github.com/quocphu1203/EarthCare",
    },
    {
      id: "4",
      name: "Garden Advisor",
      description: "写真撮影、情報検索、状態追跡、健康評価機能を通じて植物管理を支援するアプリです。React NativeとFirebaseで開発し、シンプルで使いやすい体験を重視しました。",
      github: "https://github.com/quocphu1203/gardening_advisor",
    },
    {
      id: "5",
      name: "AI統合アニメ商品レビュー基盤",
      description: "卒業プロジェクトです。ユーザーが商品を投稿し、レビューし、コミュニティ交流できるプラットフォームを構築しました。独自AI感情分析モデルでコメントを解析し、より客観的な評価を支援します。",
      github: "https://github.com/quocphu1203/DATN",
    },
  ],
  vi: [
    {
      id: "1",
      name: "Website xem phim",
      description: "Nền tảng xem phim trên web với các tính năng cốt lõi như duyệt phim, tìm kiếm, xem chi tiết và đánh giá nội dung. Dự án được xây dựng bằng Laravel và MySQL, tập trung vào luồng sử dụng mượt mà và quản lý dữ liệu ổn định.",
      github: "https://github.com/quocphu1203/DACS2",
    },
    {
      id: "2",
      name: "Ứng dụng Android xem phim",
      description: "Ứng dụng xem phim trên Android hỗ trợ tìm kiếm nhanh, khám phá nội dung và theo dõi đánh giá từ người dùng. Dự án được phát triển bằng Kotlin và Firebase để tối ưu tốc độ triển khai và đồng bộ dữ liệu theo thời gian thực.",
      github: "https://github.com",
    },
    {
      id: "3",
      name: "Ứng dụng EarthCare",
      description: "EarthCare là ứng dụng cộng đồng về môi trường, cho phép người dùng tra cứu bản đồ các điểm ô nhiễm, khu vực xả rác và địa điểm tổ chức hoạt động xanh. Người dùng cũng có thể thêm điểm mới và đăng ký tham gia sự kiện. Ứng dụng được xây dựng bằng React Native và Firebase.",
      github: "https://github.com/quocphu1203/EarthCare",
    },
    {
      id: "4",
      name: "Garden Advisor",
      description: "Ứng dụng hỗ trợ người làm vườn nhận diện và quản lý cây trồng thông qua các tính năng chụp ảnh, tra cứu thông tin, theo dõi và đánh giá tình trạng cây. Dự án được phát triển bằng React Native và Firebase, hướng đến trải nghiệm đơn giản và dễ dùng.",
      github: "https://github.com/quocphu1203/gardening_advisor",
    },
    {
      id: "5",
      name: "Nền tảng đánh giá sản phẩm Anime tích hợp AI",
      description: "Đây là đồ án tốt nghiệp của mình. Ứng dụng xây dựng một nền tảng nơi người dùng có thể đăng tải sản phẩm, tham gia đánh giá và tương tác với cộng đồng. Điểm nổi bật là mô hình AI tự xây dựng để phân tích cảm xúc trong bình luận, từ đó hỗ trợ chấm điểm sản phẩm khách quan và sát thực tế hơn.",
      github: "https://github.com/quocphu1203/DATN",
    },
  ],
};

export function getProjectsSection(locale: AppLocale): InfoSection {
  return PROJECTS_SECTION_BY_LOCALE[locale];
}

export function getProjectBirdItems(locale: AppLocale): ProjectBirdItem[] {
  return PROJECT_BIRD_ITEMS_BY_LOCALE[locale];
}
