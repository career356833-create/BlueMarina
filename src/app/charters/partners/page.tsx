import Link from "next/link";
import type { Metadata } from "next";
import { Anchor, ArrowRight, FileSpreadsheet, ShieldCheck } from "lucide-react";
import { AppFrame } from "@/components/boat/AppFrame";
import { canonicalMetadata } from "@/lib/release/site-url";

export const metadata: Metadata = {
  ...canonicalMetadata("/charters/partners"),
  title: "출조업체 등록 | Blue Marina",
  description: "출조업체가 업체·선박·출항항·상품 정보를 제출하고 검토 절차를 확인하는 Blue Marina 파일럿 안내입니다."
};

const benefits = ["업체·선박·출항항 소개", "대상어종·가격·일정 안내", "전화 또는 공식 예약 링크 연결", "어종·바다 정보와 관련 맥락 연결"];
const required = ["업체명과 공개할 연락처", "선박명과 출항항", "출조상품명과 대상어종", "확인된 가격·일정(없으면 미정)", "공식 홈페이지·예약 링크 또는 정보 출처"];
const faqs = [
  ["등록 비용이 있나요?", "현재 확정·공개된 등록비 정책이 없습니다. 유료 조건은 정해지지 않았으며, 조건이 생기면 별도 안내 후 참여 여부를 확인합니다."],
  ["어떤 정보가 공개되나요?", "관리자 승인 후 업체·선박·출항항·상품 정보와 업체가 공개에 동의한 연락처 또는 예약 링크만 게시 후보가 됩니다."],
  ["가격과 일정은 필수인가요?", "확인된 값만 입력해 주세요. 없으면 비워 두며, 임의 가격·일정·잔여석은 만들지 않습니다."],
  ["공식 예약 링크를 연결할 수 있나요?", "업체가 제공한 HTTP(S) 공식 링크는 검토 후 연결할 수 있습니다. Blue Marina가 예약을 확정하지는 않습니다."],
  ["상품 수정은 어떻게 하나요?", "파일럿에서는 기존 제출 경로로 수정 내용을 다시 제출해 주세요. 자동 수정·실시간 동기화는 제공하지 않습니다."],
  ["승인까지 얼마나 걸리나요?", "현재 고정 처리 기한은 없습니다. 출처·업체 신원·공개 동의를 확인한 뒤 개별 검토합니다."],
  ["실시간 잔여석이 없으면 어떻게 표시되나요?", "확인되지 않은 좌석 수와 실시간 예약 가능 여부는 표시하지 않습니다."],
  ["업체 정보는 어떻게 검증하나요?", "제출 정보와 공식·공개 출처를 대조하고, 선박 등록 crosswalk와 충돌 여부를 관리자가 검토합니다. 자동 인증은 없습니다."],
  ["삭제 요청은 어떻게 하나요?", "제출에 사용한 경로로 게시 중단 또는 삭제 요청을 전달해 주세요. 요청자와 등록 업체의 관계를 확인한 후 처리합니다."]
] as const;

export default function CharterPartnersPage() {
  return <AppFrame><main className="mx-auto max-w-6xl px-4 py-8 text-white sm:px-6 sm:py-14">
    <p className="flex items-center gap-2 text-xs font-black tracking-[.18em] text-[#79C9D6]"><Anchor size={16} /> CHARTER PARTNER PILOT</p>
    <h1 className="mt-4 max-w-3xl text-4xl font-black leading-tight sm:text-6xl">Blue Marina 출조상품 등록</h1>
    <p className="mt-5 max-w-3xl text-base leading-8 text-[#B8CBDD]">출조업체가 직접 제공한 상품 정보를 검토하여 소개하고, 기존 전화·공식 예약 경로로 문의를 연결하는 파일럿입니다. 제출만으로 게시되거나 예약이 확정되지는 않습니다.</p>
    <div className="mt-7 flex flex-wrap gap-3">
      <Link href="/charters/onboarding" className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#2E8BFF] px-6 font-black text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">직접 등록 <ArrowRight size={17}/></Link>
      <Link href="/charters/partners/template.csv" className="inline-flex min-h-12 items-center gap-2 rounded-full border border-[#79C9D6] px-6 font-black text-[#AEE8EF] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"><FileSpreadsheet size={17}/> CSV 템플릿 받기</Link>
      <a href="#partner-inquiry" className="inline-flex min-h-12 items-center rounded-full border border-[#29465D] px-6 font-black text-[#D7E4F6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">제휴 문의 준비</a>
    </div>
    <p className="mt-4 text-sm text-[#AFC1D4]">현재 직접 제출은 로그인과 활성화된 공급 접수 백엔드가 필요합니다. 이용할 수 없는 경우 자료를 준비해 두세요. 운영 연락처는 아직 공개되지 않았습니다.</p>

    <div className="mt-14 grid gap-5 lg:grid-cols-2">
      <section className="rounded-3xl border border-[#29465D] bg-[#071827] p-6"><h2 className="text-2xl font-black">등록하면 소개할 수 있는 정보</h2><ul className="mt-5 space-y-3 text-[#B8CBDD]">{benefits.map(item => <li key={item} className="flex gap-3"><span aria-hidden="true" className="text-[#79C9D6]">•</span>{item}</li>)}</ul><p className="mt-5 text-sm text-[#9FB3C8]">승인된 정보만 게시 후보가 됩니다. 노출·문의·매출 증가는 보장하지 않습니다.</p></section>
      <section className="rounded-3xl border border-[#29465D] bg-[#071827] p-6"><h2 className="text-2xl font-black">준비할 자료</h2><ul className="mt-5 space-y-3 text-[#B8CBDD]">{required.map(item => <li key={item} className="flex gap-3"><span aria-hidden="true" className="text-[#79C9D6]">•</span>{item}</li>)}</ul><p className="mt-5 text-sm text-[#9FB3C8]">주민등록번호·개인 주소 등 불필요한 개인정보는 제출하지 마세요.</p></section>
    </div>

    <section className="mt-14"><h2 className="text-3xl font-black">등록 방법</h2><div className="mt-5 grid gap-4 md:grid-cols-3"><article className="rounded-2xl border border-[#29465D] p-5"><h3 className="font-black">1. 직접 입력</h3><p className="mt-2 text-sm leading-7 text-[#B8CBDD]">기존 출조 정보 등록 화면에서 업체·선박·출항항·상품을 입력합니다.</p></article><article className="rounded-2xl border border-[#29465D] p-5"><h3 className="font-black">2. CSV 작성</h3><p className="mt-2 text-sm leading-7 text-[#B8CBDD]">템플릿을 작성한 뒤 기존 등록 화면에서 로컬 검증을 실행합니다. Excel은 CSV로 저장해 사용합니다.</p></article><article className="rounded-2xl border border-[#29465D] p-5"><h3 className="font-black">3. 기존 홈페이지 정보</h3><p className="mt-2 text-sm leading-7 text-[#B8CBDD]">공식 페이지 URL을 출처로 제공하고, 실제 게시할 내용을 직접 확인해 제출합니다.</p></article></div></section>

    <section className="mt-14 rounded-3xl border border-[#29465D] bg-[#071827] p-6"><h2 className="flex items-center gap-2 text-2xl font-black"><ShieldCheck className="text-[#79C9D6]"/> 검토 후 게시</h2><p className="mt-4 text-[#B8CBDD]">제출 → 정보·출처 확인 → 관리자 승인 → 게시 후보 검토 순서입니다. 업체 동의, 신원, 연락 경로, 중요 충돌을 확인하며 자동 게시는 하지 않습니다.</p><p className="mt-3 text-sm text-[#9FB3C8]">현재 승인된 출조상품과 운영 중인 공개 상품은 없습니다. 아래는 절차 안내이며 실제 상품 미리보기가 아닙니다.</p></section>

    <section id="partner-inquiry" className="mt-14 scroll-mt-8 rounded-3xl border border-[#29465D] p-6"><h2 className="text-2xl font-black">제휴 문의 준비</h2><p className="mt-3 leading-7 text-[#B8CBDD]">업체명, 공개할 연락처, 선박·출항항, 상품명, 공식 홈페이지를 정리해 주세요. 현재 별도 제휴 연락처가 설정되지 않아 이 페이지에서는 문의를 전송하지 않습니다. 접수 경로가 활성화되면 기존 직접 등록 화면을 이용할 수 있습니다.</p><Link href="/charters/onboarding" className="mt-4 inline-flex min-h-11 items-center font-bold text-[#AEE8EF] underline underline-offset-4">기존 등록 화면으로 이동</Link></section>

    <section className="mt-14"><h2 className="text-3xl font-black">자주 묻는 질문</h2><div className="mt-5 space-y-3">{faqs.map(([question, answer]) => <details key={question} className="rounded-2xl border border-[#29465D] bg-[#071827] p-5"><summary className="cursor-pointer font-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">{question}</summary><p className="mt-3 text-sm leading-7 text-[#B8CBDD]">{answer}</p></details>)}</div></section>
  </main></AppFrame>;
}
