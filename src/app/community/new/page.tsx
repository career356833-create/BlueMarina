import { FormFrame } from "@/components/platform/PageFamilies";
import { fishingSpots } from "@/data/fishing-spots";
import { productionCharterDataset } from "@/lib/charters/registry";
import { getFishingConditionProfileSpecies } from "@/lib/fishing-condition/profile-registry";
import { productionMarketDataset } from "@/lib/market/registry";
import { CommunityPostForm } from "./community-post-form";
import type { Metadata } from "next";
import { checkedCreationContext } from "@/lib/acquisition/contract";

export const metadata: Metadata = { title: "커뮤니티 글 작성", robots: { index: false, follow: false } };

export default async function NewCommunityPostPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const catalog = {
    species: getFishingConditionProfileSpecies().map(item=>({id:item.id,label:item.name})),
    fishingSpots: fishingSpots.map(item=>({id:item.id,label:`${item.name} · ${item.region}`})),
    charters: productionCharterDataset.charters.map(item=>({id:item.id,label:item.title})),
    marketListings: productionMarketDataset.listings.map(item=>({id:item.id,label:item.title})),
  };
  const context = checkedCreationContext(await searchParams, catalog);
  return <FormFrame width="reading"><CommunityPostForm catalog={catalog} initialContext={context}/></FormFrame>;
}
