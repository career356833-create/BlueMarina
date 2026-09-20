import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Mail, PackageSearch, Phone, ShieldAlert } from "lucide-react";
import { AppFrame } from "@/components/boat/AppFrame";
import { getMarketListing } from "@/lib/market/registry";
import { categoryLabels, conditionLabels, formatMarketPrice, safeExternalHref, transactionLabels } from "@/lib/market/route-helpers";

export default async function MarketListingDetail({ params }: { params: Promise<{ id: string }> }) {
  const listing = getMarketListing((await params).id);
  if (!listing || listing.status !== "ACTIVE") notFound();
  const externalHref = listing.contact?.contactType === "EXTERNAL_LINK" ? safeExternalHref(listing.contact.destination) : null;
  return <AppFrame><article className="mx-auto max-w-5xl py-5 sm:py-10">
    <Link href="/market" className="inline-flex min-h-11 items-center gap-2 text-sm font-black text-[#AEE8EF]"><ArrowLeft size={17}/>마켓으로</Link>
    <div className="mt-4 grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
      <div className="overflow-hidden rounded-[28px] border border-[#1F3A50] bg-[#071827]">
        <div role="img" aria-label={listing.images[0]?.alt ?? `${listing.title} 이미지 없음`} className="aspect-[4/3] bg-[#0C2638] bg-cover bg-center" style={listing.images[0] ? {backgroundImage:`url(${listing.images[0].url})`} : undefined}>{listing.images.length ? null : <div className="flex h-full flex-col items-center justify-center gap-3 text-[#7890A5]"><PackageSearch size={44}/><span className="text-sm font-bold">등록된 이미지가 없습니다</span></div>}</div>
      </div>
      <div className="min-w-0 rounded-[28px] border border-[#1F3A50] bg-[#071827] p-6 sm:p-8"><p className="text-xs font-black tracking-[.15em] text-[#79C9D6]">{categoryLabels[listing.category]}</p><h1 className="mt-3 break-words text-3xl font-black">{listing.title}</h1><p className="mt-5 break-words text-2xl font-black text-[#F1D29C]">{formatMarketPrice(listing)}</p><dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2"><div><dt className="text-[#7890A5]">상태</dt><dd className="mt-1 font-black">{conditionLabels[listing.condition]}</dd></div><div><dt className="text-[#7890A5]">지역</dt><dd className="mt-1 font-black">{listing.region.province}{listing.region.district ? ` ${listing.region.district}` : ""}</dd></div><div className="sm:col-span-2"><dt className="text-[#7890A5]">거래 방식</dt><dd className="mt-1 flex flex-wrap gap-2 font-black">{listing.transactionMethods.map((method)=><span key={method}>{transactionLabels[method]}</span>)}</dd></div></dl>
        <div className="mt-7 border-t border-[#1F3A50] pt-6"><h2 className="font-black">판매자 문의</h2>{!listing.contact || !listing.contact.destination ? <p className="mt-3 text-sm font-bold text-[#9FB3C8]">문의 정보 없음</p> : listing.contact.contactType === "PHONE" ? <a href={`tel:${listing.contact.destination}`} className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-full border border-[#79C9D6]/50 px-5 text-sm font-black"><Phone size={17}/>전화 문의 준비</a> : listing.contact.contactType === "EMAIL" ? <a href={`mailto:${listing.contact.destination}`} className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-full border border-[#79C9D6]/50 px-5 text-sm font-black"><Mail size={17}/>이메일 문의 준비</a> : externalHref ? <a href={externalHref} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-full border border-[#79C9D6]/50 px-5 text-sm font-black">외부 문의 열기 <ExternalLink size={16}/></a> : <p className="mt-3 text-sm font-bold text-[#9FB3C8]">문의 정보 없음</p>}</div>
      </div>
    </div>
    <section className="mt-6 rounded-[28px] border border-[#1F3A50] bg-[#071827] p-6 sm:p-8"><h2 className="text-xl font-black">상품 설명</h2><p className="mt-4 whitespace-pre-wrap break-words text-sm font-semibold leading-7 text-[#B8CBDD]">{listing.description}</p></section>
    <section className="mt-6 flex gap-3 rounded-[22px] border border-amber-300/25 bg-amber-300/8 p-5"><ShieldAlert className="mt-0.5 shrink-0 text-amber-200" size={20}/><div><h2 className="font-black text-amber-100">거래 전 직접 확인하세요</h2><p className="mt-2 text-sm font-semibold leading-6 text-amber-50/80">판매자 설명은 안전성, 정품, 설치 적합성 또는 작동 상태를 보증하지 않습니다. 구명·통신·항법·엔진·배터리·연료 장비는 전문가 점검과 관련 규정을 확인하세요. Blue Marina는 결제와 거래 완료를 처리하지 않습니다.</p></div></section>
  </article></AppFrame>;
}
