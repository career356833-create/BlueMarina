import { redirect } from "next/navigation";
import { DevAuditDashboard } from "@/components/dev-audit/DevAuditDashboard";
import { DevAuditMobileGuard } from "@/components/dev-audit/DevAuditMobileGuard";
import { devAuditEnabled } from "@/lib/dev-audit/audit-data";

export default function DevAuditPage() {
  if (!devAuditEnabled) redirect("/");

  return (
    <DevAuditMobileGuard>
      <DevAuditDashboard />
    </DevAuditMobileGuard>
  );
}
