import type { ReactNode } from "react";

type StatCardProps = {
  label: string;
  value: string | number;
  helper?: string;
  icon?: ReactNode;
};

export function StatCard({ label, value, helper, icon }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-sky-100 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</p>
        {icon && <div className="text-sky-600">{icon}</div>}
      </div>
      <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
      {helper && <p className="mt-1 text-xs font-semibold text-slate-500">{helper}</p>}
    </div>
  );
}
