"use client";

import { useState } from "react";
import { Loader2, User, X } from "lucide-react";

const VISITOR_NAME_KEY = "rebate_visitor_name";
const VISITOR_NAME_MAX_LENGTH = 100;

interface VisitorGateProps {
  open: boolean;
  onEntered: (name: string) => void;
  notify: (message: string) => void;
}

/**
 * One-time name gate for non-admin visitors. The name is stored in
 * localStorage so returning visitors are not asked again, and it is
 * reported to the server (best-effort) for the admin visitor report.
 */
export default function VisitorGate({
  open,
  onEntered,
  notify,
}: VisitorGateProps) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  const submit = async () => {
    const trimmed = name.trim().replace(/\s+/g, " ");
    if (trimmed.length === 0) {
      setError("Please enter your name.");
      return;
    }
    if (trimmed.length > VISITOR_NAME_MAX_LENGTH) {
      setError("Name must be 100 characters or fewer.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      localStorage.setItem(VISITOR_NAME_KEY, trimmed);
      // Best-effort check-in: the calculator must keep working offline.
      await fetch("/api/visitors/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      }).catch(() => {});
      notify(`Welcome, ${trimmed}!`);
      onEntered(trimmed);
      setName("");
    } catch {
      setError("Something went wrong — please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="animate-fade absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
      <div className="animate-slide-up relative w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/10">
        {/* header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white">
              <User className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                ভিজিটর নিবন্ধন
              </h2>
              <p className="text-xs text-slate-400">
                Visitor check-in before using the calculator
              </p>
            </div>
          </div>
        </div>

        {/* body */}
        <div className="px-5 py-5">
          <p className="text-xs leading-relaxed text-slate-500">
            ক্যালকুলেটর ব্যবহারের আগে আপনার নাম লিখুন। শুধুমাত্র আপনার নাম
            সংরক্ষণ হয় — এটি অ্যাডমিন ভিজিটর রিপোর্টে ব্যবহৃত হয়।
            <span className="mt-1 block text-slate-400">
              Enter your name to continue. Only your name is stored and used in
              the admin visitor report.
            </span>
          </p>

          <div className="mt-4">
            <label
              htmlFor="visitor-name"
              className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500"
            >
              আপনার নাম / Your Name
            </label>
            <div className="relative">
              <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="visitor-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                placeholder="e.g. Rahim Uddin"
                maxLength={VISITOR_NAME_MAX_LENGTH + 20}
                autoFocus
                className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-4 text-sm font-medium text-slate-800 shadow-sm outline-none transition placeholder:font-normal placeholder:text-slate-300 hover:border-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>

          {error && (
            <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-red-600">
              <X className="h-3.5 w-3.5" />
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={submit}
            disabled={busy}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <User className="h-4 w-4" />
            )}
            {busy ? "Entering…" : "Enter the calculator"}
          </button>
        </div>
      </div>
    </div>
  );
}
