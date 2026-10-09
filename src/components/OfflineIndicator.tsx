"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { CloudOff, Download } from "lucide-react";

function subscribeToConnectivity(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

/**
 * Shows a small banner when the browser is offline.
 * Also offers an "Install App" button when the PWA install prompt is available.
 */
export default function OfflineIndicator() {
  const isOnline = useSyncExternalStore(
    subscribeToConnectivity,
    () => navigator.onLine,
    () => true
  );
  const [installPrompt, setInstallPrompt] = useState<{
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: string }>;
  } | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as unknown as {
        prompt: () => Promise<void>;
        userChoice: Promise<{ outcome: string }>;
      });
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (isOnline && !installPrompt) return null;

  return (
    <>
      {/* Offline banner */}
      {!isOnline && (
        <div className="sticky top-0 z-40 flex items-center justify-center gap-2 bg-amber-500 px-4 py-2 text-center text-xs font-semibold text-amber-950">
          <CloudOff className="h-4 w-4" />
          <span>
            অফলাইন মোড — ক্যাশকৃত ডাটা দিয়ে কাজ করছি · হিসাব সঠিক, তবে রিট
            পরিবর্তন অনলাইনে সিঙ্ক হবে
          </span>
        </div>
      )}

      {/* Install prompt */}
      {isOnline && installPrompt && !installed && (
        <div className="fixed bottom-6 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-3 rounded-2xl bg-slate-900 px-4 py-3 text-white shadow-2xl">
          <div className="flex items-center gap-2">
            <Download className="h-4 w-4 text-emerald-400" />
            <div>
              <p className="text-xs font-bold">Install App</p>
              <p className="text-[10px] text-slate-400">
                অফলাইনে ব্যবহারের জন্য ইনস্টল করুন
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={async () => {
              await installPrompt.prompt();
              setInstalled(true);
              setInstallPrompt(null);
            }}
            className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-emerald-600"
          >
            Install
          </button>
          <button
            type="button"
            onClick={() => setInstalled(true)}
            className="text-slate-400 transition hover:text-white"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      )}
    </>
  );
}
