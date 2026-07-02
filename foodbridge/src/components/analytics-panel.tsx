"use client";

import { useEffect, useState } from "react";

type Overview = {
  totalDonations: number;
  deliveredDonations: number;
  activeParticipants: number;
  beneficiaries: number;
  wasteReductionKg: number;
  co2SavingsKg: number;
  impactScore: number;
  heatmap: Array<{ id: string; lat: number; lng: number; estimatedMeals: number; status: string }>;
  weeklyTrend: Array<{ label: string; donations: number; meals: number }>;
  monthlyTrend: Array<{ label: string; donations: number; meals: number }>;
  peakDonationTimes: Array<{ hour: number; count: number }>;
  areasNeedingHelp: Array<{ area: string; needScore: number; pendingMeals: number; fulfilledMeals: number }>;
};

function linePath(values: number[], width: number, height: number, ceiling?: number) {
  if (!values.length) return "";
  const max = Math.max(ceiling ?? 0, ...values, 1);
  const step = values.length === 1 ? width : width / (values.length - 1);

  return values
    .map((value, index) => {
      const x = index * step;
      const y = height - (value / max) * height;
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

function hourLabel(hour: number) {
  return `${hour.toString().padStart(2, "0")}:00`;
}

export function AnalyticsPanel() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<string>("");

  useEffect(() => {
    let timer: NodeJS.Timeout;
    let disposed = false;

    const load = async () => {
      try {
        const response = await fetch("/api/analytics/overview", { cache: "no-store" });
        const payload = await response.json();
        if (!payload.ok) {
          throw new Error(payload.message || "Unable to load analytics");
        }

        setOverview(payload.data);
        setError("");
        setLastUpdated(new Date().toLocaleTimeString());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load analytics");
      } finally {
        if (!disposed) timer = setTimeout(load, 8000);
      }
    };

    const handleDonationCreated = () => {
      if (timer) clearTimeout(timer);
      load();
    };

    load();
    window.addEventListener("donation:created", handleDonationCreated);

    return () => {
      disposed = true;
      if (timer) clearTimeout(timer);
      window.removeEventListener("donation:created", handleDonationCreated);
    };
  }, []);

  if (error) {
    return <p className="rounded-xl bg-red-100 p-3 text-red-700">{error}</p>;
  }

  if (!overview) {
    return <p className="rounded-xl bg-amber-100 p-3 text-amber-950">Loading analytics...</p>;
  }

  const metrics = [
    ["Total Redistributed Batches", overview.totalDonations],
    ["Delivered Batches", overview.deliveredDonations],
    ["Beneficiaries Reached", overview.beneficiaries],
    ["Waste Reduced (kg)", overview.wasteReductionKg],
    ["CO2 Savings (kg)", overview.co2SavingsKg],
    ["Impact Score", overview.impactScore],
  ];

  // Plot meals so chart visibly changes with input size, not just record count.
  const weeklyMeals = overview.weeklyTrend.map((item) => item.meals);
  const monthlyMeals = overview.monthlyTrend.map((item) => item.meals);
  const weeklyPath = linePath(weeklyMeals, 360, 120, 1000);
  const monthlyPath = linePath(monthlyMeals, 360, 120, 20000);
  const maxPeakCount = Math.max(...overview.peakDonationTimes.map((item) => item.count), 1);

  return (
    <section className="space-y-4 rounded-2xl border border-amber-950/10 bg-white/90 p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-semibold text-amber-950">Impact Analytics Dashboard</h3>
        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-900">
          Live refresh every 8s{lastUpdated ? ` | Updated ${lastUpdated}` : ""}
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {metrics.map(([label, value]) => (
          <article key={String(label)} className="rounded-xl border border-amber-950/10 bg-amber-50/70 p-4">
            <p className="text-xs uppercase tracking-wide text-amber-900/70">{label}</p>
            <p className="text-2xl font-semibold text-emerald-800">{String(value)}</p>
          </article>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-amber-950/10 bg-gradient-to-br from-amber-100/60 to-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-amber-950">Weekly Donation Trend</h4>
            <span className="rounded-full bg-amber-200 px-2 py-1 text-xs font-semibold text-amber-900">Last 7 days</span>
          </div>
          <svg viewBox="0 0 360 130" className="mt-3 h-36 w-full">
            <defs>
              <linearGradient id="weeklyFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#16a34a" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#16a34a" stopOpacity="0.04" />
              </linearGradient>
            </defs>
            <path d={`${weeklyPath} L360,130 L0,130 Z`} fill="url(#weeklyFill)" />
            <path d={weeklyPath} stroke="#166534" strokeWidth="3" fill="none" strokeLinecap="round" />
          </svg>
          <div className="mt-2 grid grid-cols-7 gap-1 text-center text-xs text-amber-900/75">
            {overview.weeklyTrend.map((point) => (
              <div key={`wk-${point.label}`}>
                <p className="font-semibold text-amber-950">{point.donations}</p>
                <p className="text-[10px] text-amber-900/65">{point.meals} meals</p>
                <p>{point.label}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-2xl border border-amber-950/10 bg-gradient-to-br from-emerald-100/60 to-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-amber-950">Monthly Donation Trend</h4>
            <span className="rounded-full bg-emerald-200 px-2 py-1 text-xs font-semibold text-emerald-900">Last 6 months</span>
          </div>
          <svg viewBox="0 0 360 130" className="mt-3 h-36 w-full">
            <defs>
              <linearGradient id="monthlyFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0f766e" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#0f766e" stopOpacity="0.04" />
              </linearGradient>
            </defs>
            <path d={`${monthlyPath} L360,130 L0,130 Z`} fill="url(#monthlyFill)" />
            <path d={monthlyPath} stroke="#0f766e" strokeWidth="3" fill="none" strokeLinecap="round" />
          </svg>
          <div className="mt-2 grid grid-cols-6 gap-1 text-center text-xs text-amber-900/75">
            {overview.monthlyTrend.map((point) => (
              <div key={`mo-${point.label}`}>
                <p className="font-semibold text-amber-950">{point.donations}</p>
                <p className="text-[10px] text-amber-900/65">{point.meals} meals</p>
                <p>{point.label}</p>
              </div>
            ))}
          </div>
        </article>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-amber-950/10 bg-white p-4 shadow-sm">
          <h4 className="font-semibold text-amber-950">Peak Donation Times</h4>
          <p className="mt-1 text-sm text-amber-900/70">Best posting windows based on recent activity.</p>
          <div className="mt-3 space-y-2">
            {overview.peakDonationTimes.map((slot) => (
              <div key={`hour-${slot.hour}`} className="grid grid-cols-[56px_1fr_40px] items-center gap-2 text-xs">
                <span className="font-semibold text-amber-900">{hourLabel(slot.hour)}</span>
                <div className="h-2 overflow-hidden rounded-full bg-amber-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-500 to-emerald-600"
                    style={{ width: `${Math.max(8, Math.round((slot.count / maxPeakCount) * 100))}%` }}
                  />
                </div>
                <span className="text-right font-semibold text-amber-950">{slot.count}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-2xl border border-amber-950/10 bg-white p-4 shadow-sm">
          <h4 className="font-semibold text-amber-950">Areas Needing More Help</h4>
          <p className="mt-1 text-sm text-amber-900/70">Priority zones ranked by unmet meals vs fulfilled meals.</p>
          <div className="mt-3 space-y-2">
            {overview.areasNeedingHelp.map((area) => (
              <div key={area.area} className="rounded-xl border border-amber-950/10 bg-amber-50/70 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-amber-950">{area.area}</p>
                  <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-800">
                    Need Score {area.needScore}
                  </span>
                </div>
                <p className="mt-1 text-xs text-amber-900/75">
                  Pending {area.pendingMeals} meals | Fulfilled {area.fulfilledMeals} meals
                </p>
              </div>
            ))}
          </div>
        </article>
      </div>

      <div className="rounded-xl border border-amber-950/10 bg-white p-4">
        <h4 className="font-semibold text-amber-950">Hunger Heatmap (Data Preview)</h4>
        <p className="mt-1 text-sm text-amber-900/70">Use this feed with Google Maps HeatmapLayer in production maps view.</p>
        <div className="mt-3 max-h-56 overflow-auto rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          {overview.heatmap.slice(0, 12).map((point) => (
            <p key={point.id}>
              {point.lat.toFixed(4)}, {point.lng.toFixed(4)} | meals {point.estimatedMeals} | {point.status}
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}
