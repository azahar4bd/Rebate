"use client";

import { useState } from "react";
import { KeyRound, Loader2, Lock, ShieldCheck, X } from "lucide-react";

interface LoginModalProps {
  open: boolean;
  onClose: () => void;
  onLogin: () => void;
  notify: (message: string) => void;
}

export default function LoginModal({
  open,
  onClose,
  onLogin,
  notify,
}: LoginModalProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  const submit = async () => {
    if (!password) {
      setError("Please enter the admin password.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Login failed.");
        return;
      }
      notify("Admin access granted.");
      onLogin();
      setPassword("");
    } catch {
      setError("Network error — please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div
        className="animate-fade absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="animate-slide-up relative w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/10">
        {/* header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Admin Access
              </h2>
              <p className="text-xs text-slate-400">
                Sign in to manage rates
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* body */}
        <div className="px-5 py-5">
          <div className="flex items-start gap-3 rounded-xl bg-amber-50 p-3.5 ring-1 ring-amber-200/60">
            <Lock className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <p className="text-xs leading-relaxed text-amber-700">
              Only the site owner can add, edit or delete rebate rates. All
              other visitors have read-only access.
            </p>
          </div>

          <div className="mt-4">
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Admin Password
            </label>
            <div className="relative">
              <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                placeholder="Enter password"
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
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ShieldCheck className="h-4 w-4" />
            )}
            {busy ? "Signing in…" : "Sign In"}
          </button>
        </div>
      </div>
    </div>
  );
}
