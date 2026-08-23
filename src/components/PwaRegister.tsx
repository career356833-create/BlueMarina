"use client";

import { useEffect } from "react";

function describeError(value: unknown) {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack
    };
  }

  if (value instanceof Event) {
    return {
      type: value.type,
      target: value.target,
      currentTarget: value.currentTarget,
      eventPhase: value.eventPhase,
      isTrusted: value.isTrusted
    };
  }

  return value;
}

export function PwaRegister() {
  useEffect(() => {
    const handleDevelopmentRejection = (event: PromiseRejectionEvent) => {
      if (process.env.NODE_ENV === "development" && event.reason instanceof Event) {
        console.warn("[Blue Marina dev] ignored non-error browser event rejection", describeError(event.reason));
        event.preventDefault();
      }
    };

    window.addEventListener("unhandledrejection", handleDevelopmentRejection);

    if (!("serviceWorker" in navigator)) {
      return () => {
        window.removeEventListener("unhandledrejection", handleDevelopmentRejection);
      };
    }

    if (process.env.NODE_ENV === "development") {
      navigator.serviceWorker
        .getRegistrations()
        .then((registrations) => {
          registrations.forEach((registration) => registration.unregister());
        })
        .catch((error: unknown) => {
          console.error("[Blue Marina SW] unregister failed", describeError(error));
        });

      if ("caches" in window) {
        window.caches
          .keys()
          .then((keys) =>
            Promise.all(
              keys
                .filter((key) => key.startsWith("blue-marina") || key.startsWith("boat-license"))
                .map((key) => window.caches.delete(key))
            )
          )
          .catch((error: unknown) => {
            console.error("[Blue Marina SW] cache cleanup failed", describeError(error));
          });
      }

      return () => {
        window.removeEventListener("unhandledrejection", handleDevelopmentRejection);
        // Development intentionally unregisters service workers to avoid stale UI/CSS.
      };
    }

    if (process.env.NODE_ENV === "production") {
      try {
        navigator.serviceWorker
          .register("/sw.js")
          .then((registration) => {
            if (registration.waiting) {
              registration.waiting.postMessage({ type: "SKIP_WAITING" });
            }

            registration.addEventListener("updatefound", () => {
              const worker = registration.installing;
              worker?.addEventListener("statechange", () => {
                if (worker.state === "installed" && navigator.serviceWorker.controller) {
                  worker.postMessage({ type: "SKIP_WAITING" });
                }
              });
            });
          })
          .catch((error: unknown) => {
            console.error("[Blue Marina SW] register failed", describeError(error));
          });
      } catch (error: unknown) {
        console.error("[Blue Marina SW] register threw", describeError(error));
      }
    }
    return () => {
      window.removeEventListener("unhandledrejection", handleDevelopmentRejection);
    };
  }, []);

  return null;
}
