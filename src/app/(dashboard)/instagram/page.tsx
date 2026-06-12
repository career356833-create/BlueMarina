import { ContentStudio } from "@/components/content/content-studio";

export default function InstagramPage() {
  return (
    <ContentStudio
      type="instagram"
      description="짧은 소개문과 자동 해시태그를 포함한 인스타그램 게시글을 생성합니다."
      placeholders={["숲체험", "요리활동", "생일파티"]}
    />
  );
}
