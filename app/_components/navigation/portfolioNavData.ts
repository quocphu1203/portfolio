export const NAV_IDS = ["projects", "articles", "about", "credits"] as const;
export type NavId = (typeof NAV_IDS)[number];

/** Gốc chân cột (world). */
export const SIGNPOST_ANCHOR: [number, number, number] = [3, 10, -10];
export const SIGNPOST_SCALE = 2;

export type CameraPreset = {
  position: [number, number, number];
  target: [number, number, number];
};

export type ProjectBirdItem = {
  id: string;
  name: string;
  description: string;
  github?: string;
};

export function getCameraPresets(orbitY: number): Record<NavId | "menu" | "default", CameraPreset> {
  const mid = orbitY * 0.72;
  const hi = orbitY * 1.08;
  /** Cùng công thức `orbitAimY` trong FantasyIslandFitted — góc menu / mặc định không bám signpost. */
  const defaultLookY = orbitY * 0.7;

  return {
    default: {
      position: [-11, orbitY * 0.92, -34],
      target: [0, defaultLookY, 0],
    },
    menu: {
      position: [-6.2, orbitY * 0.9, -15.2],
      target: [0, defaultLookY, 0],
    },
    projects: {
      position: [17, hi, 12],
      target: [5, mid, 1],
    },
    articles: {
      position: [6, orbitY * 1.28, -19],
      target: [0, mid * 1.05, 0],
    },
    about: {
      position: [-19, orbitY * 0.9, 8],
      target: [-5.5, mid, -3],
    },
    credits: {
      position: [-4.5, orbitY * 0.85, -21],
      target: [0, mid * 0.92, 0],
    },
  };
}

export const NAV_COPY: Record<
  NavId,
  { title: string; body: string; links?: { label: string; href: string }[] }
> = {
  projects: {
    title: "Project",
    body: "Các dự án web, 3D và công cụ bạn đã làm. Thay nội dung này bằng mô tả thật và thêm link demo hoặc repo bên dưới.",
    links: [
      { label: "GitHub", href: "https://github.com" },
      { label: "Live demo", href: "#" },
    ],
  },
  articles: {
    title: "Kỹ năng",
    body: "Bài viết kỹ thuật, ghi chú học tập hoặc case study ngắn. Cập nhật danh sách bài khi bạn có blog.",
    links: [{ label: "Blog", href: "#" }],
  },
  about: {
    title: "Giới thiệu",
    body: "Giới thiệu ngắn về bạn: vai trò, stack yêu thích, thứ đang học. Chỉnh sửa đoạn này cho đúng profile của bạn.",
    links: [{ label: "LinkedIn", href: "#" }],
  },
  credits: {
    title: "Kinh nghiệm",
    body: "Cảm ơn Three.js, React Three Fiber, drei, và tác giả asset đảo fantasy. Thêm license hoặc attribution cụ thể tại đây.",
    links: [{ label: "License", href: "#" }],
  },
};

export const SIGN_LABELS: Record<NavId, string> = {
  projects: "Project",
  articles: "Kỹ năng",
  about: "Giới thiệu",
  credits: "Kinh nghiệm",
};

export const PROJECT_BIRD_ITEMS: ProjectBirdItem[] = [
  {
    id: "portfolio-3d",
    name: "3D Portfolio",
    description: "Landing page 3D tương tác với scene đảo fantasy, điều hướng theo section và hiệu ứng thời gian trong ngày.",
    github: "https://github.com",
  },
  {
    id: "task-flow",
    name: "Task Flow",
    description: "Ứng dụng quản lý công việc có board, drag-drop và phân quyền theo nhóm nhỏ.",
    github: "https://github.com",
  },
  {
    id: "ecommerce-ui",
    name: "Commerce UI",
    description: "Bộ giao diện storefront tối ưu mobile-first, focus tốc độ tải và UX checkout.",
  },
  {
    id: "realtime-chat",
    name: "Realtime Chat",
    description: "Ứng dụng chat thời gian thực với rooms, presence và thông báo trạng thái người dùng.",
    github: "https://github.com",
  },
];
