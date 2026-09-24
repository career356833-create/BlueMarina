import { AppFrame } from "@/components/boat/AppFrame";
import { CharterOnboardingClient } from "./onboarding-client";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "출조 정보 등록", robots: { index: false, follow: false } };

export default function CharterOnboardingPage() {
  return <AppFrame><CharterOnboardingClient /></AppFrame>;
}
