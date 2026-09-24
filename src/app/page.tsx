import { HomeLanding } from "@/components/boat/home/HomeLanding";
import { canonicalMetadata } from "@/lib/release/site-url";

export const metadata = canonicalMetadata("/");

export default function HomePage() {
  return <HomeLanding />;
}
