import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  IdCard,
  PenLine,
  Sailboat,
  ShieldCheck,
  ShipWheel,
  WalletCards
} from "lucide-react";
import { PortalShell } from "@/components/boat/portal/PortalShell";

const processSteps = [
  { step: "STEP 1", title: "필기시험", description: "문제은행 학습 후 필기시험에 응시합니다.", icon: PenLine },
  { step: "STEP 2", title: "실기시험", description: "조종 능력과 안전 운항 역량을 확인합니다.", icon: Sailboat },
  { step: "STEP 3", title: "수상안전교육", description: "안전 운항에 필요한 교육을 이수합니다.", icon: ShieldCheck },
  { step: "STEP 4", title: "면허증 발급", description: "합격 및 교육 이수 후 면허증 발급을 진행합니다.", icon: BadgeCheck }
];

const examCards = [
  {
    title: "필기시험",
    fee: "4,800원",
    icon: FileText,
    materials: ["신분증", "6개월 이내 촬영 컬러사진 1매 (3.5cm × 4.5cm)"],
    proxy: ["대리인 신분증", "위임자 신분증", "위임장"]
  },
  {
    title: "실기시험",
    fee: "64,800원",
    icon: Sailboat,
    materials: ["신분증", "6개월 이내 촬영 컬러사진 1매 (3.5cm × 4.5cm)"],
    proxy: ["대리인 신분증", "위임자 신분증", "위임장"]
  }
];

const checklist = ["신분증 준비", "사진 준비", "시험장 확인", "응시 일정 확인"];

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="mb-4">
      <p className="text-xs font-black uppercase tracking-wide text-sky-700">{eyebrow}</p>
      <h2 className="mt-1 text-xl font-black text-slate-950 sm:text-2xl">{title}</h2>
    </div>
  );
}

function ListItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2 text-sm font-semibold leading-6 text-slate-600">
      <CheckCircle2 size={16} className="mt-1 shrink-0 text-sky-600" />
      <span>{children}</span>
    </li>
  );
}

export default function ExamGuidePage() {
  return (
    <PortalShell
      eyebrow="License Guide"
      title="면허시험 안내"
      description="일반조종면허와 요트조종면허 시험 준비에 필요한 기본 흐름, 수수료, 준비물을 한눈에 확인할 수 있는 안내 페이지입니다."
    >
      <section className="grid gap-4 md:grid-cols-2">
        <article className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
              <ShipWheel size={24} />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-950">일반조종면허</h2>
              <p className="mt-2 text-sm font-semibold leading-7 text-slate-600">
                모터보트 등 수상동력기구 조종을 준비하는 학습자를 위한 면허입니다. 필기와 실기, 안전교육, 발급 절차를 순서대로 확인하는 것이 좋습니다.
              </p>
            </div>
          </div>
        </article>

        <article className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
              <Sailboat size={24} />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-950">요트조종면허</h2>
              <p className="mt-2 text-sm font-semibold leading-7 text-slate-600">
                요트 운항에 필요한 기본 지식과 조종 능력을 확인하는 면허입니다. 문제은행 학습과 실기 준비를 함께 진행하면 시험 흐름을 잡기 쉽습니다.
              </p>
            </div>
          </div>
        </article>
      </section>

      <section className="rounded-[2rem] border border-sky-100 bg-white p-5 shadow-sm sm:p-6">
        <SectionTitle eyebrow="Process" title="시험 절차" />
        <div className="grid gap-3 lg:grid-cols-4">
          {processSteps.map((item, index) => {
            const Icon = item.icon;

            return (
              <div key={item.step} className="relative rounded-2xl bg-slate-50 p-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0F2D52] text-white">
                  <Icon size={22} />
                </div>
                <p className="mt-4 text-xs font-black text-sky-700">{item.step}</p>
                <h3 className="mt-1 text-base font-black text-slate-950">{item.title}</h3>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{item.description}</p>
                {index < processSteps.length - 1 ? (
                  <div className="mt-4 flex justify-center text-sky-500 lg:absolute lg:-right-4 lg:top-1/2 lg:mt-0 lg:-translate-y-1/2">
                    <ArrowRight size={22} />
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        {examCards.map((exam) => {
          const Icon = exam.icon;

          return (
            <article key={exam.title} className="rounded-[2rem] border border-sky-100 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                    <Icon size={24} />
                  </div>
                  <div>
                    <p className="text-xs font-black text-sky-700">Exam</p>
                    <h2 className="text-xl font-black text-slate-950">{exam.title}</h2>
                  </div>
                </div>
                <div className="rounded-2xl bg-[#0F2D52] px-4 py-3 text-right text-white">
                  <p className="text-[11px] font-black text-sky-100">수수료</p>
                  <p className="text-base font-black">{exam.fee}</p>
                </div>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="flex items-center gap-2 text-sm font-black text-slate-950">
                    <IdCard size={18} className="text-sky-700" />
                    준비물
                  </div>
                  <ul className="mt-3 space-y-2">
                    {exam.materials.map((item) => (
                      <ListItem key={item}>{item}</ListItem>
                    ))}
                  </ul>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="flex items-center gap-2 text-sm font-black text-slate-950">
                    <WalletCards size={18} className="text-sky-700" />
                    대리접수
                  </div>
                  <ul className="mt-3 space-y-2">
                    {exam.proxy.map((item) => (
                      <ListItem key={item}>{item}</ListItem>
                    ))}
                  </ul>
                </div>
              </div>
            </article>
          );
        })}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_0.8fr]">
        <article className="rounded-[2rem] border border-sky-100 bg-white p-5 shadow-sm sm:p-6">
          <SectionTitle eyebrow="Checklist" title="시험 준비 체크리스트" />
          <div className="grid gap-3 sm:grid-cols-2">
            {checklist.map((item) => (
              <label key={item} className="flex min-h-14 items-center gap-3 rounded-2xl border border-sky-100 bg-sky-50/60 px-4 py-3 text-sm font-black text-slate-800">
                <input type="checkbox" className="h-5 w-5 rounded border-sky-300 text-sky-700" />
                {item}
              </label>
            ))}
          </div>
        </article>

        <article className="rounded-[2rem] border border-sky-100 bg-[#0F2D52] p-5 text-white shadow-sm sm:p-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-sky-100">
            <ClipboardCheck size={24} />
          </div>
          <h2 className="mt-4 text-xl font-black">공식 신청 안내</h2>
          <p className="mt-2 text-sm font-semibold leading-7 text-sky-100">
            실제 신청은 반드시 공식 신청 경로에서 진행하세요. Blue Marina는 학습과 안내를 돕는 포털 구조를 제공합니다.
          </p>
          <Link
            href="/official-links"
            className="mt-5 inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-[#0F2D52] transition hover:bg-sky-50"
          >
            공식 신청센터 이용
            <ArrowRight size={18} />
          </Link>
        </article>
      </section>

      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:p-5">
        <div className="flex gap-3">
          <Camera size={22} className="mt-0.5 shrink-0 text-amber-700" />
          <p className="text-sm font-bold leading-7 text-amber-900">
            시험 일정 및 수수료는 변경될 수 있으므로 공식 홈페이지를 반드시 확인하세요.
          </p>
        </div>
      </section>
    </PortalShell>
  );
}
