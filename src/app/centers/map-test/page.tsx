import Link from "next/link";
import { ArrowLeft, Compass, ExternalLink, KeyRound, Map, MapPin, Navigation, Route, Smartphone, Waves } from "lucide-react";
import { AppFrame } from "@/components/boat/AppFrame";

const naverReasons = [
  {
    title: "국내 지도 품질",
    description: "국내 주소, 도로명, 지역 검색 품질을 기준으로 시험장·교육장 안내에 적합한 후보입니다.",
    icon: Map
  },
  {
    title: "해양레저 확장성",
    description: "낚시방, 출조점, 맛집, 마리나 주변 정보로 확장할 때 국내 사용자에게 익숙합니다.",
    icon: Waves
  },
  {
    title: "길찾기 연동 가능성",
    description: "시설 상세 페이지에서 향후 길찾기 링크나 외부 지도 앱 이동을 검토할 수 있습니다.",
    icon: Navigation
  },
  {
    title: "모바일 친화성",
    description: "시험장 방문 전 스마트폰으로 위치를 확인하는 사용자 흐름에 맞는 지도 UX를 준비합니다.",
    icon: Smartphone
  }
];

const roadmap = [
  "시험장·교육장 마커",
  "지역별 필터와 지도 연동",
  "낚시방 추천",
  "출조점/선상낚시 위치",
  "길찾기 링크",
  "내 주변 시설 찾기"
];

function SectionTitle({ label, title, description }: { label: string; title: string; description?: string }) {
  return (
    <div className="mb-4">
      <p className="text-xs font-black uppercase tracking-wide text-sky-700">{label}</p>
      <h2 className="mt-1 text-xl font-black text-slate-950 sm:text-2xl">{title}</h2>
      {description ? <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">{description}</p> : null}
    </div>
  );
}

export default function CentersMapTestPage() {
  return (
    <AppFrame>
      <div className="space-y-5">
        <section className="overflow-hidden rounded-[2rem] bg-[#0F2D52] text-white shadow-sm">
          <div className="relative p-6 sm:p-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(56,189,248,0.35),transparent_35%),linear-gradient(135deg,rgba(14,116,144,0.45),transparent_55%)]" />
            <div className="relative">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 text-sky-100 ring-1 ring-white/20">
                <MapPin size={30} />
              </div>
              <p className="mt-5 text-sm font-black text-sky-100">Blue Marina Map Lab</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">네이버 지도 실험실</h1>
              <p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-sky-50 sm:text-base">
                시험장·교육장 위치를 지도에 표시하기 위한 준비 페이지입니다.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-sky-100 bg-white p-5 shadow-sm sm:p-6">
          <SectionTitle label="Why Naver Map" title="네이버 지도 선택 이유" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {naverReasons.map((item) => {
              const Icon = item.icon;

              return (
                <article key={item.title} className="rounded-2xl border border-sky-100 bg-slate-50 p-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-sky-700 shadow-sm">
                    <Icon size={22} />
                  </div>
                  <h3 className="mt-4 text-base font-black text-slate-950">{item.title}</h3>
                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{item.description}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <article className="rounded-[2rem] border border-sky-100 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
              <KeyRound size={24} />
            </div>
            <h2 className="mt-4 text-xl font-black text-slate-950">환경변수 안내</h2>
            <p className="mt-2 text-sm font-semibold leading-7 text-slate-600">
              네이버 지도 연동 시 아래 공개 환경변수를 사용할 예정입니다. API 키는 코드에 직접 넣지 않습니다.
            </p>
            <div className="mt-4 rounded-2xl bg-slate-950 px-4 py-3 font-mono text-sm font-bold text-sky-100">
              NEXT_PUBLIC_NAVER_MAP_CLIENT_ID
            </div>
            <p className="mt-3 text-xs font-bold leading-5 text-amber-700">현재 페이지는 API 키를 읽거나 지도 스크립트를 호출하지 않습니다.</p>
          </article>

          <article className="rounded-[2rem] border border-dashed border-sky-200 bg-sky-50/70 p-5 shadow-sm sm:p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-sky-700 shadow-sm">
              <Compass size={24} />
            </div>
            <p className="mt-4 text-xs font-black uppercase tracking-wide text-sky-700">Map Placeholder</p>
            <h2 className="mt-1 text-xl font-black text-slate-950">네이버 지도 API 키 입력 후 활성화 예정</h2>
            <div className="mt-4 flex min-h-64 items-center justify-center rounded-[1.5rem] border border-sky-100 bg-white text-center">
              <div className="px-5">
                <Map size={34} className="mx-auto text-sky-700" />
                <p className="mt-3 text-sm font-black text-slate-950">현재는 지도 API를 호출하지 않습니다.</p>
                <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">실제 지도 로딩, 스크립트 삽입, iframe 사용은 모두 비활성 상태입니다.</p>
              </div>
            </div>
          </article>
        </section>

        <section className="rounded-[2rem] border border-sky-100 bg-white p-5 shadow-sm sm:p-6">
          <SectionTitle label="Roadmap" title="향후 지도 기능 로드맵" description="실제 좌표와 API 키 검증 후 단계적으로 연결할 기능입니다." />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {roadmap.map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-black text-slate-800">
                <Route size={18} className="shrink-0 text-sky-700" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-3 rounded-[2rem] border border-sky-100 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <h2 className="text-lg font-black text-slate-950">시험장·교육장 검색센터로 돌아가기</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">실제 시설 목록과 필터는 기존 검색센터에서 확인할 수 있습니다.</p>
          </div>
          <Link
            href="/centers"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-sky-700 px-4 py-2 text-sm font-black text-white shadow-sm transition hover:bg-sky-800"
          >
            <ArrowLeft size={17} />
            /centers로 돌아가기
          </Link>
        </section>

        <section className="rounded-[2rem] border border-amber-100 bg-amber-50 p-5 shadow-sm sm:p-6">
          <div className="flex gap-3">
            <ExternalLink className="mt-1 shrink-0 text-amber-600" size={22} />
            <p className="text-sm font-black leading-7 text-amber-900">
              이 페이지는 지도 연동 전 구조 검토용입니다. 실제 네이버 지도 API 키, 지도 스크립트, 외부 지도 호출은 포함하지 않습니다.
            </p>
          </div>
        </section>
      </div>
    </AppFrame>
  );
}
