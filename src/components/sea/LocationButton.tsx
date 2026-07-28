import { LocateFixed } from "lucide-react";

type LocationButtonProps = {
  label: string;
  statusLabel: string;
  onClick: () => void;
  disabled?: boolean;
};

export function LocationButton({ label, statusLabel, onClick, disabled }: LocationButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex min-h-14 items-center gap-3 rounded-[20px] border border-white/10 bg-[#2E8BFF] px-4 text-left text-white shadow-[0_14px_28px_rgba(46,139,255,0.24)] transition hover:bg-[#5aa4ff] disabled:cursor-not-allowed disabled:bg-[#2E8BFF]/55"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/15">
        <LocateFixed size={20} />
      </span>
      <span className="min-w-0">
        <span className="block text-[11px] font-black uppercase tracking-[0.22em] text-white/75">{statusLabel}</span>
        <span className="block truncate text-sm font-black">{label}</span>
      </span>
    </button>
  );
}
