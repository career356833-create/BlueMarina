type BannerAdProps = {
  label?: string;
  size?: "wide" | "box";
  className?: string;
};

export function BannerAd({ label = "광고 영역", size = "wide", className = "" }: BannerAdProps) {
  return (
    <aside
      className={[
        "flex items-center justify-center rounded-2xl border border-dashed border-sky-200 bg-white/75 text-center text-xs font-bold text-slate-400 shadow-sm",
        size === "box" ? "min-h-[150px] p-5" : "min-h-[76px] p-4",
        className
      ].join(" ")}
    >
      <div>
        <span className="mx-auto mb-2 flex h-9 w-12 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-sm font-black text-rose-500">
          AD
        </span>
        <p>{label}</p>
        <p className="mt-1 text-[11px] font-semibold text-slate-400">Google AdSense 자동 광고 준비</p>
      </div>
    </aside>
  );
}
