import { ContentStudio } from "@/components/content/content-studio";

export default function NoticePage() {
  return (
    <ContentStudio
      type="notice"
      description="보호자가 바로 읽기 좋은 자연스러운 알림장 문안을 생성합니다."
      placeholders={["물놀이", "체육활동", "미술활동"]}
    />
  );
}
