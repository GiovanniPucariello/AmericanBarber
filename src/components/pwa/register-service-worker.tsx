"use client";

import { useEffect } from "react";

export function RegisterServiceWorker() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Best-effort only - a failed registration just means no offline
        // fallback page, never a broken app (nothing else depends on it).
      });
    }
  }, []);

  return null;
}
