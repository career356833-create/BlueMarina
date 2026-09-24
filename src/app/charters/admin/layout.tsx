import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata: Metadata = { title: "Charter administration | Blue Marina", robots: { index: false, follow: false } };

export default function CharterAdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
