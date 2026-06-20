"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Compass, Droplets, LocateFixed, MapPin, Navigation, Sunrise, ThermometerSun, Waves, Wind } from "lucide-react";
import { AppFrame } from "@/components/boat/AppFrame";
import { marineObservatories, type MarineObservatoryData } from "@/data/marine-observatories";
import { findNearestObservatory } from "@/lib/sea-info/distance";

const previewLocation = {
  lat: 35.1796,
  lng: 129.0756
};

const dataLabels: Record<MarineObservatoryData, string> = {
  tide: "조석",
  "high-low-tide": "만조/간조",
  "water-temperature": "수온",
  "wave-height": "파고",
  current: "조류",
  "sunrise-sunset": "일출/일몰",
  wind: "풍속/풍향",
  precipitation: "강수",
  "marine-forecast": "해상예보"
};

const plannedCards = [
  {
    title: "만조/간조",
    description: "가까운 조석 관측소 기준으로 고조와 저조 시간을 표시할 예정입니다.",
    icon: Waves
  },
  {
    title: "풍속/풍향",
    description: "기상청 예보 데이터를 활용해 바람 방향과 세기를 보여줄 예정입니다.",
    icon: Wind
  },
  {
    title: "파고",
    description: "해상 상태와 출조 주의 판단에 필요한 파고 정보를 연결할 예정입니다.",
    icon: Navigation
  },
  {
    title: "수온",
    description: "어종 활동과 계절 판단에 참고할 수 있는 수온 정보를 준비합니다.",
    icon: ThermometerSun
  },
  {
    title: "일출/일몰",
    description: "출항과 귀항 계획에 필요한 일출·일몰 시간을 표시할 예정입니다.",
    icon: Sunrise
  },
  {
    title: "출조 참고 지수",
    description: "풍속, 파고, 강수, 조석 변화를 기반으로 참고 지수를 계산할 예정입니다.",
    icon: Compass
  }
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

export default function SeaInfoPage() {
  const [message, setMessage] = useState("");

  const nearestPreview = useMemo(() => findNearestObservatory(previewLocation, marineObservatories), []);

  return (
    <AppFrame>
      <div className="space-y-5">
        <section className="overflow-hidden rounded-[2rem] bg-[#0F2D52] text-white shadow-sm">
          <div className="relative p-6 sm:p-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(56,189,248,0.36),transparent_35%),linear-gradient(135deg,rgba(14,116,144,0.45),transparent_56%)]" />
            <div className="relative">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 text-sky-100 ring-1 ring-white/20">
                <Waves size={30} />
              </div>
              <p className="mt-5 text-sm font-black text-sky-100">Blue Marina Sea Info</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">해양정보센터</h1>
              <p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-sky-50 sm:text-base">
                조석, 바람, 파고, 수온, 일출·일몰을 한곳에서 확인할 수 있도록 준비 중입니다. 현재 단계에서는 API를 호출하지 않고 화면과 관측소 선택 구조만 제공합니다.
              </p>
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-2xl bg-white/10 p-4">
                  <p className="text-2xl font-black">{marineObservatories.length}</p>
                  <p className="mt-1 text-xs font-bold text-sky-100">샘플 관측소</p>
                </div>
                <div className="rounded-2xl bg-white/10 p-4">
                  <p className="text-2xl font-black">KHOA</p>
                  <p className="mt-1 text-xs font-bold text-sky-100">조석 후보</p>
                </div>
                <div className="rounded-2xl bg-white/10 p-4">
                  <p className="text-2xl font-black">KMA</p>
                  <p className="mt-1 text-xs font-bold text-sky-100">기상 후보</p>
                </div>
                <div className="rounded-2xl bg-white/10 p-4">
                  <p className="text-2xl font-black">준비중</p>
                  <p className="mt-1 text-xs font-bold text-sky-100">API 미호출</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <article className="rounded-[2rem] border border-sky-100 bg-white p-5 shadow-sm sm:p-6">
            <SectionTitle
              label="Location"
              title="현재 위치 기반 안내"
              description="실제 위치 권한 요청은 아직 하지 않습니다. 버튼은 다음 단계 구현을 위한 자리입니다."
            />
            <button
              type="button"
              onClick={() => setMessage("현재 위치 찾기 기능은 준비중입니다. 실제 구현 시 브라우저 위치 권한 요청 후 가까운 관측소를 계산합니다.")}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-sky-700 px-4 py-3 text-sm font-black text-white shadow-sm transition hover:bg-sky-800 sm:w-auto"
            >
              <LocateFixed size={18} />
              현재 위치로 가까운 관측소 찾기
            </button>
            {message ? <p className="mt-4 rounded-2xl bg-sky-50 p-4 text-sm font-black leading-6 text-sky-900">{message}</p> : null}
            <div className="mt-4 rounded-2xl bg-amber-50 p-4">
              <p className="flex items-start gap-2 text-sm font-black leading-6 text-amber-900">
                <AlertTriangle className="mt-0.5 shrink-0" size={18} />
                위치 권한을 거부한 경우에는 지역 선택 방식으로 부산, 포항, 인천, 여수, 제주 관측소를 고를 수 있도록 확장할 예정입니다.
              </p>
            </div>
          </article>

          <article className="rounded-[2rem] border border-sky-100 bg-white p-5 shadow-sm sm:p-6">
            <SectionTitle label="Nearest Observatory" title="가까운 관측소 카드" description="현재는 부산 기준 샘플 위치로 거리 계산 유틸을 검증합니다." />
            {nearestPreview ? (
              <div className="rounded-3xl bg-slate-50 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                    <MapPin size={24} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-lg font-black text-slate-950">{nearestPreview.observatory.name}</p>
                    <p className="mt-1 text-sm font-bold text-slate-500">
                      {nearestPreview.observatory.region} · 약 {nearestPreview.distanceKm.toFixed(1)}km
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {nearestPreview.observatory.supportedData.map((item) => (
                        <span key={item} className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-sky-800 shadow-sm">
                          {dataLabels[item]}
                        </span>
                      ))}
                    </div>
                    <p className="mt-3 text-xs font-bold leading-5 text-slate-500">{nearestPreview.observatory.note}</p>
                  </div>
                </div>
              </div>
            ) : null}
          </article>
        </section>

        <section className="rounded-[2rem] border border-sky-100 bg-white p-5 shadow-sm sm:p-6">
          <SectionTitle label="Planned Data" title="제공 예정 정보" description="아래 카드는 실제 API 연결 전 표시 구조를 검증하기 위한 준비 영역입니다." />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {plannedCards.map((item) => {
              const Icon = item.icon;

              return (
                <article key={item.title} className="rounded-2xl border border-sky-100 bg-slate-50 p-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-sky-700 shadow-sm">
                    <Icon size={22} />
                  </div>
                  <h3 className="mt-4 text-base font-black text-slate-950">{item.title}</h3>
                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{item.description}</p>
                  <span className="mt-4 inline-flex rounded-full bg-sky-100 px-3 py-1 text-[11px] font-black text-sky-800">API 연동 준비중</span>
                </article>
              );
            })}
          </div>
        </section>

        <section className="rounded-[2rem] border border-sky-100 bg-white p-5 shadow-sm sm:p-6">
          <SectionTitle label="Sample Observatories" title="샘플 관측소 5개" description="실제 공식 코드와 좌표는 API 연동 전 별도 검증 후 교체합니다." />
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {marineObservatories.map((observatory) => (
              <article key={observatory.id} className="min-w-0 rounded-2xl border border-sky-100 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span className="inline-flex rounded-full bg-white px-3 py-1 text-[11px] font-black text-sky-800 shadow-sm">{observatory.source}</span>
                    <h3 className="mt-3 break-words text-base font-black text-slate-950">{observatory.name}</h3>
                    <p className="mt-1 text-sm font-bold text-slate-500">{observatory.region}</p>
                  </div>
                  <Droplets className="shrink-0 text-sky-700" size={22} />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {observatory.supportedData.slice(0, 5).map((item) => (
                    <span key={item} className="rounded-full bg-sky-50 px-3 py-1 text-[11px] font-black text-sky-700">
                      {dataLabels[item]}
                    </span>
                  ))}
                </div>
                <p className="mt-3 text-xs font-bold leading-5 text-slate-500">{observatory.note}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-[2rem] border border-dashed border-sky-200 bg-sky-50 p-5 shadow-sm sm:p-6">
          <h2 className="text-xl font-black text-slate-950">API 연동 준비중</h2>
          <p className="mt-3 text-sm font-semibold leading-7 text-slate-600">
            이 페이지는 아직 국립해양조사원 API, 기상청 API, 브라우저 Geolocation API를 호출하지 않습니다. 다음 단계에서 공식 API 키와 서버 캐시 구조를 준비한 뒤 조석 데이터부터 연결합니다.
          </p>
        </section>
      </div>
    </AppFrame>
  );
}
