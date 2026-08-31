import { Navigation } from "lucide-react";

export function NavigationCompass({ relativeBearing }: { relativeBearing: number }) {
  return (
    <div className="pointer-events-none absolute right-3 top-14 z-[500] grid size-16 place-items-center rounded-full border border-white/30 bg-[#06131a]/90 backdrop-blur-sm">
      <Navigation size={25} strokeWidth={1.4} className="text-[#d2b178] transition-transform" style={{ transform: `rotate(${relativeBearing}deg)` }} aria-hidden="true" />
      <span className="absolute bottom-1 text-[8px] text-[#a8b3ae]">TARGET</span>
    </div>
  );
}
