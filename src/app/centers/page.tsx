"use client";

import { useEffect, useMemo, useState } from "react";
import { Building2, CheckCircle2, Compass, ExternalLink, Filter, IdCard, Map, MapPin, Phone, Search, ShieldCheck } from "lucide-react";
import { PortalShell } from "@/components/boat/portal/PortalShell";
import { marineCenters, marineCenterTypeLabels, type MarineCenter, type MarineCenterType } from "@/data/marine-centers";

const INITIAL_VISIBLE_COUNT = 12;

const typeOptions: Array<{ value: MarineCenterType | "all"; label: string }> = [
  { value: "all", label: "전체 시설" },
  { value: "written-test", label: "필기시험장" },
  { value: "practical-test", label: "실기시험장" },
  { value: "safety-education", label: "수상안전교육장" },
  { value: "exemption-education", label: "면제교육기관" }
];

const licenseOptions = [
  { value: "all", label: "전체 면허" },
  { value: "general", label: "일반조종면허" },
  { value: "yacht", label: "요트조종면허" }
] as const;

function getLicenseLabel(licenseType: "general" | "yacht") {
  return licenseType === "general" ? "일반조종면허" : "요트조종면허";
}

function getStatusLabel(status: MarineCenter["status"]) {
  if (status === "active") return "공식 자료 확인";
  if (status === "closed") return "운영 종료";
  return "정보 준비중";
}

function matchesLicenseFilter(center: MarineCenter, licenseType: "all" | "general" | "yacht") {
  if (licenseType === "all") return true;
  const licenses = center.availableLicenses ?? [];

  if (center.type === "written-test" && licenses.length === 0) {
    return true;
  }

  return licenses.includes(licenseType);
}

function CenterCard({ center }: { center: MarineCenter }) {
  const licenses = center.availableLicenses ?? [];
  const needsLicenseCheck = center.type === "written-test" && licenses.length === 0;

  return (
    <article className="min-w-0 rounded-[1.2rem] border border-sky-100 bg-white p-4 shadow-sm">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex rounded-full bg-sky-100 px-2.5 py-1 text-[11px] font-black text-sky-800">
            {marineCenterTypeLabels[center.type]}
          </span>
          <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-black text-emerald-800">
            {getStatusLabel(center.status)}
          </span>
          {needsLicenseCheck ? (
            <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-black text-amber-800">
              면허 확인 필요
            </span>
          ) : null}
        </div>
        <h2 className="mt-3 break-words text-lg font-black leading-6 text-slate-950">{center.name}</h2>
      </div>

      <dl className="mt-4 divide-y divide-slate-100 rounded-2xl bg-slate-50 px-3 text-sm">
        <div className="grid min-w-0 gap-1 py-2.5">
          <dt className="flex items-center gap-2 text-xs font-black text-slate-950">
            <MapPin size={17} className="text-sky-700" />
            지역
          </dt>
          <dd className="mt-1 break-words font-semibold text-slate-600">
            {center.region}
            {center.city ? ` · ${center.city}` : ""}
          </dd>
        </div>

        <div className="grid min-w-0 gap-1 py-2.5">
          <dt className="flex items-center gap-2 text-xs font-black text-slate-950">
            <Phone size={17} className="text-sky-700" />
            전화번호
          </dt>
          <dd className="mt-1 break-words font-semibold text-slate-600">{center.phone ?? "공식 자료 확인 필요"}</dd>
        </div>

        <div className="grid min-w-0 gap-1 py-2.5">
          <dt className="flex items-center gap-2 text-xs font-black text-slate-950">
            <Compass size={17} className="text-sky-700" />
            주소
          </dt>
          <dd className="mt-1 break-words font-semibold leading-5 text-slate-600">{center.address}</dd>
        </div>

        <div className="grid min-w-0 gap-1 py-2.5">
          <dt className="flex items-center gap-2 text-xs font-black text-slate-950">
            <IdCard size={17} className="text-sky-700" />
            가능 면허
          </dt>
          <dd className="mt-2 flex flex-wrap gap-2">
            {needsLicenseCheck ? (
              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-black text-amber-800">
                공식 접수 화면 확인 필요
              </span>
            ) : (
              licenses.map((licenseType) => (
                <span key={licenseType} className="rounded-full bg-white px-2.5 py-1 text-xs font-black text-slate-700">
                  {getLicenseLabel(licenseType)}
                </span>
              ))
            )}
          </dd>
        </div>

        <div className="grid min-w-0 gap-1 py-2.5">
          <dt className="flex items-center gap-2 text-xs font-black text-slate-950">
            <CheckCircle2 size={17} className="text-sky-700" />
            공식 자료 확인일
          </dt>
          <dd className="mt-1 font-semibold leading-6 text-slate-600">{center.sourceCheckedAt ?? "공식 자료 검증 예정"}</dd>
        </div>
      </dl>
      {center.officialUrl ? (
        <a
          href={center.officialUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-sky-200 bg-sky-50 px-4 text-sm font-black text-sky-800 transition hover:bg-sky-100"
        >
          공식 위치 보기
          <ExternalLink size={16} />
        </a>
      ) : (
        <p className="mt-3 rounded-2xl bg-slate-50 px-4 py-3 text-xs font-bold leading-5 text-slate-500">
          공식 위치 URL 확인 예정
        </p>
      )}
    </article>
  );
}

export default function CentersPage() {
  const [region, setRegion] = useState("all");
  const [centerType, setCenterType] = useState<MarineCenterType | "all">("all");
  const [licenseType, setLicenseType] = useState<"all" | "general" | "yacht">("all");
  const [query, setQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_COUNT);

  const regions = useMemo(() => ["all", ...Array.from(new Set(marineCenters.map((center) => center.region))).sort()], []);

  const filteredCenters = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return marineCenters.filter((center) => {
      const matchesRegion = region === "all" || center.region === region;
      const matchesType = centerType === "all" || center.type === centerType;
      const matchesLicense = matchesLicenseFilter(center, licenseType);
      const searchable = [center.name, marineCenterTypeLabels[center.type], center.region, center.city, center.address, center.phone, center.note]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const matchesQuery = !normalizedQuery || searchable.includes(normalizedQuery);

      return matchesRegion && matchesType && matchesLicense && matchesQuery;
    });
  }, [centerType, licenseType, query, region]);

  useEffect(() => {
    setVisibleCount(INITIAL_VISIBLE_COUNT);
  }, [centerType, licenseType, query, region]);

  const visibleCenters = filteredCenters.slice(0, visibleCount);
  const hasMoreCenters = visibleCenters.length < filteredCenters.length;

  return (
    <PortalShell
      eyebrow="Blue Marina Center Finder"
      title="시험장·교육장 검색센터"
      description="필기시험장, 실기시험장, 수상안전교육장, 면제교육기관을 지역과 시설 종류별로 찾기 위한 검색센터입니다."
    >
      <section className="rounded-[1.5rem] border border-sky-100 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-black text-slate-950">공식 출처 기반 시설 데이터 1차 반영</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
              현재 {marineCenters.length}개 시설 정보를 검색할 수 있습니다. 방문 전 공식 홈페이지 또는 해당 기관을 통해 반드시 확인하세요.
            </p>
          </div>
          <span className="w-fit rounded-full bg-sky-100 px-3 py-1 text-xs font-black text-sky-800">검색 데이터 {marineCenters.length}개</span>
        </div>
      </section>

      <section className="rounded-[2rem] border border-sky-100 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Filter size={20} className="text-sky-700" />
              <h2 className="text-xl font-black text-slate-950">검색 필터</h2>
            </div>
            <p className="mt-2 text-sm font-semibold text-slate-500">지역, 시설 종류, 면허 종류, 검색어를 조합해 결과를 좁힐 수 있습니다.</p>
          </div>
          <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-black text-sky-800">검색 결과 {filteredCenters.length}개</span>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="grid gap-2 text-sm font-black text-slate-700">
            지역
            <select
              value={region}
              onChange={(event) => setRegion(event.target.value)}
              className="min-h-12 rounded-2xl border border-sky-100 bg-slate-50 px-4 text-sm font-bold text-slate-700 outline-none focus:border-sky-400"
            >
              {regions.map((item) => (
                <option key={item} value={item}>
                  {item === "all" ? "전체 지역" : item}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 text-sm font-black text-slate-700">
            시설 종류
            <select
              value={centerType}
              onChange={(event) => setCenterType(event.target.value as MarineCenterType | "all")}
              className="min-h-12 rounded-2xl border border-sky-100 bg-slate-50 px-4 text-sm font-bold text-slate-700 outline-none focus:border-sky-400"
            >
              {typeOptions.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 text-sm font-black text-slate-700">
            면허 종류
            <select
              value={licenseType}
              onChange={(event) => setLicenseType(event.target.value as "all" | "general" | "yacht")}
              className="min-h-12 rounded-2xl border border-sky-100 bg-slate-50 px-4 text-sm font-bold text-slate-700 outline-none focus:border-sky-400"
            >
              {licenseOptions.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 text-sm font-black text-slate-700">
            검색어
            <div className="flex min-h-12 items-center gap-2 rounded-2xl border border-sky-100 bg-slate-50 px-4 focus-within:border-sky-400">
              <Search size={18} className="shrink-0 text-sky-700" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="시설명, 주소, 지역"
                className="min-w-0 flex-1 bg-transparent text-sm font-bold text-slate-700 outline-none placeholder:text-slate-400"
              />
            </div>
          </label>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_22rem]">
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-sky-700">Results</p>
              <h2 className="mt-1 text-xl font-black text-slate-950">검색 결과 {filteredCenters.length}개</h2>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">공식 자료 기반</span>
          </div>

          {filteredCenters.length > 0 ? (
            <div className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                {visibleCenters.map((center) => (
                  <CenterCard key={center.id} center={center} />
                ))}
              </div>
              {hasMoreCenters ? (
                <button
                  type="button"
                  onClick={() => setVisibleCount((count) => count + INITIAL_VISIBLE_COUNT)}
                  className="min-h-12 w-full rounded-2xl border border-sky-200 bg-white px-4 text-sm font-black text-sky-800 shadow-sm transition hover:bg-sky-50"
                >
                  더 보기 ({visibleCenters.length}/{filteredCenters.length})
                </button>
              ) : null}
            </div>
          ) : (
            <div className="rounded-[1.5rem] border border-sky-100 bg-white p-6 text-center shadow-sm">
              <Building2 size={28} className="mx-auto text-sky-700" />
              <p className="mt-3 text-base font-black text-slate-950">검색 결과가 없습니다.</p>
              <p className="mt-2 text-sm font-semibold text-slate-500">필터를 조정하거나 공식 자료 반영 후 다시 확인하세요.</p>
            </div>
          )}
        </div>

        <aside className="h-fit rounded-[2rem] border border-sky-100 bg-[#0F2D52] p-5 text-white shadow-sm sm:p-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-sky-100">
            <Map size={24} />
          </div>
          <h2 className="mt-4 text-xl font-black">지도 기능 준비중</h2>
          <p className="mt-2 text-sm font-semibold leading-7 text-sky-100">
            좌표 데이터 확보 후 카카오맵 또는 네이버지도 연동을 검토할 예정입니다.
          </p>
          <div className="mt-5 rounded-2xl bg-white/10 p-4">
            <div className="flex items-start gap-2">
              <ShieldCheck size={18} className="mt-0.5 shrink-0 text-sky-100" />
              <p className="text-sm font-semibold leading-6 text-sky-50">
                현재 데이터에는 실제 좌표와 외부 URL 버튼을 연결하지 않았습니다.
              </p>
            </div>
          </div>
        </aside>
      </section>
    </PortalShell>
  );
}
