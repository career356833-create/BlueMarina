import { DetailUnavailable } from "@/components/platform/PageFamilies";

export default function MarketNotFound() {
  return <DetailUnavailable title="공개된 상품을 찾을 수 없습니다" description="요청한 상품은 현재 운영 마켓에 공개되지 않았습니다. 거래 가능 여부를 추정하지 않습니다." href="/market" action="마켓으로" />;
}
