import { DetailFrame } from "@/components/platform/PageFamilies";
import { PageBackButton } from "@/components/boat/InformationNavigation";

const contact = "chung356833@gmail.com";

export default function PrivacyPage() {
  return <DetailFrame width="reading"><div className="mx-auto max-w-3xl"><PageBackButton /><article className="bm-detail-section mt-5 p-6 sm:p-9">
    <h1 className="text-3xl font-black text-white">개인정보처리방침</h1>
    <p className="mt-3 text-sm leading-7">주식회사 로어아카이브는 Blue Marina의 계정과 서비스 제공에 필요한 개인정보를 아래와 같이 처리합니다. 시행일: 2026년 9월 28일.</p>

    <section className="mt-8"><h2 className="text-xl font-black text-white">처리 목적과 항목</h2>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-7">
        <li>이메일 가입·로그인: 이메일 주소와 비밀번호 인증 정보. 비밀번호 인증은 Supabase Auth에서 처리합니다.</li>
        <li>소셜 로그인: Google 또는 Kakao의 계정 식별자와 제공에 동의한 계정 정보. Kakao의 이메일·닉네임·프로필 사진은 모두 선택 동의 항목이며, 동의하지 않아도 Kakao 로그인을 완료할 수 있습니다.</li>
        <li>계정 기능: 이용자가 직접 입력한 표시 이름·아바타 URL·활동 지역·소개와 저장한 낚시 포인트·어종·출조·마켓 항목을 계정별로 보관합니다.</li>
        <li>기기 내 기능: 최근 본 콘텐츠와 일부 작성 초안은 이용 중인 브라우저에 저장됩니다. 이 기록은 계정의 서버 저장 항목과 구분됩니다.</li>
      </ul>
    </section>

    <section className="mt-8"><h2 className="text-xl font-black text-white">서비스 운영 단계 관측</h2>
      <p className="mt-3 text-sm leading-7">주요 진입 화면, 카카오 로그인 시작·완료, 작성 시작, 저장·제출 성공과 관리자 승인·공개 단계를 제한적으로 기록합니다. 이벤트 종류·시각·서비스 분류, 로그인한 경우 계정 식별자, 필요한 콘텐츠 식별자와 허용 목록으로 정제한 유입 분류를 사용합니다. 로그인 전후의 같은 방문 흐름은 30분 만료의 무작위 자사 쿠키로 구분하며, 다른 사이트의 광고 추적에 사용하지 않습니다. 운영 화면에는 집계만 표시합니다. 이 이벤트에는 이메일·전화번호·비밀번호·인증 토큰·정확한 위치·원본 IP·User-Agent·전체 유입 URL·작성 내용을 저장하지 않습니다. 이벤트 저장소도 아래 Supabase 환경을 사용하며, 삭제 관련 문의는 아래 연락처로 접수할 수 있습니다.</p>
    </section>

    <section className="mt-8"><h2 className="text-xl font-black text-white">보유 및 삭제</h2>
      <p className="mt-3 text-sm leading-7">계정 프로필과 저장 항목은 계정 유지 기간 동안 보유합니다. 탈퇴·삭제 요청은 아래 이메일로 접수하며, 본인 확인 후 삭제합니다. 법령상 보존 의무가 있는 정보는 해당 기간 동안 분리하여 보관합니다. 기기 내 기록은 브라우저 저장소를 삭제하면 제거할 수 있습니다.</p>
    </section>

    <section className="mt-8"><h2 className="text-xl font-black text-white">외부 서비스와 국외 처리</h2>
      <p className="mt-3 text-sm leading-7">계정 인증과 계정 데이터 저장에는 Supabase 서비스를 사용합니다. 현재 연결된 프로젝트의 주 저장 지역은 일본 도쿄(ap-northeast-1)이며, 호스팅 인프라 제공자는 Amazon Web Services, Inc.입니다. 소셜 로그인을 선택하면 해당 로그인 제공자와 Supabase 사이에 인증에 필요한 식별 정보 및 이용자가 제공에 동의한 정보가 전달됩니다. 서비스 웹사이트는 Vercel을 통해 제공됩니다.</p>
    </section>

    <section className="mt-8"><h2 className="text-xl font-black text-white">이용자 권리와 문의</h2>
      <p className="mt-3 text-sm leading-7">계정의 프로필은 계정 화면에서 확인·수정할 수 있습니다. 개인정보 열람·정정·삭제와 계정 탈퇴는 <a className="font-black text-[#79C9D6] underline" href={`mailto:${contact}`}>{contact}</a>로 요청할 수 있습니다. 요청자의 계정 소유 여부를 확인한 뒤 처리합니다.</p>
    </section>
  </article></div></DetailFrame>;
}
