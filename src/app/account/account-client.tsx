"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Bookmark, Fish, History, LogOut, MapPin, Pencil, Ship, ShoppingBag, UserRound } from "lucide-react";
import { createClient, hasSupabaseEnv } from "@/lib/supabase/client";
import { ACCOUNT_RECENT_STORAGE_KEY, parseRecentItems, type RecentItem } from "@/lib/account/recent";
import type { AccountReadModel, SavedItem } from "@/lib/account/types";

type Section = "overview" | "profile" | "saved" | "activity";
type AuthState = "loading" | "signed-out" | "signed-in" | "expired";

const tabs = [
  ["overview", "/account", "계정 홈", UserRound],
  ["profile", "/account/profile", "프로필", Pencil],
  ["saved", "/account/saved", "저장한 콘텐츠", Bookmark],
  ["activity", "/account/activity", "내 활동", History],
] as const;

const entityLabels: Record<SavedItem["entityType"], string> = { FISHING_SPOT: "낚시 포인트", FISH: "어종", CHARTER: "출조", MARKET_LISTING: "마켓" };
const inputClass = "min-h-11 w-full rounded-xl border border-[#29465D] bg-[#0A2031] px-3 py-2 text-sm font-semibold text-white outline-none focus:border-[#79C9D6] disabled:opacity-60";

export function AccountClient({ section, previewAuthenticated = false }: { section: Section; previewAuthenticated?: boolean }) {
  const [authState, setAuthState] = useState<AuthState>("loading");
  const [token, setToken] = useState<string | null>(null);
  const [model, setModel] = useState<AccountReadModel | null>(null);
  const [backendMessage, setBackendMessage] = useState<string | null>(null);
  const [recent, setRecent] = useState<RecentItem[]>([]);
  const [localCommunityDrafts, setLocalCommunityDrafts] = useState<string[]>([]);

  const load = useCallback(async (accessToken: string) => {
    const response = await fetch("/api/account", { headers: { authorization: `Bearer ${accessToken}` }, cache: "no-store" });
    if (response.ok) { setModel(await response.json()); setBackendMessage(null); return; }
    if (response.status === 401) { setAuthState("expired"); setToken(null); return; }
    setBackendMessage(response.status === 503 ? "계정 서버가 아직 활성화되지 않았습니다. 저장 데이터는 표시하거나 변경하지 않습니다." : "계정 정보를 불러오지 못했습니다.");
  }, []);

  useEffect(() => {
    setRecent(parseRecentItems(window.localStorage.getItem(ACCOUNT_RECENT_STORAGE_KEY)));
    const drafts: string[] = [];
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (key?.startsWith("blue-marina:community-local-")) drafts.push(key);
    }
    setLocalCommunityDrafts(drafts);
    if (previewAuthenticated) {
      setAuthState("signed-in");
      setBackendMessage("개발 환경의 인증 화면 미리보기입니다. 서버 데이터 조회·저장과 실제 인증은 수행하지 않습니다.");
      return;
    }
    const client = createClient();
    if (!client) { setAuthState("signed-out"); return; }
    client.auth.getSession().then(({ data, error }) => {
      if (error) { setAuthState("expired"); return; }
      if (!data.session) { setAuthState("signed-out"); return; }
      setAuthState("signed-in"); setToken(data.session.access_token); void load(data.session.access_token);
    });
    const { data: listener } = client.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || !session) { setAuthState("signed-out"); setToken(null); setModel(null); }
    });
    return () => listener.subscription.unsubscribe();
  }, [load, previewAuthenticated]);

  async function signOut() {
    const client = createClient();
    await client?.auth.signOut();
    setModel(null); setToken(null); setAuthState("signed-out");
  }

  if (authState === "loading") return <AccountFrame section={section}><StateCard title="계정 확인 중" body="현재 로그인 상태를 안전하게 확인하고 있습니다." /></AccountFrame>;
  if (authState === "signed-out" || authState === "expired") return <AccountFrame section={section}><StateCard title={authState === "expired" ? "세션이 만료되었습니다" : "로그인이 필요합니다"} body={hasSupabaseEnv() ? "Blue Marina 계정으로 로그인하면 저장한 포인트와 내 활동을 한곳에서 확인할 수 있습니다." : "현재 환경에 인증 설정이 없어 로그인할 수 없습니다."}><Link href="/account/login" className="mt-5 inline-flex min-h-11 items-center rounded-full bg-[#2E8BFF] px-5 text-sm font-black text-white">로그인</Link></StateCard></AccountFrame>;

  return <AccountFrame section={section} onSignOut={signOut}>
    {backendMessage ? <div role="status" className="mb-5 rounded-2xl border border-amber-300/30 bg-amber-300/8 p-4 text-sm font-bold text-amber-100">{backendMessage}</div> : null}
    {section === "profile" ? <ProfilePanel model={model} token={token} onReload={load} /> : null}
    {section === "saved" ? <SavedPanel items={model?.savedItems ?? []} token={token} onReload={load} /> : null}
    {section === "activity" ? <ActivityPanel model={model} recent={recent} localCommunityDrafts={localCommunityDrafts} /> : null}
    {section === "overview" ? <Overview model={model} recent={recent} /> : null}
  </AccountFrame>;
}

function AccountFrame({ section, children, onSignOut }: { section: Section; children: React.ReactNode; onSignOut?: () => void }) {
  return <div className="mx-auto w-full max-w-5xl py-4 sm:py-8">
    <header className="rounded-[28px] border border-[#1F3A50] bg-[linear-gradient(135deg,#102C46,#071827)] p-6 sm:p-8"><p className="text-xs font-black tracking-[.2em] text-[#79C9D6]">BLUE MARINA ACCOUNT</p><div className="mt-3 flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-3xl font-black sm:text-5xl">나의 바다 활동</h1><p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-[#B8CBDD]">저장한 포인트와 어종, 내 등록 활동, 최근 본 콘텐츠를 계정 기준으로 관리합니다.</p></div>{onSignOut ? <button onClick={onSignOut} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#29465D] px-4 text-sm font-black"><LogOut size={16}/>로그아웃</button> : null}</div></header>
    <nav aria-label="계정 메뉴" className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">{tabs.map(([id, href, label, Icon]) => <Link key={id} href={href} aria-current={section === id ? "page" : undefined} className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border px-3 text-sm font-black ${section === id ? "border-[#79C9D6] bg-[#123347] text-white" : "border-[#1F3A50] bg-[#071827] text-[#9FB3C8]"}`}><Icon size={17}/>{label}</Link>)}</nav>
    <div className="mt-5">{children}</div>
  </div>;
}

function StateCard({ title, body, children }: { title: string; body: string; children?: React.ReactNode }) { return <section className="rounded-[24px] border border-[#1F3A50] bg-[#071827] p-6 sm:p-8"><h2 className="text-xl font-black">{title}</h2><p className="mt-2 text-sm font-semibold leading-6 text-[#9FB3C8]">{body}</p>{children}</section>; }

function Overview({ model, recent }: { model: AccountReadModel | null; recent: RecentItem[] }) {
  const cards = [["저장한 콘텐츠", model?.savedItems.length ?? 0, Bookmark], ["마켓 활동", model?.marketActivity.length ?? 0, ShoppingBag], ["최근 본 항목", recent.length, History]] as const;
  return <div className="grid gap-4 sm:grid-cols-3">{cards.map(([label, count, Icon]) => <div key={label} className="rounded-[24px] border border-[#1F3A50] bg-[#071827] p-5"><Icon className="text-[#79C9D6]"/><p className="mt-5 text-3xl font-black">{count}</p><p className="mt-1 text-sm font-bold text-[#9FB3C8]">{label}</p></div>)}</div>;
}

function ProfilePanel({ model, token, onReload }: { model: AccountReadModel | null; token: string | null; onReload: (token: string) => Promise<void> }) {
  const profile = model?.profile;
  const [message, setMessage] = useState<string | null>(null);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!token) return;
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/account", { method: "PATCH", headers: { "content-type": "application/json", authorization: `Bearer ${token}` }, body: JSON.stringify({ displayName: data.get("displayName"), avatarUrl: data.get("avatarUrl"), region: data.get("region"), bio: data.get("bio") }) });
    setMessage(response.ok ? "프로필을 저장했습니다." : "프로필을 저장하지 못했습니다.");
    if (response.ok) await onReload(token);
  }
  return <form onSubmit={submit} className="rounded-[24px] border border-[#1F3A50] bg-[#071827] p-5 sm:p-7"><h2 className="text-xl font-black">프로필</h2><p className="mt-1 text-sm text-[#8FA7BC]">이메일은 로그인 계정에서 읽으며 여기서 변경하지 않습니다.</p><div className="mt-5 grid gap-4 sm:grid-cols-2"><Field label="이메일"><input disabled value={profile?.email ?? ""} className={inputClass} /></Field><Field label="표시 이름"><input name="displayName" maxLength={50} defaultValue={profile?.displayName ?? ""} className={inputClass} /></Field><Field label="활동 지역"><input name="region" maxLength={80} defaultValue={profile?.region ?? ""} className={inputClass} /></Field><Field label="아바타 URL"><input name="avatarUrl" type="url" maxLength={500} defaultValue={profile?.avatarUrl ?? ""} className={inputClass} /></Field><Field label="소개" wide><textarea name="bio" maxLength={300} defaultValue={profile?.bio ?? ""} className={`${inputClass} min-h-28 resize-y`} /></Field></div><div className="mt-5 flex items-center gap-3"><button className="min-h-11 rounded-full bg-[#2E8BFF] px-5 text-sm font-black">프로필 저장</button>{message ? <p role="status" className="text-sm font-bold text-[#AEE8EF]">{message}</p> : null}</div></form>;
}

function Field({ label, wide, children }: { label: string; wide?: boolean; children: React.ReactNode }) { return <label className={wide ? "sm:col-span-2" : ""}><span className="mb-2 block text-xs font-black text-[#9FB3C8]">{label}</span>{children}</label>; }

function SavedPanel({ items, token, onReload }: { items: SavedItem[]; token: string | null; onReload: (token: string) => Promise<void> }) {
  async function remove(item: SavedItem) { if (!token) return; const response = await fetch("/api/account", { method: "DELETE", headers: { "content-type": "application/json", authorization: `Bearer ${token}` }, body: JSON.stringify(item) }); if (response.ok) await onReload(token); }
  if (!items.length) return <StateCard title="저장한 콘텐츠가 없습니다" body="낚시 포인트와 canonical 어종, 출조, 마켓 상세에서 저장할 수 있습니다." />;
  return <div className="space-y-3">{items.map((item) => <article key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-[20px] border border-[#1F3A50] bg-[#071827] p-4"><div><p className="text-xs font-black text-[#79C9D6]">{entityLabels[item.entityType]}</p><p className="mt-1 font-black">{item.label ?? item.entityId}</p></div><div className="flex gap-2">{item.href ? <Link href={item.href} className="inline-flex min-h-10 items-center rounded-full border border-[#29465D] px-4 text-sm font-black">열기</Link> : null}<button onClick={() => remove(item)} className="min-h-10 rounded-full border border-rose-300/30 px-4 text-sm font-black text-rose-100">저장 해제</button></div></article>)}</div>;
}

function ActivityPanel({ model, recent, localCommunityDrafts }: { model: AccountReadModel | null; recent: RecentItem[]; localCommunityDrafts: string[] }) {
  return <div className="grid gap-5 lg:grid-cols-2"><ActivityCard title="내 마켓 등록" icon={ShoppingBag}>{model?.marketActivity.length ? model.marketActivity.map((item) => <p key={item.id} className="py-2 text-sm font-bold">{item.title} · {item.status}</p>) : <Empty>서버에 저장된 마켓 활동이 없습니다.</Empty>}</ActivityCard><ActivityCard title="내 커뮤니티 작성" icon={Pencil}>{localCommunityDrafts.length ? <p className="text-sm font-bold">이 기기에 로컬 작성 항목 {localCommunityDrafts.length}개가 있습니다.</p> : <Empty>이 기기에 저장된 커뮤니티 작성 항목이 없습니다.</Empty>}</ActivityCard><ActivityCard title="출조 문의·저장" icon={Ship}><Empty>서버 기반 출조 문의 이력은 아직 연결되지 않았습니다.</Empty></ActivityCard><ActivityCard title="최근 본 콘텐츠" icon={History}>{recent.length ? recent.slice(0, 10).map((item) => <Link href={item.href} key={`${item.entityType}:${item.entityId}`} className="flex min-h-11 items-center gap-2 border-b border-[#1F3A50] text-sm font-bold last:border-0"><MapPin size={14} className="text-[#79C9D6]"/>{item.label}</Link>) : <Empty>최근 본 콘텐츠가 없습니다.</Empty>}</ActivityCard></div>;
}

function ActivityCard({ title, icon: Icon, children }: { title: string; icon: typeof Fish; children: React.ReactNode }) { return <section className="rounded-[24px] border border-[#1F3A50] bg-[#071827] p-5"><h2 className="flex items-center gap-2 font-black"><Icon size={18} className="text-[#79C9D6]"/>{title}</h2><div className="mt-4">{children}</div></section>; }
function Empty({ children }: { children: React.ReactNode }) { return <p className="text-sm font-semibold leading-6 text-[#8FA7BC]">{children}</p>; }
