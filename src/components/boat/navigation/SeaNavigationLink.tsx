import Link from "next/link";
import { Navigation2 } from "lucide-react";
import { buildNavigationHref } from "@/lib/marine-navigation/adapters/navigation-destination-adapter";
import type { NavigationDestination } from "@/lib/marine-navigation/types";

export function SeaNavigationLink({ destination }: { destination: NavigationDestination }) {
  return <Link href={buildNavigationHref(destination)} className="inline-flex min-h-11 w-full items-center justify-center gap-2 border border-[#d2b178]/55 bg-[#d2b178]/10 px-4 text-sm font-black text-[#f0d5a5] hover:bg-[#d2b178]/20"><Navigation2 size={16} />여기로 항해</Link>;
}
