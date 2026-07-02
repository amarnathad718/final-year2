import { AnalyticsPanel } from "@/components/analytics-panel";
import { DonationForm } from "@/components/donation-form";
import { HeatmapMap } from "@/components/heatmap-map";
import Link from "next/link";

export default function AdminDashboardPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-5 px-4 py-8">
      <section className="rounded-2xl border border-amber-950/10 bg-white/80 p-5 shadow-sm">
        <h1 className="text-2xl font-semibold text-amber-950">Admin Impact Command Center</h1>
        <p className="mt-1 text-amber-900/70">
          Monitor redistribution outcomes, trust health, and hunger-zone intensity in one place.
        </p>
      </section>

      <section className="rounded-2xl border border-amber-950/10 bg-white/80 p-5 shadow-sm">
        <h2 className="text-xl font-semibold text-amber-950">Explainable Smart Allocation Engine</h2>
        <p className="mt-2 text-sm text-amber-900/75">
          Matching now uses weighted scoring with transparent reasoning across distance, urgency, trust, demand, and capacity.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <article className="rounded-xl border border-amber-950/10 bg-amber-50/70 p-3 text-sm"><p className="text-amber-900/70">Distance</p><p className="font-semibold text-emerald-800">0.28</p></article>
          <article className="rounded-xl border border-amber-950/10 bg-amber-50/70 p-3 text-sm"><p className="text-amber-900/70">Urgency</p><p className="font-semibold text-emerald-800">0.25</p></article>
          <article className="rounded-xl border border-amber-950/10 bg-amber-50/70 p-3 text-sm"><p className="text-amber-900/70">Trust</p><p className="font-semibold text-emerald-800">0.18</p></article>
          <article className="rounded-xl border border-amber-950/10 bg-amber-50/70 p-3 text-sm"><p className="text-amber-900/70">Demand</p><p className="font-semibold text-emerald-800">0.19</p></article>
          <article className="rounded-xl border border-amber-950/10 bg-amber-50/70 p-3 text-sm"><p className="text-amber-900/70">Capacity</p><p className="font-semibold text-emerald-800">0.10</p></article>
        </div>
      </section>

      <section className="rounded-2xl border border-amber-950/10 bg-white/80 p-5 shadow-sm">
        <h2 className="text-xl font-semibold text-amber-950">Quick Donation Intake With Image Detection</h2>
        <p className="mt-2 text-sm text-amber-900/75">
          Upload a food image to auto-detect donation details and run food-safety issue checks.
        </p>
        <div className="mt-4">
          <DonationForm />
        </div>
      </section>

      <AnalyticsPanel />
      <HeatmapMap />
      <section className="rounded-2xl border border-amber-950/10 bg-white/80 p-5 shadow-sm">
        <div className="flex justify-end">
          <Link href="/dashboard/spoilage-image" className="inline-block rounded-lg border border-amber-900/25 px-4 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-100/70">
            🔍 Photo Spoilage Predictor
          </Link>
        </div>
      </section>
    </main>
  );
}
