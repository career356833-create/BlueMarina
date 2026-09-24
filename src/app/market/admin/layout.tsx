import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata: Metadata = { title: "Market administration | Blue Marina", robots: { index: false, follow: false } };

export default function MarketAdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
