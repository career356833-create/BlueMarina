import { PortalCard, PortalShell, guidePortalCards } from "@/components/boat/portal/PortalShell";

export default function LicenseGuidePage() {
  return (
    <PortalShell
      eyebrow="Blue Marina Guide Center"
      title="면허취득 가이드 센터"
      description="면허취득 관련 안내를 모아두는 포털 골격입니다. 실제 세부 내용은 검증 후 입력합니다."
    >
      <section className="grid gap-3 sm:grid-cols-2">
        {guidePortalCards.map((card) => (
          <PortalCard key={card.title} {...card} />
        ))}
      </section>
    </PortalShell>
  );
}
