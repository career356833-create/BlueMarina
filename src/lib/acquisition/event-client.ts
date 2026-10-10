"use client";
import { createClient } from "@/lib/supabase/client";
import { attribution, type EventName } from "./events";

const seen = new Map<string, number>();
let pending = Promise.resolve();
/** Serialized background requests avoid first-cookie races; never awaited by navigation or forms. */
export function observeClient(name: EventName, route: string, returnRoute?: string) {
  const key = `${name}:${route}`;
  if ((seen.get(key) ?? 0) > Date.now()) return;
  seen.set(key, Date.now() + 1800000);
  const clean = attribution(new URLSearchParams(window.location.search), document.referrer);
  pending = pending.then(async () => {
    try {
      const token = (await createClient()?.auth.getSession())?.data.session?.access_token;
      const response = await fetch("/api/acquisition/events", { method: "POST", credentials: "same-origin", keepalive: true, cache: "no-store", signal: AbortSignal.timeout(5000),
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ name, route, ...clean, ...(returnRoute ? { returnRoute } : {}) }) });
      if (!response.ok) seen.delete(key);
    } catch { seen.delete(key); }
  }).catch(() => { seen.delete(key); });
}
