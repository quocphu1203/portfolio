export const NAV_IDS = ["projects", "articles", "about", "credits"] as const;
export type NavId = (typeof NAV_IDS)[number];

/** Gốc chân cột (world). */
export const SIGNPOST_ANCHOR: [number, number, number] = [3, 10, -10];
export const SIGNPOST_SCALE = 2;

export type CameraPreset = {
  position: [number, number, number];
  target: [number, number, number];
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
