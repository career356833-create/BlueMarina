import { FishingConditionClient } from "./fishing-condition-client";

export const metadata = {
  title: "Fishing Condition | Blue Marina",
  description: "공식 해양환경과 계절성 근거를 선택해 확인합니다.",
};

export default function FishingConditionPage() {
  return <FishingConditionClient />;
}
