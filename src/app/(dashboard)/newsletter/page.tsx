import { ContentStudio } from "@/components/content/content-studio";

export default function NewsletterPage() {
  return (
    <ContentStudio
      type="newsletter"
      description="행사안내, 준비물, 주의사항을 포함한 가정통신문 초안을 생성합니다."
      placeholders={["소풍", "준비물", "안전교육"]}
    />
  );
}
