import { AppFrame } from "@/components/boat/AppFrame";
import { MarketListingForm } from "./listing-form";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "판매글 등록", robots: { index: false, follow: false } };

export default function NewMarketListingPage() {
  return <AppFrame><MarketListingForm/></AppFrame>;
}
