import { DetailUnavailable } from "@/components/platform/PageFamilies";

export default function CommunityNotFound() {
  return <DetailUnavailable title="게시물을 찾을 수 없습니다" description="요청한 게시물은 현재 공개 피드에 없습니다." href="/community" action="커뮤니티로" />;
}
