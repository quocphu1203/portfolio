import type { InfoSection } from "./aboutData";
import type { AppLocale } from "./locale";

export type ProjectBirdItem = {
  id: string;
  name: string;
  description: string;
  role?: string;
  techStack?: string[];
  learned?: string[];
  challenges?: string[];
  media?: {
    label: string;
    type: string;
    description: string;
    href?: string;
  }[];
  github?: string;
  githubLinks?: {
    label: string;
    href: string;
  }[];
  links?: {
    label: string;
    href: string;
  }[];
};

const formatProjectDescription = (...paragraphs: string[]) => paragraphs.join("\n\n");

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
      description: formatProjectDescription(
        "A Laravel-based movie streaming website that organizes films by category, genre, and country, then guides users from discovery to detail pages and the watch screen. The project focuses on building a familiar entertainment browsing flow instead of a simple static movie list.",
        "I implemented the main web structure with Blade views, Laravel routing, authentication scaffolding, and a MySQL seed database for movie content. The interface separates home, category, genre, country, movie detail, and watch pages so users can move through the content naturally.",
        "Tech stack: Laravel, Blade, PHP, MySQL, Vite."
      ),
      role: "Full-stack developer responsible for the Laravel structure, Blade pages, routing, authentication setup, and database-backed movie content flow.",
      techStack: ["Laravel", "Blade", "PHP", "MySQL", "Vite", "Laravel Auth"],
      learned: [
        "How to structure a server-rendered Laravel application around real user navigation.",
        "How authentication, routes, views, and database content work together in a practical web product.",
      ],
      challenges: [
        "Organizing movie data by several browsing paths without making the interface confusing.",
        "Keeping the page flow close to a streaming platform while working with a simple Laravel codebase.",
      ],
      media: [
        {
          label: "Repository source",
          type: "Code preview",
          description: "Blade pages, routes, and SQL seed data are available in the GitHub repository.",
          href: "https://github.com/quocphu1203/DACS2",
        },
      ],
      github: "https://github.com/quocphu1203/DACS2",
    },
    {
      id: "2",
      name: "Android Movie App",
      description: formatProjectDescription(
        "A native Android movie application built for mobile discovery, personal watch tracking, and quick playback. Users can register, log in, browse the home feed, search for movies, open movie details, save favorites, review watch history, comment, and watch videos inside the app.",
        "The project combines Firebase Auth and Firebase Realtime Database for user-related data with external movie/video integrations through TMDB and YouTube APIs. I also structured the app with separate activities, fragments, adapters, and layout files to keep each user flow clear.",
        "Tech stack: Kotlin, Android SDK, Firebase Auth, Firebase Realtime Database, Retrofit, TMDB API, YouTube Player API."
      ),
      role: "Android developer responsible for building the main screens, Firebase user flows, API integration, movie playback flow, and local UI structure.",
      techStack: ["Kotlin", "Android SDK", "Firebase Auth", "Firebase Realtime Database", "Retrofit", "TMDB API", "YouTube Player API"],
      learned: [
        "How to build a native mobile app with multiple screens, adapters, fragments, and asynchronous API data.",
        "How to combine authentication, remote movie data, favorites, history, comments, and video playback in one flow.",
      ],
      challenges: [
        "Connecting movie metadata and video playback while keeping the mobile navigation simple.",
        "Managing user-specific data such as favorites and watch history with Firebase.",
      ],
      media: [
        {
          label: "Android source",
          type: "Code preview",
          description: "Activities, layouts, adapters, Firebase integration, and movie API code are available in GitHub.",
          href: "https://github.com/quocphu1203/DACS3",
        },
      ],
      github: "https://github.com/quocphu1203/DACS3",
    },
    {
      id: "3",
      name: "EarthCare App",
      description: formatProjectDescription(
        "EarthCare is a React Native environmental community app that helps users report local environmental problems and join green activities. The core experience centers on a map where pollution points, cleanup places, and activity locations can be viewed in context.",
        "Users can sign in, add new locations, create activities, browse activity lists, open activity details, receive notifications, and manage their profiles. The app uses Firebase services for authentication, Firestore data, storage, messaging, and location-related features.",
        "Tech stack: React Native, TypeScript, Firebase Auth, Firestore, Firebase Storage, Firebase Messaging, React Native Maps, Google Places/Maps APIs."
      ),
      role: "Mobile developer working on the React Native app structure, Firebase-backed features, map experience, activity screens, profile flow, and notification-related behavior.",
      techStack: ["React Native", "TypeScript", "Firebase Auth", "Firestore", "Firebase Storage", "Firebase Messaging", "React Native Maps", "Google Maps APIs"],
      learned: [
        "How to design a location-based mobile app where maps, community reports, and activities share one data model.",
        "How to connect authentication, storage, notifications, and map interactions in a React Native project.",
      ],
      challenges: [
        "Making environmental reports understandable on a map without overwhelming the user.",
        "Handling multiple Firebase services and mobile permissions in a consistent app flow.",
      ],
      media: [
        {
          label: "Mobile app source",
          type: "Code preview",
          description: "Screens, navigation, Firebase API layer, and map-related implementation are available in GitHub.",
          href: "https://github.com/quocphu1203/EarthCare",
        },
      ],
      github: "https://github.com/quocphu1203/EarthCare",
    },
    {
      id: "4",
      name: "Garden Advisor",
      description: formatProjectDescription(
        "Garden Advisor is a mobile plant-care assistant designed for people who want a simpler way to understand and care for their plants. The app concept focuses on identifying plants from photos, looking up care guidance, tracking growth status, and checking plant health over time.",
        "The product direction is practical: reduce the friction of recording plant condition, make care information easy to find, and help users notice potential health issues earlier. The experience is shaped around quick capture, clear plant records, and useful daily-care suggestions.",
        "Focus areas: plant identification, care lookup, photo-based health evaluation, plant status tracking, mobile UX."
      ),
      role: "Product-minded mobile developer shaping the app concept, feature flow, plant record structure, and daily-care user experience.",
      techStack: ["React Native", "Firebase", "Mobile UX", "Image capture", "Plant care workflow"],
      learned: [
        "How to translate a daily habit, plant care, into a small set of practical mobile interactions.",
        "How photo capture, record keeping, and care suggestions can work together in a user-friendly assistant.",
      ],
      challenges: [
        "Designing the feature scope so the app stays useful without becoming too complex for casual users.",
        "Presenting plant health information in a way that feels actionable rather than technical.",
      ],
      media: [
        {
          label: "Demo slot",
          type: "Screenshot/video placeholder",
          description: "Prepared for future app screenshots or a short care-flow demo video.",
        },
      ],
    },
    {
      id: "5",
      name: "AI-powered Anime Product Review Platform",
      description: formatProjectDescription(
        "My graduation project: an anime product review platform with an admin dashboard for managing products, categories, reviews, and review collection workflows. The goal is to make product evaluation more organized by combining structured product data with review analytics.",
        "The public dashboard is built with Next.js and Firebase, using table-based management screens and charts for clearer admin visibility. Alongside the dashboard, I prepared a custom sentiment analysis model to analyze review comments and support more objective product scoring.",
        "Tech stack: Next.js, React, TypeScript, Firebase, TanStack Table, Recharts, TensorFlow/TFLite sentiment model."
      ),
      role: "Graduation project developer responsible for the product review platform, admin dashboard, review management flow, and AI sentiment-analysis direction.",
      techStack: ["Next.js", "React", "TypeScript", "Firebase", "TanStack Table", "Recharts", "TensorFlow", "TFLite"],
      learned: [
        "How to combine product management, review workflows, dashboards, and AI-assisted scoring in one larger system.",
        "How to prepare an admin interface that turns raw review data into something easier to manage and evaluate.",
      ],
      challenges: [
        "Designing a scoring approach that does not rely only on manual ratings or subjective impressions.",
        "Connecting the main app, admin dashboard, report, and sentiment model into a coherent graduation project.",
      ],
      media: [
        {
          label: "Graduation report",
          type: "PDF",
          description: "Full report describing the project scope, implementation, and evaluation.",
          href: "https://elib.vku.udn.vn/bitstream/123456789/6559/1/21JIT-21IT099-Pham%20Quoc%20Phu-21JIT-21IT640-Pham%20Hoang%20Phuc-DATN.pdf",
        },
        {
          label: "Admin dashboard source",
          type: "Code preview",
          description: "Next.js admin dashboard with product, category, review, and chart management screens.",
          href: "https://github.com/quocphu1203/datn-web-admin",
        },
      ],
      githubLinks: [
        { label: "Main app", href: "https://github.com/quocphu1203/DATN" },
        { label: "Admin web", href: "https://github.com/quocphu1203/datn-web-admin" },
      ],
      links: [
        {
          label: "Report",
          href: "https://elib.vku.udn.vn/bitstream/123456789/6559/1/21JIT-21IT099-Pham%20Quoc%20Phu-21JIT-21IT640-Pham%20Hoang%20Phuc-DATN.pdf",
        },
      ],
    },
  ],
  ja: [
    {
      id: "1",
      name: "映画視聴Webサイト",
      description: formatProjectDescription(
        "Laravelで構築した映画視聴Webサイトです。カテゴリ、ジャンル、国別で作品を整理し、ユーザーが作品を探して詳細を確認し、そのまま視聴画面へ進めるように設計しました。単なる一覧ではなく、動画配信サービスに近い導線を意識しています。",
        "Bladeビュー、Laravelルーティング、認証機能、MySQLのシードデータを使い、ホーム、カテゴリ、ジャンル、国、映画詳細、視聴ページを分けて実装しました。コンテンツの整理と画面遷移のわかりやすさを重視しています。",
        "使用技術: Laravel, Blade, PHP, MySQL, Vite."
      ),
      role: "Laravel構成、Bladeページ、ルーティング、認証設定、データベース連携を担当したフルスタック開発者。",
      techStack: ["Laravel", "Blade", "PHP", "MySQL", "Vite", "Laravel Auth"],
      learned: [
        "実際のユーザー導線に合わせて、サーバーサイドレンダリングのLaravelアプリを構成する方法。",
        "認証、ルーティング、ビュー、データベースの内容がWebプロダクト内でどう連携するか。",
      ],
      challenges: [
        "カテゴリ、ジャンル、国別など複数の探し方を用意しながら、画面を複雑にしすぎないこと。",
        "シンプルなLaravel構成の中で、動画配信サービスに近い閲覧体験を作ること。",
      ],
      media: [
        {
          label: "リポジトリ",
          type: "コード",
          description: "Bladeページ、ルート、SQLデータをGitHubで確認できます。",
          href: "https://github.com/quocphu1203/DACS2",
        },
      ],
      github: "https://github.com/quocphu1203/DACS2",
    },
    {
      id: "2",
      name: "Android映画アプリ",
      description: formatProjectDescription(
        "Kotlinで開発したネイティブAndroid映画アプリです。ユーザー登録、ログイン、ホームでの作品探索、検索、詳細確認、お気に入り、視聴履歴、コメント、動画再生まで、モバイルで映画を探して視聴する一連の流れを実装しました。",
        "Firebase AuthとFirebase Realtime Databaseでユーザー関連データを扱い、TMDB APIとYouTube Player APIを組み合わせて映画情報と動画再生を連携させています。Activity、Fragment、Adapter、Layoutを分け、各機能の役割が見える構成にしました。",
        "使用技術: Kotlin, Android SDK, Firebase Auth, Firebase Realtime Database, Retrofit, TMDB API, YouTube Player API."
      ),
      role: "主要画面、Firebase連携、映画API連携、動画再生フロー、Android UI構成を担当したAndroid開発者。",
      techStack: ["Kotlin", "Android SDK", "Firebase Auth", "Firebase Realtime Database", "Retrofit", "TMDB API", "YouTube Player API"],
      learned: [
        "複数画面、Adapter、Fragment、非同期APIデータを持つネイティブモバイルアプリの作り方。",
        "認証、映画データ、お気に入り、履歴、コメント、動画再生を一つのアプリ体験にまとめる方法。",
      ],
      challenges: [
        "映画情報と動画再生を連携しながら、モバイルの導線をシンプルに保つこと。",
        "お気に入りや視聴履歴など、ユーザーごとのデータをFirebaseで扱うこと。",
      ],
      media: [
        {
          label: "Androidソース",
          type: "コード",
          description: "Activity、Layout、Adapter、Firebase連携、映画API実装をGitHubで確認できます。",
          href: "https://github.com/quocphu1203/DACS3",
        },
      ],
      github: "https://github.com/quocphu1203/DACS3",
    },
    {
      id: "3",
      name: "EarthCareアプリ",
      description: formatProjectDescription(
        "EarthCareは、地域の環境問題の報告と環境活動への参加を支援するReact Nativeアプリです。地図を中心に、汚染地点、清掃地点、活動場所を確認できるようにし、ユーザーが身近な環境情報を共有しやすい体験を目指しました。",
        "ログイン、地点追加、活動作成、活動一覧、活動詳細、通知、プロフィール編集などの画面を持ち、Firebaseを使って認証、データ保存、画像保存、通知を扱います。Google Maps/Places系の機能も組み込み、位置情報を活用したアプリとして設計しました。",
        "使用技術: React Native, TypeScript, Firebase Auth, Firestore, Firebase Storage, Firebase Messaging, React Native Maps, Google Places/Maps APIs."
      ),
      role: "React Native構成、Firebase機能、地図体験、活動画面、プロフィール、通知周りを担当したモバイル開発者。",
      techStack: ["React Native", "TypeScript", "Firebase Auth", "Firestore", "Firebase Storage", "Firebase Messaging", "React Native Maps", "Google Maps APIs"],
      learned: [
        "地図、地域レポート、環境活動を一つのデータ体験として設計する方法。",
        "認証、ストレージ、通知、地図操作をReact Nativeアプリ内でつなげる方法。",
      ],
      challenges: [
        "地図上の環境レポートを、情報量が多すぎない形で見せること。",
        "複数のFirebaseサービスとモバイル権限を一貫した体験にまとめること。",
      ],
      media: [
        {
          label: "モバイルアプリソース",
          type: "コード",
          description: "画面、ナビゲーション、Firebase API層、地図関連の実装をGitHubで確認できます。",
          href: "https://github.com/quocphu1203/EarthCare",
        },
      ],
      github: "https://github.com/quocphu1203/EarthCare",
    },
    {
      id: "4",
      name: "Garden Advisor",
      description: formatProjectDescription(
        "Garden Advisorは、植物の状態を記録しながら日々の手入れを支援するモバイル植物管理アシスタントです。写真からの植物識別、育て方の検索、成長状態の追跡、健康状態の確認を通じて、初心者でも植物管理を続けやすくすることを目指しています。",
        "プロダクトの方向性としては、記録の手間を減らし、必要なケア情報に素早くたどり着けることを重視しました。写真撮影、植物ごとの記録、状態変化の確認、ケア提案を組み合わせ、日常的に使える体験を意識しています。",
        "注力領域: 植物識別、育成情報検索、写真ベースの健康確認、植物状態管理、モバイルUX."
      ),
      role: "アプリコンセプト、機能フロー、植物記録の構造、日常利用を想定したモバイル体験を設計。",
      techStack: ["React Native", "Firebase", "Mobile UX", "Image capture", "Plant care workflow"],
      learned: [
        "植物管理という日常習慣を、少ない操作で続けられるモバイル体験に落とし込む方法。",
        "写真撮影、記録、ケア提案を組み合わせてユーザーに役立つ補助機能を作る考え方。",
      ],
      challenges: [
        "初心者にも使いやすいように、機能範囲を広げすぎず整理すること。",
        "植物の健康状態を、専門的すぎず行動につながる情報として見せること。",
      ],
      media: [
        {
          label: "デモ枠",
          type: "スクリーンショット/動画",
          description: "今後アプリ画面や短い操作デモ動画を追加できる枠です。",
        },
      ],
    },
    {
      id: "5",
      name: "AI統合アニメ商品レビュー基盤",
      description: formatProjectDescription(
        "卒業プロジェクトとして制作した、アニメ商品のレビュー管理プラットフォームです。商品、カテゴリ、レビュー、レビュー収集フローを管理し、感覚的な評価だけに頼らず、レビュー情報をより整理して扱える仕組みを目指しました。",
        "公開されている管理画面はNext.jsとFirebaseで構築し、テーブル管理画面やチャートで運用状況を見やすくしました。AI側では独自の感情分析モデルを用意し、コメント内容を分析して、より客観的な商品評価を支援する構成にしています。",
        "使用技術: Next.js, React, TypeScript, Firebase, TanStack Table, Recharts, TensorFlow/TFLite sentiment model."
      ),
      role: "卒業プロジェクト開発者として、商品レビュー基盤、管理画面、レビュー管理フロー、AI感情分析の方向性を担当。",
      techStack: ["Next.js", "React", "TypeScript", "Firebase", "TanStack Table", "Recharts", "TensorFlow", "TFLite"],
      learned: [
        "商品管理、レビュー収集、ダッシュボード、AI評価支援を一つの大きなシステムとしてまとめる方法。",
        "レビューの生データを、管理者が確認・判断しやすい情報に変換するUIの作り方。",
      ],
      challenges: [
        "手動評価や主観だけに頼らないスコアリングの仕組みを考えること。",
        "メインアプリ、管理画面、レポート、感情分析モデルを一つの卒業制作として整合させること。",
      ],
      media: [
        {
          label: "卒業論文",
          type: "PDF",
          description: "プロジェクトの範囲、実装、評価をまとめたレポートです。",
          href: "https://elib.vku.udn.vn/bitstream/123456789/6559/1/21JIT-21IT099-Pham%20Quoc%20Phu-21JIT-21IT640-Pham%20Hoang%20Phuc-DATN.pdf",
        },
        {
          label: "管理画面ソース",
          type: "コード",
          description: "商品、カテゴリ、レビュー、チャート管理画面を含むNext.js管理画面です。",
          href: "https://github.com/quocphu1203/datn-web-admin",
        },
      ],
      githubLinks: [
        { label: "メインアプリ", href: "https://github.com/quocphu1203/DATN" },
        { label: "管理画面", href: "https://github.com/quocphu1203/datn-web-admin" },
      ],
      links: [
        {
          label: "レポート",
          href: "https://elib.vku.udn.vn/bitstream/123456789/6559/1/21JIT-21IT099-Pham%20Quoc%20Phu-21JIT-21IT640-Pham%20Hoang%20Phuc-DATN.pdf",
        },
      ],
    },
  ],
  vi: [
    {
      id: "1",
      name: "Website xem phim",
      description: formatProjectDescription(
        "Website xem phim được xây dựng bằng Laravel, tập trung vào luồng người dùng từ lúc khám phá nội dung đến khi mở trang xem phim. Người dùng có thể duyệt phim theo danh mục, thể loại, quốc gia, xem thông tin chi tiết và chuyển sang màn hình xem một cách tự nhiên.",
        "Trong dự án này, mình triển khai cấu trúc giao diện bằng Blade, dùng Laravel routing, Laravel Auth và dữ liệu MySQL để tổ chức nội dung phim. Các trang như home, category, genre, country, detail và watch được tách rõ để trải nghiệm giống một nền tảng streaming hơn là một danh sách phim đơn giản.",
        "Công nghệ: Laravel, Blade, PHP, MySQL, Vite."
      ),
      role: "Full-stack developer, phụ trách cấu trúc Laravel, các trang Blade, routing, xác thực và luồng dữ liệu phim từ database lên giao diện.",
      techStack: ["Laravel", "Blade", "PHP", "MySQL", "Vite", "Laravel Auth"],
      learned: [
        "Cách tổ chức một ứng dụng Laravel server-rendered theo đúng luồng người dùng thực tế.",
        "Cách authentication, route, view và database phối hợp với nhau trong một web product hoàn chỉnh.",
      ],
      challenges: [
        "Tổ chức dữ liệu phim theo nhiều hướng duyệt như danh mục, thể loại và quốc gia mà không làm giao diện rối.",
        "Tạo cảm giác giống nền tảng streaming trong một codebase Laravel tương đối đơn giản.",
      ],
      media: [
        {
          label: "Repository source",
          type: "Code preview",
          description: "Có thể xem các trang Blade, routes và dữ liệu SQL trong GitHub repository.",
          href: "https://github.com/quocphu1203/DACS2",
        },
      ],
      github: "https://github.com/quocphu1203/DACS2",
    },
    {
      id: "2",
      name: "Ứng dụng Android xem phim",
      description: formatProjectDescription(
        "Ứng dụng xem phim native trên Android, viết bằng Kotlin, hướng đến trải nghiệm khám phá và xem phim gọn trên mobile. Người dùng có thể đăng ký, đăng nhập, xem trang chủ, tìm kiếm phim, mở chi tiết, lưu yêu thích, theo dõi lịch sử xem, bình luận và phát video trong ứng dụng.",
        "Dự án kết hợp Firebase Auth và Firebase Realtime Database để xử lý dữ liệu người dùng, đồng thời dùng TMDB API và YouTube Player API cho dữ liệu phim và phát video. Cấu trúc app được chia theo Activity, Fragment, Adapter và layout riêng để từng luồng chức năng dễ quản lý.",
        "Công nghệ: Kotlin, Android SDK, Firebase Auth, Firebase Realtime Database, Retrofit, TMDB API, YouTube Player API."
      ),
      role: "Android developer, phụ trách các màn hình chính, luồng người dùng với Firebase, tích hợp API phim, phát video và cấu trúc UI native.",
      techStack: ["Kotlin", "Android SDK", "Firebase Auth", "Firebase Realtime Database", "Retrofit", "TMDB API", "YouTube Player API"],
      learned: [
        "Cách xây dựng app Android native có nhiều màn hình, Adapter, Fragment và dữ liệu API bất đồng bộ.",
        "Cách kết hợp đăng nhập, dữ liệu phim, yêu thích, lịch sử xem, bình luận và phát video trong một trải nghiệm liền mạch.",
      ],
      challenges: [
        "Kết nối dữ liệu phim và video playback nhưng vẫn giữ điều hướng mobile đơn giản.",
        "Quản lý dữ liệu riêng của từng người dùng như yêu thích và lịch sử xem bằng Firebase.",
      ],
      media: [
        {
          label: "Android source",
          type: "Code preview",
          description: "Có thể xem Activity, layout, Adapter, Firebase integration và movie API code trong GitHub.",
          href: "https://github.com/quocphu1203/DACS3",
        },
      ],
      github: "https://github.com/quocphu1203/DACS3",
    },
    {
      id: "3",
      name: "Ứng dụng EarthCare",
      description: formatProjectDescription(
        "EarthCare là ứng dụng cộng đồng về môi trường, được xây dựng bằng React Native để giúp người dùng báo cáo vấn đề môi trường và tham gia các hoạt động xanh tại địa phương. Trải nghiệm chính xoay quanh bản đồ, nơi người dùng có thể xem các điểm ô nhiễm, điểm dọn dẹp và địa điểm tổ chức hoạt động.",
        "Ứng dụng có các luồng đăng nhập, thêm địa điểm, tạo hoạt động, xem danh sách hoạt động, xem chi tiết hoạt động, nhận thông báo và quản lý hồ sơ cá nhân. Firebase được dùng cho xác thực, lưu dữ liệu, lưu ảnh và gửi thông báo; phần bản đồ tích hợp React Native Maps và các API liên quan của Google.",
        "Công nghệ: React Native, TypeScript, Firebase Auth, Firestore, Firebase Storage, Firebase Messaging, React Native Maps, Google Places/Maps APIs."
      ),
      role: "Mobile developer, tham gia xây dựng cấu trúc React Native, các tính năng Firebase, trải nghiệm bản đồ, màn hình hoạt động, hồ sơ và thông báo.",
      techStack: ["React Native", "TypeScript", "Firebase Auth", "Firestore", "Firebase Storage", "Firebase Messaging", "React Native Maps", "Google Maps APIs"],
      learned: [
        "Cách thiết kế app location-based nơi bản đồ, điểm báo cáo và hoạt động cộng đồng dùng chung một logic dữ liệu.",
        "Cách kết nối xác thực, lưu ảnh, thông báo và thao tác bản đồ trong một project React Native.",
      ],
      challenges: [
        "Hiển thị các điểm môi trường trên bản đồ sao cho dễ hiểu, không gây quá tải thông tin.",
        "Quản lý nhiều Firebase services và permission mobile trong một luồng app nhất quán.",
      ],
      media: [
        {
          label: "Mobile app source",
          type: "Code preview",
          description: "Có thể xem screens, navigation, Firebase API layer và phần map implementation trong GitHub.",
          href: "https://github.com/quocphu1203/EarthCare",
        },
      ],
      github: "https://github.com/quocphu1203/EarthCare",
    },
    {
      id: "4",
      name: "Garden Advisor",
      description: formatProjectDescription(
        "Garden Advisor là ứng dụng trợ lý chăm sóc cây trồng dành cho người muốn quản lý cây một cách dễ hiểu hơn. Ý tưởng chính là hỗ trợ nhận diện cây từ ảnh, tra cứu thông tin chăm sóc, ghi lại tình trạng phát triển và đánh giá sức khỏe cây theo thời gian.",
        "Hướng thiết kế của dự án là giảm thao tác ghi chép thủ công, giúp người dùng nhanh chóng lưu lại tình trạng cây và tìm được gợi ý chăm sóc phù hợp. Trải nghiệm tập trung vào chụp ảnh, hồ sơ từng cây, theo dõi thay đổi và nhắc người dùng chú ý sớm tới các dấu hiệu bất thường.",
        "Trọng tâm: nhận diện cây, tra cứu cách chăm sóc, đánh giá sức khỏe từ ảnh, theo dõi tình trạng cây, trải nghiệm mobile."
      ),
      role: "Mobile developer theo hướng product, phụ trách ý tưởng ứng dụng, luồng tính năng, cấu trúc hồ sơ cây và trải nghiệm chăm sóc hằng ngày.",
      techStack: ["React Native", "Firebase", "Mobile UX", "Image capture", "Plant care workflow"],
      learned: [
        "Cách chuyển một thói quen hằng ngày như chăm cây thành các tương tác mobile đơn giản và dễ duy trì.",
        "Cách kết hợp chụp ảnh, lưu hồ sơ và gợi ý chăm sóc để tạo một trợ lý hữu ích cho người dùng.",
      ],
      challenges: [
        "Giữ phạm vi tính năng vừa đủ để app hữu ích nhưng không quá phức tạp với người dùng phổ thông.",
        "Trình bày tình trạng sức khỏe cây theo hướng dễ hiểu và có thể hành động được.",
      ],
      media: [
        {
          label: "Demo slot",
          type: "Screenshot/video placeholder",
          description: "Đã chừa sẵn vị trí để thêm screenshot hoặc video demo ngắn cho luồng chăm cây.",
        },
      ],
    },
    {
      id: "5",
      name: "Nền tảng đánh giá sản phẩm Anime tích hợp AI",
      description: formatProjectDescription(
        "Đây là đồ án tốt nghiệp của mình, xoay quanh nền tảng đánh giá sản phẩm anime và hệ thống quản trị đi kèm. Dashboard hỗ trợ quản lý sản phẩm, danh mục, review và quy trình thu thập đánh giá, giúp dữ liệu review được tổ chức rõ ràng hơn cho việc theo dõi và phân tích.",
        "Phần dashboard public được xây dựng bằng Next.js và Firebase, có các màn hình quản lý dạng bảng và biểu đồ để admin dễ quan sát dữ liệu. Bên cạnh đó, mình chuẩn bị mô hình sentiment analysis tự huấn luyện để phân tích nội dung bình luận, từ đó hỗ trợ chấm điểm sản phẩm khách quan hơn thay vì chỉ dựa vào cảm tính.",
        "Công nghệ: Next.js, React, TypeScript, Firebase, TanStack Table, Recharts, TensorFlow/TFLite sentiment model."
      ),
      role: "Graduation project developer, phụ trách nền tảng review sản phẩm, dashboard admin, luồng quản lý review và hướng tích hợp AI sentiment analysis.",
      techStack: ["Next.js", "React", "TypeScript", "Firebase", "TanStack Table", "Recharts", "TensorFlow", "TFLite"],
      learned: [
        "Cách kết hợp quản lý sản phẩm, quy trình review, dashboard và AI scoring thành một hệ thống lớn hơn.",
        "Cách biến dữ liệu review thô thành thông tin dễ quản lý, dễ quan sát và có giá trị hơn cho admin.",
      ],
      challenges: [
        "Thiết kế hướng chấm điểm không chỉ dựa vào rating thủ công hoặc cảm tính cá nhân.",
        "Kết nối app chính, web admin, báo cáo và mô hình sentiment thành một đồ án có tính thống nhất.",
      ],
      media: [
        {
          label: "Graduation report",
          type: "PDF",
          description: "Báo cáo đầy đủ về phạm vi, cách triển khai và đánh giá của đồ án.",
          href: "https://elib.vku.udn.vn/bitstream/123456789/6559/1/21JIT-21IT099-Pham%20Quoc%20Phu-21JIT-21IT640-Pham%20Hoang%20Phuc-DATN.pdf",
        },
        {
          label: "Admin dashboard source",
          type: "Code preview",
          description: "Source dashboard Next.js gồm quản lý sản phẩm, danh mục, review và biểu đồ.",
          href: "https://github.com/quocphu1203/datn-web-admin",
        },
      ],
      githubLinks: [
        { label: "App chính", href: "https://github.com/quocphu1203/DATN" },
        { label: "Web admin", href: "https://github.com/quocphu1203/datn-web-admin" },
      ],
      links: [
        {
          label: "Report",
          href: "https://elib.vku.udn.vn/bitstream/123456789/6559/1/21JIT-21IT099-Pham%20Quoc%20Phu-21JIT-21IT640-Pham%20Hoang%20Phuc-DATN.pdf",
        },
      ],
    },
  ],
};

export function getProjectsSection(locale: AppLocale): InfoSection {
  return PROJECTS_SECTION_BY_LOCALE[locale];
}

export function getProjectBirdItems(locale: AppLocale): ProjectBirdItem[] {
  return PROJECT_BIRD_ITEMS_BY_LOCALE[locale];
}
