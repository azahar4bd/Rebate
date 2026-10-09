"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  Database,
  Loader2,
  Lock,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";
import {
  DURATION_ORDER,
  PRODUCT_ORDER,
  PRODUCTS,
  sortDurations,
} from "@/data/rebateData";
import { fmtRate, type RateRow } from "@/lib/rate";
import DurationManager from "./DurationManager";

interface RateDatabaseModalProps {
  open: boolean;
  rates: RateRow[];
  isAdmin: boolean;
  onClose: () => void;
  onSaved: (rate: RateRow) => void;
  onDeleted: (id: number) => void;
  onRestored: (rates: RateRow[]) => void;
  onRatesUpdated: (rates: RateRow[]) => void;
  onLoginRequest: () => void;
  notify: (message: string) => void;
}

type FormState = { mode: "add" } | { mode: "edit"; row: RateRow } | null;

const EMPTY_FORM = { product: "", duration: "", kisti: "", rate: "" };

export default function RateDatabaseModal({ open, ...props }: RateDatabaseModalProps) {
  return open ? <RateDatabaseModalContent {...props} /> : null;
}

function RateDatabaseModalContent({
  rates,
  isAdmin,
  onClose,
  onSaved,
  onDeleted,
  onRestored,
  onRatesUpdated,
  onLoginRequest,
  notify,
}: Omit<RateDatabaseModalProps, "open">) {
  const [search, setSearch] = useState("");
  const [productFilter, setProductFilter] = useState("");
  const [durationFilter, setDurationFilter] = useState("");
  const [form, setForm] = useState<FormState>(null);
  const [formValues, setFormValues] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [restoreConfirm, setRestoreConfirm] = useState(false);
  const [showDurations, setShowDurations] = useState(false);

  // Lock body scroll + close on Escape while open.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const durationFilterOptions = useMemo(() => {
    const filtered = productFilter
      ? rates.filter((r) => r.product === productFilter)
      : rates;
    const unique = [...new Set(filtered.map((r) => r.duration))];
    return unique.sort(sortDurations);
  }, [rates, productFilter]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rates
      .filter((r) => {
        if (productFilter && r.product !== productFilter) return false;
        if (durationFilter && r.duration !== durationFilter) return false;
        if (q) {
          const hay = `${r.product} ${r.duration} ${r.kisti} ${r.rate}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort(
        (a, b) =>
          (PRODUCT_ORDER[a.product] ?? 99) - (PRODUCT_ORDER[b.product] ?? 99) ||
          (DURATION_ORDER[a.duration] ?? 99) -
            (DURATION_ORDER[b.duration] ?? 99) ||
          a.kisti - b.kisti
      );
  }, [rates, productFilter, durationFilter, search]);

  const formDurationOptions = useMemo(() => {
    if (!formValues.product) return [] as string[];
    const unique = [
      ...new Set(
        rates
          .filter((r) => r.product === formValues.product)
          .map((r) => r.duration)
      ),
    ];
    return unique.sort(sortDurations);
  }, [rates, formValues.product]);

  const openAdd = () => {
    setForm({ mode: "add" });
    setFormValues(EMPTY_FORM);
    setFormError(null);
  };

  const openEdit = (row: RateRow) => {
    setForm({ mode: "edit", row });
    setFormValues({
      product: row.product,
      duration: row.duration,
      kisti: String(row.kisti),
      rate: String(row.rate),
    });
    setFormError(null);
  };

  const save = async () => {
    const product = formValues.product;
    const duration = formValues.duration;
    const kisti = Number(formValues.kisti);
    const rate = Number(formValues.rate);

    if (!product || !duration) {
      setFormError("Please select a product and a duration.");
      return;
    }
    if (!Number.isInteger(kisti) || kisti < 1) {
      setFormError("Kisti must be a positive whole number.");
      return;
    }
    if (!Number.isFinite(rate) || rate < 0) {
      setFormError("Rate must be a non-negative number.");
      return;
    }

    setBusy(true);
    setFormError(null);
    try {
      const isEdit = form?.mode === "edit";
      const url = isEdit ? `/api/rates/${form.row.id}` : "/api/rates";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product, duration, kisti, rate }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error ?? "Failed to save the rate.");
        return;
      }
      onSaved(data.rate);
      notify(isEdit ? "Rate updated successfully." : "New rate added.");
      setForm(null);
    } catch {
      setFormError("Network error — please try again.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: number) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/rates/${id}`, { method: "DELETE" });
      if (!res.ok) {
        notify("Failed to delete the rate.");
        return;
      }
      onDeleted(id);
      notify("Rate deleted.");
    } finally {
      setBusy(false);
      setDeleteConfirmId(null);
    }
  };

  const restore = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/rates/restore", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        notify("Failed to restore default rates.");
        return;
      }
      onRestored(data.rates as RateRow[]);
      notify("Canonical 299 rates restored.");
      setRestoreConfirm(false);
      setForm(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
      {/* backdrop */}
      <div
        className="animate-fade absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* panel */}
      <div className="animate-slide-up relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/10">
        {/* header */}
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
              <Database className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-900 sm:text-lg">
                Rate Database
              </h2>
              <p className="text-xs text-slate-400">
                {rates.length} rates stored · add, edit or delete anytime
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close rate database"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* toolbar */}
        <div className="border-b border-slate-200 bg-slate-50/60 px-5 py-3 sm:px-6">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative min-w-[180px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search kisti, rate, product…"
                className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div className="relative">
              <select
                value={productFilter}
                onChange={(e) => {
                  setProductFilter(e.target.value);
                  setDurationFilter("");
                }}
                className="appearance-none rounded-lg border border-slate-300 bg-white py-2 pl-3.5 pr-9 text-sm font-medium text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="">All Products</option>
                {PRODUCTS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>

            <div className="relative">
              <select
                value={durationFilter}
                onChange={(e) => setDurationFilter(e.target.value)}
                className="appearance-none rounded-lg border border-slate-300 bg-white py-2 pl-3.5 pr-9 text-sm font-medium text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="">All Durations</option>
                {durationFilterOptions.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>

            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowDurations((s) => !s)}
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition active:scale-[0.98] ${
                  showDurations
                    ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                    : "border-slate-300 bg-white text-slate-600 hover:border-slate-400"
                }`}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Durations
              </button>
              {isAdmin ? (
                <>
                  <button
                    type="button"
                    onClick={openAdd}
                    className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 active:scale-[0.98]"
                  >
                    <Plus className="h-4 w-4" />
                    Add Rate
                  </button>
                  {restoreConfirm ? (
                    <button
                      type="button"
                      onClick={restore}
                      disabled={busy}
                      className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-600 disabled:opacity-60"
                    >
                      <AlertTriangle className="h-4 w-4" />
                      Confirm Restore
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setRestoreConfirm(true)}
                      className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-900"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Restore Defaults
                    </button>
                  )}
                </>
              ) : (
                <button
                  type="button"
                  onClick={onLoginRequest}
                  className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700 active:scale-[0.98]"
                >
                  <Lock className="h-4 w-4" />
                  Admin Login
                </button>
              )}
            </div>
          </div>
        </div>

        {/* duration manager */}
        <DurationManager
          open={showDurations}
          isAdmin={isAdmin}
          notify={notify}
          onRatesUpdated={(newRates) => onRatesUpdated(newRates as RateRow[])}
        />

        {/* add/edit form */}
        {form && (
          <div className="animate-fade border-b border-emerald-200 bg-emerald-50/60 px-5 py-4 sm:px-6">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800">
                {form.mode === "edit"
                  ? `Edit rate #${form.row.id}`
                  : "Add a new rate"}
              </h3>
              <button
                type="button"
                onClick={() => setForm(null)}
                className="flex items-center gap-1 text-xs font-medium text-slate-500 transition hover:text-slate-800"
              >
                <X className="h-3.5 w-3.5" />
                Close
              </button>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Product
                </label>
                <div className="relative">
                  <select
                    value={formValues.product}
                    onChange={(e) =>
                      setFormValues((v) => ({
                        ...v,
                        product: e.target.value,
                        duration: "",
                      }))
                    }
                    className="w-full appearance-none rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 pr-9 text-sm font-medium outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="">Select product</option>
                    {PRODUCTS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Duration
                </label>
                <div className="relative">
                  <select
                    value={formValues.duration}
                    onChange={(e) =>
                      setFormValues((v) => ({ ...v, duration: e.target.value }))
                    }
                    disabled={!formValues.product}
                    className="w-full appearance-none rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 pr-9 text-sm font-medium outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
                  >
                    <option value="">Select duration</option>
                    {formDurationOptions.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Advance Kisti
                </label>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={formValues.kisti}
                  onChange={(e) =>
                    setFormValues((v) => ({ ...v, kisti: e.target.value }))
                  }
                  placeholder="e.g. 12"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Rate
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={formValues.rate}
                  onChange={(e) =>
                    setFormValues((v) => ({ ...v, rate: e.target.value }))
                  }
                  placeholder="e.g. 9.85"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
            </div>

            {formError && (
              <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-red-600">
                <AlertTriangle className="h-3.5 w-3.5" />
                {formError}
              </p>
            )}

            <div className="mt-4 flex items-center gap-2">
              <button
                type="button"
                onClick={save}
                disabled={busy}
                className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60"
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                {form.mode === "edit" ? "Save Changes" : "Add Rate"}
              </button>
              <button
                type="button"
                onClick={() => setForm(null)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-400"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* table */}
        <div className="scroll-slim min-h-0 flex-1 overflow-auto">
          <table className="w-full border-collapse text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="bg-white text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 shadow-[0_1px_0_0_theme(colors.slate.200)]">
                <th className="px-5 py-3 sm:px-6">#</th>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Duration</th>
                <th className="px-4 py-3">Kisti</th>
                <th className="px-4 py-3">Rate</th>
                <th className="px-5 py-3 text-right sm:px-6">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-16 text-center text-sm text-slate-400"
                  >
                    No rates match your filters.
                  </td>
                </tr>
              )}
              {filtered.map((row) => {
                const confirming = deleteConfirmId === row.id;
                return (
                  <tr
                    key={row.id}
                    className="border-t border-slate-100 transition-colors hover:bg-slate-50/80"
                  >
                    <td className="px-5 py-2.5 text-xs tabular-nums text-slate-400 sm:px-6">
                      {row.id}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="inline-flex items-center gap-2 font-semibold text-slate-800">
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            row.product === "Jagoron"
                              ? "bg-emerald-500"
                              : row.product === "Agrossor"
                                ? "bg-sky-500"
                                : row.product === "Buniyed"
                                  ? "bg-amber-500"
                                  : "bg-violet-500"
                          }`}
                        />
                        {row.product}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">{row.duration}</td>
                    <td className="px-4 py-2.5 tabular-nums text-slate-600">
                      {row.kisti}
                    </td>
                    <td className="px-4 py-2.5 font-semibold tabular-nums text-slate-800">
                      {fmtRate(row.rate)}
                    </td>
                    <td className="px-5 py-2.5 sm:px-6">
                      <div className="flex items-center justify-end gap-1.5">
                        {!isAdmin ? (
                          <span className="flex items-center gap-1 text-[11px] text-slate-300">
                            <Lock className="h-3 w-3" />
                            read-only
                          </span>
                        ) : confirming ? (
                          <>
                            <button
                              type="button"
                              onClick={() => remove(row.id)}
                              disabled={busy}
                              className="rounded-lg bg-red-600 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
                            >
                              Confirm
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmId(null)}
                              className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-slate-400"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => openEdit(row)}
                              aria-label={`Edit rate ${row.id}`}
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-emerald-50 hover:text-emerald-600"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmId(row.id)}
                              aria-label={`Delete rate ${row.id}`}
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* footer */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50/60 px-5 py-3 text-xs text-slate-400 sm:px-6">
          <span className="tabular-nums">
            Showing {filtered.length} of {rates.length} rates
          </span>
          <span className="hidden sm:block">
            Press <kbd className="rounded border border-slate-300 bg-white px-1.5 py-0.5 font-sans text-[10px] text-slate-500">Esc</kbd> to close
          </span>
        </div>
      </div>
    </div>
  );
}
