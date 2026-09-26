import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { OperationsDashboard } from "./operations-dashboard";

export default async function OperationsPage() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) notFound();

  const cookieStore = await cookies();
  const client = createServerClient(url, key, {
    cookies: {
      getAll() { return cookieStore.getAll(); },
      // Server Components cannot persist refreshed cookies. Expired sessions fail closed.
      setAll() {},
    },
  });
  const { data, error } = await client.auth.getUser();
  if (error || data.user?.app_metadata?.operations_role !== "operations_admin") notFound();

  return <OperationsDashboard />;
}
