"use client";

import { useEffect, useState } from "react";
import {
  Calculator,
  Loader2,
  RefreshCw,
  Trash2,
  UserX,
  Users,
  X,
} from "lucide-react";
import type { VisitorRecord } from "@/lib/visitor";

interface VisitorReportProps {
  open: boolean;
  onClose: () => void;
  notify: (message: string) => void;
}

interface VisitorTotals {
  visitors: number;
  visits: number;
  calculations: number;
}

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "—";
  const seconds = Math.floor((Date.now() - then) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** Admin-only report of visitors recorded by the name gate. */
export default function VisitorReport({
  open,
  onClose,
  notify,
}: VisitorReportProps) {
  const [rows, setRows] = useState<VisitorRecord[]>([]);
  const [totals, setTotals] = useState<VisitorTotals | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    fetch("/api/visitors", { cache: "no-store" })
      .then((res) => res.json().then((data) => ({ res, data })))
      .then(({ res, data }) => {
        if (res.ok) {
          setRows(data.visitors ?? []);
          setTotals(data.totals ?? null);
          setError(null);
        } else {
          setError(data.error ?? "Failed to load visitors.");
        }
      })
      .catch(() => setError("Network error — please try again."));
  }, [open]);

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/visitors", { cache: "no-store" });
      const data = await res.json();
      if (res.ok) {
        setRows(data.visitors ?? []);
        setTotals(data.totals ?? null);
        setError(null);
      } else {
        setError(data.error ?? "Failed to load visitors.");
      }
    } catch {
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setDeleteConfirmId(null);
    onClose();
  };

  const remove = async (row: VisitorRecord) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/visitors/${row.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to delete visitor.");
        return;
      }
      setRows((prev) => prev.filter((r) => r.id !== row.id));
      setTotals((prev) =>
        prev
          ? {
              visitors: Math.max(0, prev.visitors - 1),
              visits: Math.max(0, prev.visits - row.visitCount),
              calculations: Math.max(0, prev.calculations - row.calcCount),
            }
          : null
      );
      setDeleteConfirmId(null);
      notify(`Removed ${row.name}.`);
    } catch {
      setError("Network error — please try again.");
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div
        className="animate-fade absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={handleClose}
      />
      <div className="animate-slide-up relative flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/10">
        {/* header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white">
              <Users className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Visitor Report
              </h2>
              <p className="text-xs text-slate-400">
                ভিজিটর রিপোর্ট · who used the calculator
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-emerald-500 hover:text-emerald-700 active:scale-[0.98] disabled:opacity-60"
              title="Refresh"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <button
              type="button"
              onClick={handleClose}
              aria-label="Close"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* totals */}
        {totals && (
          <div className="grid grid-cols-3 gap-px border-b border-slate-200 bg-slate-100">
            <StatChip
              icon={<Users className="h-3.5 w-3.5" />}
              label="ভিজিটর / Visitors"
              value={totals.visitors}
            />
            <StatChip
              icon={<UserX className="h-3.5 w-3.5" />}
              label="ভিজিট / Visits"
              value={totals.visits}
            />
            <StatChip
              icon={<Calculator className="h-3.5 w-3.5" />}
              label="হিসাব / Calculations"
              value={totals.calculations}
            />
          </div>
        )}

        {/* body */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {error && (
            <p className="flex items-center gap-1.5 rounded-xl bg-red-50 p-3 text-xs font-medium text-red-600 ring-1 ring-red-200/60">
              <X className="h-3.5 w-3.5 shrink-0" />
              {error}
            </p>
          )}

          {rows.length === 0 && (loading || totals === null) ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading visitors…
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <Users className="h-8 w-8 text-slate-200" />
              <p className="text-sm font-semibold text-slate-500">
                এখনো কোনো ভিজিটর রেকর্ড হয়নি
              </p>
              <p className="text-xs text-slate-400">
                Visitor records will appear here after the name gate is used.
              </p>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                  <th className="pb-2 pr-4">Name</th>
                  <th className="pb-2 pr-4 text-right">Visits</th>
                  <th className="pb-2 pr-4 text-right">Calcs</th>
                  <th className="pb-2 pr-4">Last use</th>
                  <th className="pb-2 pr-4">Last seen</th>
                  <th className="pb-2" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const confirming = deleteConfirmId === row.id;
                  const lastUse =
                    row.lastProduct && row.lastDuration
                      ? `${row.lastProduct} · ${row.lastDuration}${
                          row.lastKisti ? ` · Kisti ${row.lastKisti}` : ""
                        }`
                      : "—";
                  return (
                    <tr
                      key={row.id}
                      className="border-t border-slate-100 transition-colors hover:bg-slate-50/80"
                    >
                      <td className="max-w-[180px] truncate px-0 py-2.5 pr-4 text-sm font-semibold text-slate-800">
                        {row.name}
                      </td>
                      <td className="px-0 py-2.5 pr-4 text-right text-xs tabular-nums text-slate-600">
                        {row.visitCount}
                      </td>
                      <td className="px-0 py-2.5 pr-4 text-right text-xs tabular-nums text-slate-600">
                        {row.calcCount}
                      </td>
                      <td className="max-w-[190px] truncate px-0 py-2.5 pr-4 text-xs text-slate-500">
                        {lastUse}
                      </td>
                      <td className="whitespace-nowrap px-0 py-2.5 pr-4 text-xs text-slate-500">
                        {timeAgo(row.lastSeenAt)}
                      </td>
                      <td className="whitespace-nowrap px-0 py-2.5 text-right">
                        {confirming ? (
                          <>
                            <button
                              type="button"
                              onClick={() => void remove(row)}
                              disabled={busy}
                              className="rounded-lg bg-red-600 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
                            >
                              Confirm
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmId(null)}
                              className="ml-1.5 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-slate-400"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(row.id)}
                            disabled={busy}
                            className="rounded-lg p-2 text-slate-300 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-60"
                            title="Remove this visitor"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function StatChip({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center gap-3 bg-white px-5 py-3.5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="truncate text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
          {label}
        </p>
        <p className="text-lg font-extrabold tabular-nums leading-tight text-slate-800">
          {value}
        </p>
      </div>
    </div>
  );
}
