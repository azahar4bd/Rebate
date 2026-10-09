"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Banknote,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Database,
  Eye,
  EyeOff,
  Layers,
  ListOrdered,
  Lock,
  LogOut,
  Pencil,
  RotateCcw,
  ShieldCheck,
  Sigma,
} from "lucide-react";
import { PRODUCTS, sortDurations, type Product } from "@/data/rebateData";
import {
  calcRebate,
  fmtInt,
  fmtRate,
  type RateRow,
} from "@/lib/rate";
import { defaultContentMap, type ContentMap } from "@/data/defaultContent";
import RateChart from "./RateChart";
import RateDatabaseModal from "./RateDatabaseModal";
import LoginModal from "./LoginModal";
import ContentEditor from "./ContentEditor";
import Marquee from "./Marquee";
import OfflineIndicator from "./OfflineIndicator";

interface CalculatorProps {
  initialRates: RateRow[];
  initialContent: ContentMap;
}

/* ---------------------------------- UI bits --------------------------------- */

function Field({
  label,
  bengali,
  icon,
  children,
}: {
  label: string;
  bengali: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <span className="mb-1.5 flex items-baseline gap-2">
        <span className="text-[13px] font-semibold text-slate-700">{label}</span>
        <span className="text-[11px] text-slate-400">{bengali}</span>
      </span>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
          {icon}
        </span>
        {children}
      </div>
    </div>
  );
}

const controlClass =
  "w-full appearance-none rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-9 text-sm font-medium text-slate-800 shadow-sm outline-none transition placeholder:font-normal placeholder:text-slate-300 hover:border-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 disabled:hover:border-slate-300";

/* ------------------------------- Main component ------------------------------ */

export default function Calculator({
  initialRates,
  initialContent,
}: CalculatorProps) {
  const [rates, setRates] = useState<RateRow[]>(initialRates);
  const [content, setContent] = useState<ContentMap>(initialContent);
  const [product, setProduct] = useState("");
  const [duration, setDuration] = useState("");
  const [requestedKisti, setKisti] = useState("");
  const [disburse, setDisburse] = useState("");
  const [showChart, setShowChart] = useState(true);
  const [dbOpen, setDbOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch fresh content on mount + cache for offline
  useEffect(() => {
    fetch("/api/content")
      .then((res) => res.json())
      .then((data) => {
        if (data.content) {
          setContent(data.content);
          try {
            localStorage.setItem(
              "rebate_content_cache",
              JSON.stringify(data.content)
            );
          } catch {}
        }
      })
      .catch(() => {
        // Offline: use localStorage cache
        try {
          const cached = localStorage.getItem("rebate_content_cache");
          if (cached) setContent(JSON.parse(cached));
        } catch {}
      });
  }, []);

  // Fetch fresh rates on mount + cache for offline
  useEffect(() => {
    fetch("/api/rates")
      .then((res) => res.json())
      .then((data) => {
        if (data.rates && Array.isArray(data.rates) && data.rates.length > 0) {
          setRates(data.rates);
          try {
            localStorage.setItem(
              "rebate_rates_cache",
              JSON.stringify(data.rates)
            );
          } catch {}
        }
      })
      .catch(() => {
        // Offline: use localStorage cache
        try {
          const cached = localStorage.getItem("rebate_rates_cache");
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setRates(parsed);
            }
          }
        } catch {}
      });
  }, []);

  // Check admin session on mount
  useEffect(() => {
    fetch("/api/auth/session")
      .then((res) => res.json())
      .then((data) => setIsAdmin(Boolean(data.isAdmin)))
      .catch(() => setIsAdmin(false));
  }, []);

  const notify = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2800);
  }, []);

  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    []
  );

  /* ------------------------------ Derived data ------------------------------ */

  const durationOptions = useMemo(() => {
    if (!product) return [];
    const durations = rates
      .filter((r) => r.product === product)
      .map((r) => r.duration);
    return [...new Set(durations)].sort(sortDurations);
  }, [rates, product]);

  const chartRows = useMemo(() => {
    if (!product || !duration) return [];
    return rates
      .filter((r) => r.product === product && r.duration === duration)
      .sort((a, b) => a.kisti - b.kisti);
  }, [rates, product, duration]);

  const kistiOptions = useMemo(() => chartRows.map((r) => r.kisti), [chartRows]);

  // A removed rate cannot remain selected or contribute to a calculation.
  const kisti = kistiOptions.includes(Number(requestedKisti)) ? requestedKisti : "";

  const selectedRate = useMemo(() => {
    if (!kisti) return undefined;
    return chartRows.find((r) => r.kisti === Number(kisti))?.rate;
  }, [chartRows, kisti]);

  const disburseNum = useMemo(() => {
    if (disburse.trim() === "") return null;
    const n = Number(disburse);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [disburse]);

  const rebate = useMemo(
    () =>
      selectedRate !== undefined && disburseNum !== null
        ? calcRebate(disburseNum, selectedRate)
        : null,
    [selectedRate, disburseNum]
  );

  /* ------------------------------- Handlers -------------------------------- */

  const reset = () => {
    setProduct("");
    setDuration("");
    setKisti("");
    setDisburse("");
  };

  const handleSaved = useCallback((row: RateRow) => {
    setRates((prev) => {
      const idx = prev.findIndex((r) => r.id === row.id);
      if (idx === -1) return [...prev, row];
      const next = [...prev];
      next[idx] = row;
      return next;
    });
  }, []);

  const handleDeleted = useCallback((id: number) => {
    setRates((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const handleRestored = useCallback((rows: RateRow[]) => {
    setRates(rows);
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore
    }
    setIsAdmin(false);
    notify("Logged out. Rate editing is now locked.");
  };

  const baseChartTitle = content.chart_title ?? "Rate Chart";
  const chartTitle =
    product && duration
      ? `${baseChartTitle} — ${product} · ${duration}`
      : baseChartTitle;

  /* --------------------------------- Render --------------------------------- */

  return (
    <div className="min-h-screen bg-[#f6f8f6] text-slate-900">
      <OfflineIndicator />

      {/* ------------------------------- Header ------------------------------- */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm shadow-emerald-600/30">
              <Sigma className="h-5 w-5" />
            </span>
            <div>
                <h1 className="text-[15px] font-bold leading-tight tracking-tight sm:text-base">
                Rebate Calculator
              </h1>
              <p className="text-[11px] leading-tight text-slate-400">
                {content.header_subtitle}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setDbOpen(true)}
            className="group flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-emerald-500 hover:text-emerald-700 active:scale-[0.98]"
          >
            <Database className="h-4 w-4 text-slate-400 transition group-hover:text-emerald-600" />
            <span className="hidden sm:inline">Rate Database</span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold tabular-nums text-slate-500 transition group-hover:bg-emerald-50 group-hover:text-emerald-700">
              {rates.length}
            </span>
          </button>

          {isAdmin && (
            <button
              type="button"
              onClick={() => setEditorOpen(true)}
              className="flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 shadow-sm transition hover:border-emerald-500 hover:bg-emerald-100 active:scale-[0.98]"
              title="Edit site content"
            >
              <Pencil className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Content</span>
            </button>
          )}
          {isAdmin ? (
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 active:scale-[0.98]"
              title="Logged in as admin — click to logout"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Admin</span>
              <LogOut className="h-3 w-3 opacity-70" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setLoginOpen(true)}
              className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-500 shadow-sm transition hover:border-slate-900 hover:text-slate-900 active:scale-[0.98]"
              title="Admin login"
            >
              <Lock className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Admin</span>
            </button>
          )}
        </div>
      </header>

      {/* Notice marquee */}
      <Marquee
        text={content.notice_text ?? ""}
        visible={content.notice_visible === "true"}
      />

      <main className="mx-auto max-w-7xl px-4 pb-20 sm:px-6">
        {/* -------------------------------- Hero -------------------------------- */}
        <section className="pb-6 pt-8 sm:pt-10 lg:pt-12">
          <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-600">
                {content.hero_badge}
              </p>
              <h2 className="mt-1.5 text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl lg:text-4xl">
                {content.hero_title}
              </h2>
            </div>
            <p className="max-w-md text-xs leading-relaxed text-slate-400 sm:text-[13px]">
              {content.hero_description}
            </p>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {PRODUCTS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setProduct(p)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition active:scale-[0.97] ${
                  product === p
                    ? "border-emerald-600 bg-emerald-600 text-white shadow-sm"
                    : "border-slate-300 bg-white text-slate-600 hover:border-emerald-400 hover:text-emerald-700"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </section>

        {/* ------------------- Two-column: form+result | chart ------------------- */}
        <div className="grid items-start gap-6 lg:grid-cols-[1fr_420px]">
          {/* ------------------------------ Left column ------------------------------ */}
          <div className="space-y-6">
            {/* ------------------------------ Input form ----------------------------- */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Product" bengali="প্রোডাক্ট" icon={<Layers className="h-4 w-4" />}>
                  <select
                    value={product}
                    onChange={(e) => {
                      setProduct(e.target.value);
                      setDuration("");
                      setKisti("");
                    }}
                    className={controlClass}
                    aria-label="Product"
                  >
                    <option value="">Select Product</option>
                    {PRODUCTS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </Field>

                <Field label="Duration" bengali="মেয়াদ" icon={<CalendarDays className="h-4 w-4" />}>
                  <select
                    value={duration}
                    onChange={(e) => {
                      setDuration(e.target.value);
                      setKisti("");
                    }}
                    disabled={!product}
                    className={controlClass}
                    aria-label="Duration"
                  >
                    <option value="">Select Duration</option>
                    {durationOptions.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </Field>

                <Field label="Advance Kisti" bengali="অগ্রিম কিস্তি" icon={<ListOrdered className="h-4 w-4" />}>
                  <select
                    value={kisti}
                    onChange={(e) => setKisti(e.target.value)}
                    disabled={!duration || kistiOptions.length === 0}
                    className={controlClass}
                    aria-label="Advance Kisti"
                  >
                    <option value="">Select Kisti</option>
                    {kistiOptions.map((k) => (
                      <option key={k} value={k}>
                        Kisti {k}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </Field>

                <Field label="Disburse (Tk)" bengali="ঋণ বিতরণ" icon={<Banknote className="h-4 w-4" />}>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={disburse}
                    onChange={(e) => setDisburse(e.target.value)}
                    placeholder="50000"
                    className={controlClass}
                    aria-label="Disburse amount in Taka"
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-300">
                    ৳
                  </span>
                </Field>
              </div>

              <div className="mt-5 flex items-center justify-between">
                <p className="hidden text-[11px] text-slate-400 sm:block">
                  {content.formula_note}
                </p>
                <button
                  type="button"
                  onClick={reset}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-red-300 hover:bg-red-50 hover:text-red-600 active:scale-[0.98]"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset
                </button>
              </div>
            </section>

            {/* ----------------------------- Dashboard ------------------------------ */}
            <section>
              {/* Desktop: prominent result card */}
              <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:block">
                {/* Big rebate header */}
                <div className="bg-gradient-to-br from-emerald-600 via-emerald-600 to-emerald-700 p-6 text-white sm:p-8">
                  <div className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-100">
                        Total Rebate (Tk)
                      </p>
                      <p className="mt-2 text-5xl font-extrabold tabular-nums leading-none tracking-tight xl:text-6xl">
                        {rebate !== null ? (
                          <span key={rebate} className="animate-pop inline-block">
                            ৳ {fmtInt(rebate)}
                          </span>
                        ) : (
                          <span className="text-emerald-300/60">—</span>
                        )}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-100">
                        Rate
                      </p>
                      <p className="mt-2 text-3xl font-extrabold tabular-nums leading-none">
                        {selectedRate !== undefined ? fmtRate(selectedRate) : "—"}
                      </p>
                    </div>
                  </div>
                  <p className="mt-5 border-t border-white/15 pt-3 text-[11px] text-emerald-100/80">
                    {content.formula_note}
                  </p>
                </div>

                {/* Details grid */}
                <div className="grid grid-cols-4 divide-x divide-slate-100">
                  <DetailCell label="Product" value={product || "—"} highlight />
                  <DetailCell label="Duration" value={duration || "—"} />
                  <DetailCell
                    label="Advance Kisti"
                    value={kisti ? `Kisti ${kisti}` : "—"}
                  />
                  <DetailCell
                    label="Disburse (Tk)"
                    value={disburseNum !== null ? fmtInt(disburseNum) : "—"}
                  />
                </div>
              </div>

              {/* Mobile: 2-column cards + big rebate card */}
              <div className="grid grid-cols-2 gap-3 lg:hidden">
                <MobileCard label="Product" value={product || "—"} />
                <MobileCard label="Duration" value={duration || "—"} />
                <MobileCard label="Advance Kisti" value={kisti ? `Kisti ${kisti}` : "—"} />
                <MobileCard
                  label="Disburse (Tk)"
                  value={disburseNum !== null ? fmtInt(disburseNum) : "—"}
                />
                <div className="col-span-2 overflow-hidden rounded-2xl bg-emerald-600 p-5 text-white shadow-md shadow-emerald-600/25">
                  <div className="flex items-end justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-100">
                        Total Rebate (Tk)
                      </p>
                      <p className="mt-1.5 truncate text-4xl font-extrabold tabular-nums leading-none">
                        {rebate !== null ? `৳${fmtInt(rebate)}` : "—"}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-100">
                        Rate
                      </p>
                      <p className="mt-1.5 text-2xl font-extrabold tabular-nums leading-none">
                        {selectedRate !== undefined ? fmtRate(selectedRate) : "—"}
                      </p>
                    </div>
                  </div>
                  <p className="mt-4 border-t border-white/15 pt-3 text-[11px] text-emerald-100/90">
                    {content.formula_note}
                  </p>
                </div>
              </div>
            </section>
          </div>

          {/* --------------------------- Right: sticky chart --------------------------- */}
          <div className="lg:sticky lg:top-[72px]">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <h3 className="text-base font-bold text-slate-900">
                    {chartTitle}
                  </h3>
                  {chartRows.length > 0 && (
                    <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold tabular-nums text-emerald-700">
                      {chartRows.length} kisti
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setShowChart((s) => !s)}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-900 active:scale-[0.98]"
                >
                  {showChart ? (
                    <>
                      <EyeOff className="h-3.5 w-3.5" />
                      Hide
                    </>
                  ) : (
                    <>
                      <Eye className="h-3.5 w-3.5" />
                      Show
                    </>
                  )}
                </button>
              </div>

              {showChart && (
                <RateChart
                  rows={chartRows}
                  selectedKisti={kisti ? Number(kisti) : null}
                  disburseNum={disburseNum}
                  onSelect={(k) => setKisti(String(k))}
                />
              )}
            </section>
          </div>
        </div>

        {/* -------------------------------- Footer ------------------------------- */}
        <footer className="mt-12 border-t border-slate-200 pt-6 text-center">
          <p className="text-xs text-slate-400">
            {content.footer_text} · {rates.length} rates loaded
          </p>
        </footer>
      </main>

      {/* --------------------------- Rate DB modal ------------------------------ */}
      <RateDatabaseModal
        open={dbOpen}
        rates={rates}
        isAdmin={isAdmin}
        onClose={() => setDbOpen(false)}
        onSaved={handleSaved}
        onDeleted={handleDeleted}
        onRestored={handleRestored}
        onRatesUpdated={(newRates) => setRates(newRates)}
        onLoginRequest={() => {
          setDbOpen(false);
          setLoginOpen(true);
        }}
        notify={notify}
      />

      {/* ----------------------------- Login modal ------------------------------ */}
      <LoginModal
        open={loginOpen}
        onClose={() => setLoginOpen(false)}
        onLogin={() => {
          setIsAdmin(true);
          setLoginOpen(false);
        }}
        notify={notify}
      />

      {/* --------------------------- Content editor ----------------------------- */}
      <ContentEditor
        open={editorOpen}
        content={content}
        onClose={() => setEditorOpen(false)}
        onSaved={(newContent) => setContent(newContent)}
        notify={notify}
      />

      {/* -------------------------------- Toast --------------------------------- */}
      {toast && (
        <div className="animate-toast fixed bottom-6 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-2 rounded-full bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-xl">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          {toast}
        </div>
      )}
    </div>
  );
}

/* ------------------------------ Small helpers ------------------------------- */

function Dash() {
  return <span className="text-slate-300">—</span>;
}

function DetailCell({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="px-5 py-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
        {label}
      </p>
      <p
        className={`mt-1 truncate text-sm font-bold ${
          highlight ? "text-emerald-700" : "text-slate-800"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function MobileCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
        {label}
      </p>
      <p className="mt-1.5 truncate text-[15px] font-bold text-slate-800">
        {value}
      </p>
    </div>
  );
}
