import { ContentStudio } from "@/components/content/content-studio";

export default function BlogPage() {
  return (
    <ContentStudio
      type="blog"
      description="검색 노출을 고려한 SEO 구조의 블로그 홍보글을 생성합니다."
      placeholders={["어린이집 프로그램", "놀이중심교육", "체험활동"]}
    />
  );
}
