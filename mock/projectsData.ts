export type ProjectBirdItem = {
  id: string;
  name: string;
  description: string;
  github?: string;
};

export const PROJECTS_SECTION = {
  title: "Project",
  body: "Những dự án tiêu biểu mình đã thực hiện, tập trung vào trải nghiệm người dùng, tư duy hệ thống và khả năng triển khai sản phẩm từ ý tưởng đến phiên bản có thể vận hành thực tế.",
  links: [
    { label: "GitHub", href: "https://github.com/quocphu1203" },
    { label: "Live demo", href: "#" },
  ],
};

export const PROJECT_BIRD_ITEMS: ProjectBirdItem[] = [
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
];
