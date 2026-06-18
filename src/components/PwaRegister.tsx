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
    const handleWindowError = (event: ErrorEvent) => {
      console.error("[Blue Marina runtime error]", {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: describeError(event.error),
        rawEvent: event
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error("[Blue Marina unhandled rejection]", {
        reason: describeError(event.reason),
        rawEvent: event
      });
    };

    window.addEventListener("error", handleWindowError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    if (!("serviceWorker" in navigator)) {
      console.log("[Blue Marina SW] serviceWorker not supported");
      return () => {
        window.removeEventListener("error", handleWindowError);
        window.removeEventListener("unhandledrejection", handleUnhandledRejection);
      };
    }

    if (process.env.NODE_ENV === "development") {
      console.log("[Blue Marina SW] development cleanup start");
      navigator.serviceWorker
        .getRegistrations()
        .then((registrations) => {
          console.log("[Blue Marina SW] existing registrations", registrations.length);
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
          .then(() => {
            console.log("[Blue Marina SW] cache cleanup success");
          })
          .catch((error: unknown) => {
            console.error("[Blue Marina SW] cache cleanup failed", describeError(error));
          });
      }

      return () => {
        window.removeEventListener("error", handleWindowError);
        window.removeEventListener("unhandledrejection", handleUnhandledRejection);
      };
    }

    if (process.env.NODE_ENV === "production") {
      try {
        console.log("[Blue Marina SW] register start");
        navigator.serviceWorker
          .register("/sw.js")
          .then((registration) => {
            console.log("[Blue Marina SW] register success", {
              scope: registration.scope,
              active: registration.active?.scriptURL,
              installing: registration.installing?.scriptURL,
              waiting: registration.waiting?.scriptURL
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
      window.removeEventListener("error", handleWindowError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);

  return null;
}
