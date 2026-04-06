export type ProjectBirdItem = {
  id: string;
  name: string;
  description: string;
  github?: string;
};

export const PROJECTS_SECTION = {
  title: "Project",
  body: "Các dự án web, 3D và công cụ bạn đã làm. Thay nội dung này bằng mô tả thật và thêm link demo hoặc repo bên dưới.",
  links: [
    { label: "GitHub", href: "https://github.com" },
    { label: "Live demo", href: "#" },
  ],
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
