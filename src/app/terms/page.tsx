import { AppFrame } from "@/components/boat/AppFrame";
import { PageBackButton } from "@/components/boat/InformationNavigation";

const contact = "chung356833@gmail.com";

export default function TermsPage() {
  return <AppFrame><div className="mx-auto max-w-3xl lg:mr-6 lg:ml-auto"><PageBackButton /><article className="rounded-3xl border border-[#29465D] bg-[#071827] p-6 text-[#D7E4F6] sm:p-9">
    <h1 className="text-3xl font-black text-white">이용약관</h1>
    <p className="mt-3 text-sm leading-7">Blue Marina는 주식회사 로어아카이브가 제공하는 해양·낚시 정보 및 계정 서비스입니다. 시행일: 2026년 9월 28일.</p>
    <section className="mt-8"><h2 className="text-xl font-black text-white">서비스 이용</h2><p className="mt-3 text-sm leading-7">바다 정보, 낚시 포인트, 어종, 가이드 등 공개 정보는 참고용입니다. 계정에 로그인하면 프로필과 저장한 콘텐츠를 관리할 수 있습니다. 출조·마켓·커뮤니티의 실제 등록 및 거래 기능은 제공 상태에 따라 제한될 수 있으며, 표시되지 않은 예약·거래의 성립을 보장하지 않습니다.</p></section>
    <section className="mt-8"><h2 className="text-xl font-black text-white">안전과 책임</h2><p className="mt-3 text-sm leading-7">지도·내비게이션의 직선거리와 방향 표시는 안전 항로를 뜻하지 않습니다. 실제 항해에서는 최신 공식 정보, 현장 상황 및 적합한 항해 장비를 확인해야 합니다. 이용자는 타인의 권리를 침해하거나 불법적인 목적으로 서비스를 이용할 수 없습니다.</p></section>
    <section className="mt-8"><h2 className="text-xl font-black text-white">문의</h2><p className="mt-3 text-sm leading-7">서비스 및 계정에 관한 문의는 <a className="font-black text-[#79C9D6] underline" href={`mailto:${contact}`}>{contact}</a>로 보내주세요. 개인정보 처리에 관한 내용은 <a className="font-black text-[#79C9D6] underline" href="/privacy?from=%2Fterms">개인정보처리방침</a>에서 확인할 수 있습니다.</p></section>
  </article></div></AppFrame>;
}
