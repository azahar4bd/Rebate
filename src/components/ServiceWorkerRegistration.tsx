"use client";

import { useEffect } from "react";

/**
 * Registers the service worker so the app can work offline.
 * Runs only in production (service workers need HTTPS).
 */
export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      process.env.NODE_ENV === "production"
    ) {
      const register = () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((reg) => {
            // Check for updates periodically
            setInterval(() => reg.update().catch(() => {}), 60_000);
          })
          .catch(() => {
            // SW registration failed — app still works online
          });
      };

      if (document.readyState === "complete") {
        register();
      } else {
        window.addEventListener("load", register, { once: true });
      }
    }
  }, []);

  return null;
}
