import { FormFrame } from "@/components/platform/PageFamilies";
import { MarketListingForm } from "./listing-form";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "판매글 등록", robots: { index: false, follow: false } };

export default function NewMarketListingPage() {
  return <FormFrame width="reading"><MarketListingForm/></FormFrame>;
}
