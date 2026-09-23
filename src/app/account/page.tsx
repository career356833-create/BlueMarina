import { AppFrame } from "@/components/boat/AppFrame";
import { AccountClient } from "./account-client";
export default async function AccountPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const preview = (await searchParams).preview === "authenticated" && process.env.NODE_ENV === "development";
  return <AppFrame><AccountClient section="overview" previewAuthenticated={preview} /></AppFrame>;
}
