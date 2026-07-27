import Link from "next/link";
import { AlertTriangle, Anchor, CheckCircle2, CloudSun, LifeBuoy, MapPin, ShieldCheck, Ship, Waves } from "lucide-react";
import { AppFrame } from "@/components/boat/AppFrame";

const safetySections = [
  {
    title: "갯바위·방파제",
    icon: Waves,
    points: ["퇴로와 만조 시간을 먼저 확인", "젖은 바닥과 테트라포드 진입 주의", "야간에는 조명과 동행 여부 확인", "파도가 올라오는 자리는 포인트가 좋아도 피하기"]
  },
  {
    title: "선상낚시",
    icon: Ship,
    points: ["승선 전 구명조끼 착용 확인", "선장 안내와 자리 이동 규칙 따르기", "멀미·체온 저하 대비", "낚싯바늘·칼·봉돌은 따로 정리"]
  },
  {
    title: "해상날씨",
    icon: CloudSun,
    points: ["풍속, 파고, 시정, 특보를 함께 확인", "비보다 바람과 파도를 우선 판단", "출조 중 날씨가 바뀌면 즉시 철수 검토", "예보가 애매하면 보수적으로 결정"]
  },
  {
    title: "비상 대응",
    icon: LifeBuoy,
    points: ["현재 위치를 설명할 수 있게 준비", "방수팩에 휴대폰과 보조배터리 보관", "혼자 무리하게 구조하지 않기", "동행자와 귀가 시간을 공유"]
  }
];

const checklistGroups = [
  {
    title: "출조 전",
    items: ["날씨와 해상특보 확인", "물때와 철수 시간 확인", "구명조끼 준비", "동행자 또는 가족에게 위치 공유", "랜턴·보조배터리·방수팩 확인"]
  },
  {
    title: "현장 도착",
    items: ["발판과 퇴로 확인", "파도가 닿는 높이 확인", "주변 낚시객과 안전거리 확보", "미끄러운 곳과 위험 구조물 피하기", "쓰레기 회수 계획 확인"]
  },
  {
    title: "출조 중",
    items: ["무리한 자리 이동 금지", "낚싯바늘과 칼 안전 관리", "체온과 수분 상태 확인", "날씨 변화 관찰", "위험하면 조황과 관계없이 철수"]
  }
];

const avoidItems = ["테트라포드 위 단독 진입", "파도 맞는 자리에서 버티기", "구명조끼 없이 갯바위·선상 진입", "음주 후 출조", "모르는 어종 맨손 취급", "야간 단독 출조"];

export default function FishingSafetyPage() {
  return (
    <AppFrame>
      <div className="space-y-5">
        <section className="overflow-hidden rounded-[2rem] bg-[#0F2D52] text-white shadow-sm">
          <div className="relative p-6 sm:p-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(56,189,248,0.35),transparent_34%),linear-gradient(135deg,rgba(14,116,144,0.42),transparent_58%)]" />
            <div className="relative">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 text-sky-100 ring-1 ring-white/20">
                <ShieldCheck size={30} />
              </div>
              <p className="mt-5 text-sm font-black text-sky-100">Blue Marina Safety Guide</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">출조 안전 가이드</h1>
              <p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-sky-50 sm:text-base">
                바다낚시와 선상낚시를 시작하기 전에 확인해야 할 기본 안전 기준입니다. 정확한 통제 정보와 현장 기준은 출조 전 공식 안내와 현장 상황을 반드시 확인하세요.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link href="/fishing-spots" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-white px-5 text-sm font-black text-[#0F2D52] transition hover:bg-sky-50">
                  <MapPin size={18} />
                  출조거점 보기
                </Link>
                <Link href="/sea-info" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-sky-600 px-5 text-sm font-black text-white transition hover:bg-sky-700">
                  <Waves size={18} />
                  오늘의 바다 확인
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-3 md:grid-cols-2">
          {safetySections.map((section) => {
            const Icon = section.icon;

            return (
              <article key={section.title} className="rounded-[1.5rem] border border-sky-100 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
                    <Icon size={22} />
                  </div>
                  <h2 className="text-lg font-black text-slate-950">{section.title}</h2>
                </div>
                <div className="mt-4 grid gap-2">
                  {section.points.map((point) => (
                    <p key={point} className="flex gap-2 text-sm font-semibold leading-6 text-slate-700">
                      <CheckCircle2 className="mt-0.5 shrink-0 text-sky-700" size={16} />
                      <span>{point}</span>
                    </p>
                  ))}
                </div>
              </article>
            );
          })}
        </section>

        <section className="rounded-[2rem] border border-sky-100 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-3">
            <Anchor className="text-sky-700" size={24} />
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-sky-700">Checklist</p>
              <h2 className="mt-1 text-xl font-black text-slate-950">출조 전 체크리스트</h2>
            </div>
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-3">
            {checklistGroups.map((group) => (
              <article key={group.title} className="rounded-2xl bg-slate-50 p-4">
                <h3 className="text-base font-black text-slate-950">{group.title}</h3>
                <div className="mt-3 grid gap-2">
                  {group.items.map((item) => (
                    <label key={item} className="flex min-h-9 items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-slate-700 ring-1 ring-sky-100">
                      <input type="checkbox" className="h-4 w-4 rounded border-sky-200 text-sky-700" />
                      <span>{item}</span>
                    </label>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-[2rem] border border-amber-100 bg-amber-50 p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-3">
            <AlertTriangle className="shrink-0 text-amber-700" size={24} />
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-amber-800">Avoid</p>
              <h2 className="mt-1 text-xl font-black text-amber-950">초보자가 피해야 할 행동</h2>
            </div>
          </div>

          <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {avoidItems.map((item) => (
              <div key={item} className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-amber-900 ring-1 ring-amber-100">
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[2rem] border border-sky-100 bg-sky-50 p-5 shadow-sm">
          <p className="text-sm font-black text-sky-900">Blue Marina 안내</p>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">
            이 가이드는 출조 전 기본 점검을 돕는 참고 자료입니다. 지역별 출입 통제, 해상특보, 선박 운항, 낚시 금지구역, 안전 장비 기준은 변경될 수 있으므로 공식 안내와 현장 책임자의 안내를 우선하세요.
          </p>
        </section>
      </div>
    </AppFrame>
  );
}
