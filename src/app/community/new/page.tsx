import { AppFrame } from "@/components/boat/AppFrame";
import { fishingSpots } from "@/data/fishing-spots";
import { productionCharterDataset } from "@/lib/charters/registry";
import { getFishingConditionProfileSpecies } from "@/lib/fishing-condition/profile-registry";
import { productionMarketDataset } from "@/lib/market/registry";
import { CommunityPostForm } from "./community-post-form";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "커뮤니티 글 작성", robots: { index: false, follow: false } };

export default function NewCommunityPostPage() {
  return <AppFrame><CommunityPostForm catalog={{
    species: getFishingConditionProfileSpecies().map(item=>({id:item.id,label:item.name})),
    fishingSpots: fishingSpots.map(item=>({id:item.id,label:`${item.name} · ${item.region}`})),
    charters: productionCharterDataset.charters.map(item=>({id:item.id,label:item.title})),
    marketListings: productionMarketDataset.listings.map(item=>({id:item.id,label:item.title})),
  }}/></AppFrame>;
}
