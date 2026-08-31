import type { Metadata } from "next";
import { MarineNavigation } from "@/components/boat/navigation/MarineNavigation";
import { parseNavigationDestinationQuery, type NavigationQuery } from "@/lib/marine-navigation/adapters/navigation-destination-adapter";

export const metadata: Metadata = {
  title: "Marine Navigation | Blue Marina",
  description: "현재 위치와 목적지의 직선 거리, 방위, ETA를 제공하는 레저 항해 보조 도구",
};

export default async function MarineNavigationPage({ searchParams }: { searchParams: Promise<NavigationQuery> }) {
  const parsed = parseNavigationDestinationQuery(await searchParams);
  return <MarineNavigation initialDestination={parsed.destination ?? undefined} initialQueryError={parsed.error ?? undefined} />;
}
