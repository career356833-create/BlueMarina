import { RelatedActions } from "@/components/platform/RelatedActions";
import { DetailFrame } from "@/components/platform/PageFamilies";
import { PageBackButton } from "@/components/boat/InformationNavigation";

const email = "chung356833@gmail.com";
const labels = {
  title: "\uBB38\uC758\uD558\uAE30",
  operator: "운영: 주식회사 로어아카이브",
  emailLabel: "\uBB38\uC758 \uC774\uBA54\uC77C",
  response: "\uC751\uB2F5 \uC2DC\uAC04 \uC548\uB0B4: \uD3C9\uC77C \uAE30\uC900 1~3\uC77C \uB0B4 \uB2F5\uBCC0\uB4DC\uB9BD\uB2C8\uB2E4.",
  body: "\uC11C\uBE44\uC2A4 \uC774\uC6A9 \uC911 \uC624\uB958, \uBB38\uC81C \uB370\uC774\uD130 \uC81C\uBCF4, \uC81C\uD734 \uBB38\uC758\uAC00 \uC788\uC73C\uBA74 \uC704 \uC774\uBA54\uC77C\uB85C \uC5F0\uB77D\uD574 \uC8FC\uC138\uC694."
};

export default function ContactPage() {
  return (
    <DetailFrame width="reading">
      <PageBackButton />
      <section className="bm-detail-section mt-5 p-6 sm:p-9">
        <p className="bm-eyebrow">Blue Marina</p>
        <h1 className="mt-2 text-3xl">{labels.title}</h1>
        <div className="mt-5 space-y-4 text-sm leading-7 text-[var(--bm-foreground-muted)]">
          <p>{labels.operator}</p>
          <div className="rounded-2xl border border-[var(--bm-border)] bg-[var(--bm-surface-elevated)] p-4">
            <p className="text-xs font-bold">{labels.emailLabel}</p>
            <a className="mt-1 block break-all text-base font-bold text-[var(--bm-brand-accent)] underline" href={`mailto:${email}`}>
              {email}
            </a>
          </div>
          <p>{labels.response}</p>
          <p>{labels.body}</p>
        </div>
      </section>
    <RelatedActions title="이어서 살펴보기" items={[{"href":"/faq","label":"자주 묻는 질문 확인"},{"href":"/","label":"서비스 탐색으로"}]} />
    </DetailFrame>
  );
}
