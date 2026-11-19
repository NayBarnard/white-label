"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;

    let registration: ServiceWorkerRegistration | null = null;
    let reloadAfterUpdate = false;

    function handleControllerChange() {
      if (!reloadAfterUpdate) return;
      reloadAfterUpdate = false;
      window.location.reload();
    }

    function offerUpdate() {
      const waiting = registration?.waiting;
      if (!waiting || !navigator.serviceWorker.controller) return;
      if (window.confirm("A new version is available. Reload to update?")) {
        reloadAfterUpdate = true;
        waiting.postMessage({ type: "SKIP_WAITING" });
      }
    }

    function handleUpdateFound() {
      const installing = registration?.installing;
      installing?.addEventListener("statechange", () => {
        if (installing.state === "installed") offerUpdate();
      });
    }

    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);
    void navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then((currentRegistration) => {
        registration = currentRegistration;
        registration.addEventListener("updatefound", handleUpdateFound);
        offerUpdate();
      })
      .catch((error: unknown) => {
        console.error("Service worker registration failed.", error);
      });

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
      registration?.removeEventListener("updatefound", handleUpdateFound);
    };
  }, []);

  return null;
}
