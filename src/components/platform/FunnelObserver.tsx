"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { LANDINGS, STARTS, routeKey } from "@/lib/acquisition/events";
import { observeClient } from "@/lib/acquisition/event-client";

export function FunnelObserver() {
  const path = usePathname();
  useEffect(() => {
    if (Object.hasOwn(LANDINGS, path)) observeClient("landing_view", routeKey(path));
    if (!Object.hasOwn(STARTS, path)) return;
    const onFocus = (event: FocusEvent) => {
      if (event.isTrusted && event.target instanceof HTMLElement && event.target.matches("input:not([type=hidden]),select,textarea")) observeClient(STARTS[path], routeKey(path));
    };
    document.addEventListener("focusin", onFocus);
    return () => document.removeEventListener("focusin", onFocus);
  }, [path]);
  return null;
}
