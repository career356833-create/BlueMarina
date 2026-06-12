import { ContentStudio } from "@/components/content/content-studio";

export default function HomepagePage() {
  return (
    <ContentStudio
      type="homepage"
      description="기관 홈페이지에 바로 올릴 수 있는 제목과 본문을 생성합니다."
      placeholders={["오감놀이", "생태활동", "시장놀이"]}
    />
  );
}
