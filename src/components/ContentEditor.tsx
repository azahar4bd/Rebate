"use client";

import { useState } from "react";
import {
  Check,
  Loader2,
  Pencil,
  RotateCcw,
  Type,
  X,
} from "lucide-react";
import { DEFAULT_CONTENT, type ContentMap } from "@/data/defaultContent";

interface ContentEditorProps {
  open: boolean;
  content: ContentMap;
  onClose: () => void;
  onSaved: (content: ContentMap) => void;
  notify: (message: string) => void;
}

export default function ContentEditor({
  open,
  content,
  onClose,
  onSaved,
  notify,
}: ContentEditorProps) {
  const [values, setValues] = useState<ContentMap>(content);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleChange = (key: string, value: string) => {
    setValues((v) => ({ ...v, [key]: value }));
  };

  const save = async () => {
    const items = DEFAULT_CONTENT.filter(
      (f) => values[f.key] !== undefined
    ).map((f) => ({ key: f.key, value: values[f.key] }));

    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to save content.");
        return;
      }
      onSaved(data.content);
      notify("Site content updated.");
      onClose();
    } catch {
      setError("Network error — please try again.");
    } finally {
      setBusy(false);
    }
  };

  const resetToDefaults = () => {
    const defaults: ContentMap = {};
    for (const f of DEFAULT_CONTENT) {
      defaults[f.key] = f.defaultValue;
    }
    setValues(defaults);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div
        className="animate-fade absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="animate-slide-up relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/10">
        {/* header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
              <Type className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Edit Site Content
              </h2>
              <p className="text-xs text-slate-400">
                Changes are saved to the database and persist across deployments
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
        <div className="scroll-slim min-h-0 flex-1 space-y-5 overflow-auto px-5 py-5 sm:px-6">
          {DEFAULT_CONTENT.map((field) => (
            <div key={field.key}>
              <label className="mb-1.5 flex items-baseline gap-2">
                <span className="text-[13px] font-semibold text-slate-700">
                  {field.label}
                </span>
                <span className="text-[11px] text-slate-400">
                  {field.bengali}
                </span>
              </label>
              {field.key === "notice_visible" ? (
                <select
                  value={values[field.key] ?? "true"}
                  onChange={(e) => handleChange(field.key, e.target.value)}
                  className="w-full appearance-none rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-800 shadow-sm outline-none transition hover:border-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="true">Visible (দেখান)</option>
                  <option value="false">Hidden (লুকান)</option>
                </select>
              ) : field.type === "textarea" ? (
                <textarea
                  value={values[field.key] ?? ""}
                  onChange={(e) => handleChange(field.key, e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm leading-relaxed text-slate-800 shadow-sm outline-none transition placeholder:text-slate-300 hover:border-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                />
              ) : (
                <input
                  type="text"
                  value={values[field.key] ?? ""}
                  onChange={(e) => handleChange(field.key, e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 shadow-sm outline-none transition placeholder:text-slate-300 hover:border-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                />
              )}
            </div>
          ))}

          {error && (
            <p className="flex items-center gap-1.5 text-xs font-medium text-red-600">
              <X className="h-3.5 w-3.5" />
              {error}
            </p>
          )}
        </div>

        {/* footer */}
        <div className="flex items-center justify-between gap-3 border-t border-slate-200 bg-slate-50/60 px-5 py-3.5 sm:px-6">
          <button
            type="button"
            onClick={resetToDefaults}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-900"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset to Defaults
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-400"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              disabled={busy}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
