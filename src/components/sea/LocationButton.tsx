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
      className="inline-flex min-h-12 items-center gap-2 rounded-[18px] border border-white/10 bg-[#2E8BFF] px-3 text-left text-white shadow-[0_14px_28px_rgba(46,139,255,0.24)] transition hover:bg-[#5aa4ff] disabled:cursor-not-allowed disabled:bg-[#2E8BFF]/55 md:min-h-14 md:gap-3 md:rounded-[20px] md:px-4"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white/15 md:h-10 md:w-10">
        <LocateFixed size={18} className="md:size-5" />
      </span>
      <span className="min-w-0">
        <span className="block text-[10px] font-black uppercase tracking-[0.18em] text-white/75 md:text-[11px] md:tracking-[0.22em]">{statusLabel}</span>
        <span className="block truncate text-xs font-black md:text-sm">{label}</span>
      </span>
    </button>
  );
}
