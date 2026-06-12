import { ContentStudio } from "@/components/content/content-studio";

export default function NoticePage() {
  return (
    <ContentStudio
      type="notice"
      description="오늘의 활동, 아이들의 반응, 가정 연계 문장을 자동으로 구성합니다."
      placeholders={["물놀이", "체육활동", "미술활동"]}
    />
  );
}
