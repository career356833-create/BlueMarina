import { Suspense } from "react";
import { BottomNav } from "@/components/boat/BottomNav";
import { TodaysSeaExperience } from "@/components/boat/home/TodaysSeaExperience";

export default function TodaysSeaPage() {
  return (
    <div className="min-h-screen bg-[#030b15]">
      <TodaysSeaExperience />
      <Suspense fallback={null}>
        <BottomNav />
      </Suspense>
    </div>
  );
}
