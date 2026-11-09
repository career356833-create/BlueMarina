"use client";

import { useEffect, useState } from "react";

/** Keep the last saved form snapshot in memory, including while a save is in flight. */
export function useDraftExit(snapshot: string) {
  const [saved, setSaved] = useState(snapshot);
  useExitWarning(snapshot !== saved, "저장하지 않은 입력이 있습니다. 이 화면을 떠날까요?");
  return () => setSaved(snapshot);
}

export function useExitWarning(active: boolean, message: string) {
  useEffect(() => {
    if (!active) return;
    const unload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    const click = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!link || link.hasAttribute("download") || (link.target && link.target !== "_self")) return;
      const target = new URL(link.href);
      if (target.origin !== location.origin || target.pathname + target.search === location.pathname + location.search) return;
      if (!window.confirm(message)) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    };
    const traverse = (event: Event & { navigationType?: string; destination?: { sameDocument?: boolean } }) => {
      if (event.cancelable && event.navigationType === "traverse" && event.destination?.sameDocument && !window.confirm(message)) event.preventDefault();
    };
    const navigation = (window as Window & { navigation?: EventTarget }).navigation;
    navigation?.addEventListener("navigate", traverse);
    document.addEventListener("click", click, true);
    window.addEventListener("beforeunload", unload);
    return () => {
      navigation?.removeEventListener("navigate", traverse);
      document.removeEventListener("click", click, true);
      window.removeEventListener("beforeunload", unload);
    };
  }, [active, message]);
}
