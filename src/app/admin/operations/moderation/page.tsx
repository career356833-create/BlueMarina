import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { moderationRoles } from "@/lib/operations/moderation";
import { ModerationDashboard } from "./moderation-dashboard";

export const dynamic = "force-dynamic";

export default async function ModerationPage() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) notFound();
  const cookieStore = await cookies();
  const client = createServerClient(url, key, { cookies: {
    getAll() { return cookieStore.getAll(); },
    setAll() {},
  } });
  const { data, error } = await client.auth.getUser();
  if (error || !data.user || !Object.values(moderationRoles(data.user.app_metadata)).some(Boolean)) notFound();
  return <ModerationDashboard />;
}
