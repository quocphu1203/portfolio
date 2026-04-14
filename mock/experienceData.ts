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
    id: "intern",
    period: "2024-Nay",
    title: "Project Leader",
    company: "GLD-LAB",
    summary: "Phát triển và quản lý dự án, tối ưu hóa hiệu suất và đảm bảo chất lượng.",
    skills: ["Next.js", "React Native", "Node.js", "PostgreSQL"],
  },
];
