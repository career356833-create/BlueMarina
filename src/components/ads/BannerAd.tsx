type BannerAdProps = {
  label?: string;
  size?: "wide" | "box";
  className?: string;
};

export function BannerAd({ label = "광고 영역", size = "wide", className = "" }: BannerAdProps) {
  return (
    <aside
      className={[
        "flex items-center justify-center rounded-[22px] border border-dashed border-[#1F3A50] bg-[#0E2233] text-center text-xs font-bold text-[#9FB3C8]",
        size === "box" ? "min-h-[150px] p-5" : "min-h-[76px] p-4",
        className
      ].join(" ")}
    >
      <div>
        <span className="mx-auto mb-2 flex h-9 w-12 items-center justify-center rounded-xl border border-[#2E8BFF]/30 bg-[#2E8BFF]/15 text-sm font-black text-[#2E8BFF]">
          AD
        </span>
        <p>{label}</p>
        <p className="mt-1 text-[11px] font-semibold text-[#6E8299]">Google AdSense 자동 광고 준비</p>
      </div>
    </aside>
  );
}
