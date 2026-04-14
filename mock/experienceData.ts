export type ExperienceMilestone = {
  id: string;
  period: string;
  title: string;
  company: string;
  summary: string;
  skills: string[];
};

export const EXPERIENCE_SECTION = {
  title: "Kinh nghiệm",
  body: "Mỗi cột mốc là một chặng trên hành trình đi lên đỉnh đảo, thể hiện quá trình học và làm dự án thực tế.",
};

export const EXPERIENCE_MILESTONES: ExperienceMilestone[] = [
  {
    id: "intern-front-end",
    period: "2021",
    title: "Front-end Intern",
    company: "Studio nội bộ",
    summary: "Làm landing page và dashboard cơ bản, tập trung chuẩn hóa component và responsive layout.",
    skills: ["HTML/CSS", "React", "Figma handoff"],
  },
  {
    id: "junior-fullstack",
    period: "2022 - 2023",
    title: "Junior Full-stack Developer",
    company: "Product Team",
    summary: "Phát triển module quản lý công việc, xử lý API và cải thiện trải nghiệm sử dụng trên mobile.",
    skills: ["Next.js", "Node.js", "PostgreSQL"],
  },
  {
    id: "mid-level-3d",
    period: "2024 - Nay",
    title: "Frontend Developer (3D/Interactive)",
    company: "Freelance",
    summary: "Xây dựng portfolio 3D tương tác, tối ưu performance scene và đồng bộ motion với điều hướng.",
    skills: ["Three.js", "React Three Fiber", "Framer Motion"],
  },
];
