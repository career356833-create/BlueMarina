import { DetailUnavailable } from "@/components/platform/PageFamilies";

export default function CharterNotFound() {
  return <DetailUnavailable title="확인된 출조상품이 없습니다" description="요청한 상품은 현재 공개 목록에 없습니다. 가격·일정·잔여석을 임의로 표시하지 않습니다." href="/charters" action="출조 목록으로" />;
}
