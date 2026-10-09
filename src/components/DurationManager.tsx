"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Check,
  Loader2,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import { sortDurations } from "@/data/rebateData";

interface DurationInfo {
  product: string;
  duration: string;
  kistiCount: number;
}

interface DurationManagerProps {
  open: boolean;
  isAdmin: boolean;
  notify: (message: string) => void;
  onRatesUpdated: (rates: unknown[]) => void;
}

export default function DurationManager({ open, ...props }: DurationManagerProps) {
  return open ? <DurationManagerContent {...props} /> : null;
}

function DurationManagerContent({
  isAdmin,
  notify,
  onRatesUpdated,
}: Omit<DurationManagerProps, "open">) {
  const [durations, setDurations] = useState<DurationInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const loadDurations = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/durations");
      const data = await res.json();
      setDurations(data.durations ?? []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/durations", { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => {
        if (!controller.signal.aborted) setDurations(data.durations ?? []);
      })
      .catch(() => {})
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  const refreshRates = async () => {
    try {
      const res = await fetch("/api/rates");
      const data = await res.json();
      if (data.rates) onRatesUpdated(data.rates);
    } catch {
      // ignore
    }
  };

  const saveRename = async (product: string, oldDuration: string) => {
    const newDuration = editValue.trim();
    if (!newDuration || newDuration === oldDuration) {
      setEditingKey(null);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/durations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product, oldDuration, newDuration }),
      });
      const data = await res.json();
      if (!res.ok) {
        notify(data.error ?? "Failed to rename duration.");
        return;
      }
      notify(
        `${oldDuration} → ${newDuration} (${data.renamed} rates updated)`
      );
      setEditingKey(null);
      await loadDurations();
      await refreshRates();
    } catch {
      notify("Network error — please try again.");
    } finally {
      setBusy(false);
    }
  };

  const removeDuration = async (product: string, duration: string) => {
    setBusy(true);
    try {
      const res = await fetch("/api/durations", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product, duration }),
      });
      const data = await res.json();
      if (!res.ok) {
        notify(data.error ?? "Failed to delete duration.");
        return;
      }
      notify(
        `${product} / ${duration} deleted (${data.deleted} rates removed)`
      );
      setDeleteConfirm(null);
      await loadDurations();
      await refreshRates();
    } catch {
      notify("Network error — please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="animate-fade border-b border-slate-200 bg-slate-50/70 px-5 py-4 sm:px-6">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-800">
          Manage Durations
        </h3>
        <span className="text-[11px] text-slate-400">
          {durations.length} combinations
        </span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-slate-300" />
        </div>
      ) : durations.length === 0 ? (
        <p className="py-6 text-center text-xs text-slate-400">
          No durations found.
        </p>
      ) : (
        <div className="scroll-slim max-h-56 overflow-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full border-collapse text-sm">
            <thead className="sticky top-0">
              <tr className="bg-slate-50 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                <th className="px-4 py-2">Product</th>
                <th className="px-4 py-2">Duration</th>
                <th className="px-4 py-2 text-right">Kisti</th>
                {isAdmin && <th className="px-4 py-2 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {durations.map((d) => {
                const key = `${d.product}__${d.duration}`;
                const isEditing = editingKey === key;
                const isDeleting = deleteConfirm === key;
                return (
                  <tr
                    key={key}
                    className="border-t border-slate-100 first:border-t-0"
                  >
                    <td className="px-4 py-2 font-semibold text-slate-700">
                      {d.product}
                    </td>
                    <td className="px-4 py-2">
                      {isEditing ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter")
                                saveRename(d.product, d.duration);
                              if (e.key === "Escape") setEditingKey(null);
                            }}
                            autoFocus
                            className="w-32 rounded-md border border-emerald-400 px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                          />
                          <button
                            type="button"
                            onClick={() => saveRename(d.product, d.duration)}
                            disabled={busy}
                            className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-600 text-white transition hover:bg-emerald-700 disabled:opacity-60"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingKey(null)}
                            className="flex h-6 w-6 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-700">{d.duration}</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-slate-500">
                      {d.kistiCount}
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-2">
                        <div className="flex items-center justify-end gap-1">
                          {isDeleting ? (
                            <>
                              <button
                                type="button"
                                onClick={() =>
                                  removeDuration(d.product, d.duration)
                                }
                                disabled={busy}
                                className="rounded-md bg-red-600 px-2 py-1 text-[11px] font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
                              >
                                Confirm
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteConfirm(null)}
                                className="rounded-md border border-slate-300 px-2 py-1 text-[11px] font-semibold text-slate-600 transition hover:border-slate-400"
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingKey(key);
                                  setEditValue(d.duration);
                                }}
                                disabled={busy}
                                className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition hover:bg-emerald-50 hover:text-emerald-600 disabled:opacity-50"
                                title="Rename duration"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteConfirm(key)}
                                disabled={busy}
                                className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                                title={`Delete ${d.duration} and all its rates`}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!isAdmin && (
        <p className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-400">
          <AlertTriangle className="h-3 w-3" />
          Admin login required to edit or delete durations.
        </p>
      )}
    </div>
  );
}
