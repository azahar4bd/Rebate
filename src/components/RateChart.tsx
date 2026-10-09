"use client";

import { MousePointerClick, Table2 } from "lucide-react";
import { calcRebate, fmtInt, fmtRate, type RateRow } from "@/lib/rate";

interface RateChartProps {
  rows: RateRow[];
  selectedKisti: number | null;
  disburseNum: number | null;
  onSelect: (kisti: number) => void;
}

/**
 * Full kisti rate chart for the currently selected product + duration.
 * Every row is clickable: clicking loads that kisti into the calculator.
 */
export default function RateChart({
  rows,
  selectedKisti,
  disburseNum,
  onSelect,
}: RateChartProps) {
  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50/70 px-6 py-14 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm">
          <Table2 className="h-6 w-6 text-slate-300" />
        </span>
        <div>
          <p className="text-sm font-semibold text-slate-600">
            No rate chart available yet
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Select a product and duration above to view every kisti rate.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-3 flex items-center gap-1.5 text-xs text-slate-400">
        <MousePointerClick className="h-3.5 w-3.5" />
        Tap any row to load that kisti into the calculator.
      </p>

      <div className="scroll-slim max-h-[430px] overflow-auto rounded-xl border border-slate-200">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              <th className="px-4 py-2.5">Advance Kisti</th>
              <th className="px-4 py-2.5">Rate</th>
              <th className="px-4 py-2.5 text-right">Rebate (Tk)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const selected = row.kisti === selectedKisti;
              const rebate =
                disburseNum !== null ? calcRebate(disburseNum, row.rate) : null;
              return (
                <tr
                  key={row.id}
                  onClick={() => onSelect(row.kisti)}
                  className={`cursor-pointer border-t border-slate-100 transition-colors first:border-t-0 ${
                    selected
                      ? "bg-emerald-50/90 hover:bg-emerald-50"
                      : "hover:bg-slate-50"
                  }`}
                >
                  <td className="relative px-4 py-2.5 font-medium text-slate-800">
                    {selected && (
                      <span className="absolute inset-y-0 left-0 w-1 bg-emerald-500" />
                    )}
                    Kisti {row.kisti}
                    {selected && (
                      <span className="ml-2 rounded-full bg-emerald-600 px-2 py-0.5 align-middle text-[10px] font-bold tracking-wide text-white">
                        SELECTED
                      </span>
                    )}
                  </td>
                  <td
                    className={`px-4 py-2.5 tabular-nums ${
                      selected
                        ? "font-bold text-emerald-700"
                        : "text-slate-600"
                    }`}
                  >
                    {fmtRate(row.rate)}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">
                    {rebate !== null ? (
                      fmtInt(rebate)
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
