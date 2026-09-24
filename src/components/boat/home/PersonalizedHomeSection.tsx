"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Bookmark, Fish, History, MessageCircle, ShoppingBag, UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ACCOUNT_RECENT_STORAGE_KEY, parseRecentItems, type RecentItem } from "@/lib/account/recent";
import type { AccountReadModel } from "@/lib/account/types";
import { getCharter } from "@/lib/charters/registry";
import { formatViewedAt, getRecentHighlights, getSavedHighlights } from "@/lib/home/personalization";

type PersonalizationState = "loading" | "signed-out" | "ready" | "limited" | "expired";

const typeLabels: Record<RecentItem["entityType"], string> = {
  FISHING_SPOT: "낚시 포인트",
  FISH: "어종",
  CHARTER: "출조",
  MARKET_LISTING: "마켓",
  COMMUNITY_POST: "커뮤니티",
};

function localCommunityDraftCount() {
  let count = 0;
  try {
    for (let index = 0; index < window.localStorage.length; index += 1) {
      if (window.localStorage.key(index)?.startsWith("blue-marina:community-local-")) count += 1;
    }
  } catch {
    return 0;
  }
  return count;
}

export function PersonalizedHomeSection() {
  const [state, setState] = useState<PersonalizationState>("loading");
  const [recent, setRecent] = useState<RecentItem[]>([]);
  const [model, setModel] = useState<AccountReadModel | null>(null);
  const [communityDrafts, setCommunityDrafts] = useState(0);

  const loadAccount = useCallback(async (token: string) => {
    try {
      const response = await fetch("/api/account", { headers: { authorization: `Bearer ${token}` }, cache: "no-store" });
      if (response.ok) {
        setModel(await response.json() as AccountReadModel);
        setState("ready");
      } else if (response.status === 401) {
        setState("expired");
      } else {
        setState("limited");
      }
    } catch {
      setState("limited");
    }
  }, []);

  useEffect(() => {
    try {
      setRecent(parseRecentItems(window.localStorage.getItem(ACCOUNT_RECENT_STORAGE_KEY)));
    } catch {
      setRecent([]);
    }
    setCommunityDrafts(localCommunityDraftCount());

    const preview = process.env.NODE_ENV === "development" && new URLSearchParams(window.location.search).get("preview") === "authenticated";
    if (preview) {
      setState("limited");
      return;
    }
    const client = createClient();
    if (!client) {
      setState("signed-out");
      return;
    }
    client.auth.getSession().then(({ data, error }) => {
      if (error || !data.session) {
        setState(error ? "expired" : "signed-out");
        return;
      }
      void loadAccount(data.session.access_token);
    });
  }, [loadAccount]);

  const highlights = useMemo(() => getRecentHighlights(recent), [recent]);
  const savedGroups = useMemo(() => getSavedHighlights(model?.savedItems ?? []).map((group) => group.type === "CHARTER" ? { ...group, items: group.items.filter((item) => Boolean(getCharter(item.entityId))) } : group).filter((group) => group.items.length > 0), [model?.savedItems]);
  const unavailableSavedCharter = (model?.savedItems ?? []).some((item) => item.entityType === "CHARTER" && !getCharter(item.entityId));
  const marketActivity = model?.marketActivity ?? [];
  const hasActivity = marketActivity.length > 0 || communityDrafts > 0;

  if (state === "loading" || state === "signed-out" || state === "expired") return null;

  const displayName = model?.profile.displayName?.trim();
  const hasPersonalContent = highlights.length > 0 || savedGroups.length > 0 || unavailableSavedCharter || hasActivity;

  return <section className="border-b border-white/10 bg-[#06131d]" aria-labelledby="personalized-home-title">
    <div className="mx-auto w-full max-w-[1540px] px-5 py-8 sm:px-8 lg:px-12 lg:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold tracking-[.26em] text-[#79C9D6]">MY BLUE MARINA</p>
          <h2 id="personalized-home-title" className="mt-2 text-2xl font-black text-white sm:text-3xl">{displayName ? `${displayName}님, 이어서 둘러보세요` : "이어서 둘러보세요"}</h2>
        </div>
        <Link href="/account" aria-label="내 계정 열기" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#315064] px-4 text-sm font-black text-[#D7F4F7] transition hover:border-[#79C9D6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#79C9D6]"><UserRound size={16} />내 계정<ArrowRight size={15} /></Link>
      </div>

      {state === "limited" ? <p role="status" className="mt-4 max-w-3xl rounded-2xl border border-amber-300/25 bg-amber-300/5 px-4 py-3 text-sm font-semibold leading-6 text-amber-100">계정 서버 연결이 제한되어 저장 항목과 서버 활동은 표시하지 않습니다. 이 기기에 남아 있는 최근 본 콘텐츠만 사용할 수 있습니다.</p> : null}

      {highlights.length ? <section className="mt-6" aria-labelledby="home-recent-title"><SectionHeading id="home-recent-title" icon={History} title="최근 본 콘텐츠" detail="이 기기에 저장됨" /><div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{highlights.map((item) => <Link key={`${item.entityType}:${item.entityId}`} href={item.href} className="group min-h-24 rounded-2xl border border-[#1F3A50] bg-[#071827] p-4 transition hover:border-[#39718d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#79C9D6]"><p className="text-[11px] font-black text-[#79C9D6]">{typeLabels[item.entityType]}</p><p className="mt-2 truncate font-black text-white group-hover:text-[#F1D29C]">{item.label}</p><p className="mt-2 text-xs font-semibold text-[#8FA7BC]">{formatViewedAt(item.viewedAt)} 본 콘텐츠</p></Link>)}</div></section> : null}

      {state === "ready" && (savedGroups.length || unavailableSavedCharter) ? <section className="mt-7" aria-labelledby="home-saved-title"><div className="flex flex-wrap items-center justify-between gap-3"><SectionHeading id="home-saved-title" icon={Bookmark} title="저장한 콘텐츠" detail="내 계정에 저장됨" /><Link href="/account/saved" className="inline-flex min-h-11 items-center gap-2 text-sm font-black text-[#AEE8EF] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#79C9D6]">전체보기 <ArrowRight size={15} /></Link></div>{unavailableSavedCharter ? <p role="status" className="mt-3 text-sm font-semibold leading-6 text-[#9FB3C8]">저장한 출조 중 현재 공개 정보를 확인할 수 없는 항목은 열기 링크를 표시하지 않습니다.</p> : null}<div className="mt-3 grid gap-3 lg:grid-cols-2">{savedGroups.map((group) => <article key={group.type} className="rounded-2xl border border-[#1F3A50] bg-[#071827] p-4"><h3 className="text-sm font-black text-[#D7E4F6]">{group.title}</h3><div className="mt-3 space-y-2">{group.items.map((item) => <Link key={item.id} href={item.href!} className="flex min-h-11 items-center justify-between gap-3 border-t border-[#1F3A50] pt-2 text-sm font-bold text-white first:border-t-0 first:pt-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#79C9D6]"><span className="min-w-0"><span className="block truncate">{item.label ?? item.entityId}</span>{item.entityType === "FISH" ? <span className="mt-0.5 block truncate text-[11px] font-semibold text-[#8FA7BC]">{item.entityId}</span> : null}</span><ArrowRight size={15} className="shrink-0 text-[#79C9D6]" /></Link>)}</div></article>)}</div></section> : null}

      {state === "ready" && hasActivity ? <section className="mt-7" aria-labelledby="home-activity-title"><SectionHeading id="home-activity-title" icon={MessageCircle} title="내 활동" detail="본인 활동만 표시" /><div className="mt-3 grid gap-3 sm:grid-cols-2">{marketActivity.length ? <ActivityCard icon={ShoppingBag} title="내 마켓 등록" detail={`${marketActivity.length}개 항목`} href="/account/activity" /> : null}{communityDrafts ? <ActivityCard icon={MessageCircle} title="내 커뮤니티 작성" detail={`이 기기에 저장된 작성 항목 ${communityDrafts}개`} href="/account/activity" /> : null}</div></section> : null}

      {!hasPersonalContent ? <section className="mt-6 rounded-[24px] border border-dashed border-[#315064] bg-[#071827] p-5 sm:p-6" aria-labelledby="home-personal-empty-title"><h3 id="home-personal-empty-title" className="text-lg font-black">나만의 바다 활동을 시작해 보세요</h3><p className="mt-2 text-sm font-semibold leading-6 text-[#9FB3C8]">최근 본 콘텐츠와 내 계정에 저장한 항목만 여기에 짧게 모아 보여드립니다.</p><div className="mt-4 flex flex-wrap gap-3"><CompactLink href="/fishing-spots" label="낚시 포인트 둘러보기" /><CompactLink href="/fish" label="관심 어종 저장하기" /><CompactLink href="/charters" label="출조 찾기" /></div></section> : null}
    </div>
  </section>;
}

function SectionHeading({ id, icon: Icon, title, detail }: { id: string; icon: typeof History; title: string; detail: string }) {
  return <div className="flex items-center gap-2"><Icon size={18} className="text-[#79C9D6]" aria-hidden="true" /><h3 id={id} className="font-black text-white">{title}</h3><span className="text-xs font-semibold text-[#8FA7BC]">{detail}</span></div>;
}

function ActivityCard({ icon: Icon, title, detail, href }: { icon: typeof Fish; title: string; detail: string; href: string }) {
  return <Link href={href} className="flex min-h-20 items-center justify-between gap-3 rounded-2xl border border-[#1F3A50] bg-[#071827] p-4 transition hover:border-[#39718d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#79C9D6]"><span className="flex min-w-0 items-center gap-3"><Icon size={19} className="shrink-0 text-[#79C9D6]" /><span className="min-w-0"><span className="block font-black text-white">{title}</span><span className="mt-1 block truncate text-xs font-semibold text-[#9FB3C8]">{detail}</span></span></span><ArrowRight size={16} className="shrink-0 text-[#79C9D6]" /></Link>;
}

function CompactLink({ href, label }: { href: string; label: string }) {
  return <Link href={href} className="inline-flex min-h-11 items-center rounded-full border border-[#315064] px-4 text-sm font-black text-[#D7F4F7] transition hover:border-[#79C9D6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#79C9D6]">{label}</Link>;
}
