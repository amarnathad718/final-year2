import { StatusPoller } from "@/components/status-poller";
import Link from "next/link";

export default function NgoDashboardPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-5 px-4 py-8">
      <section className="rounded-2xl border border-amber-950/10 bg-white/80 p-5 shadow-sm">
        <h1 className="text-2xl font-semibold text-amber-950">NGO Coordination Hub</h1>
        <p className="mt-1 text-amber-900/70">Monitor assigned donations, verify deliveries, and manage beneficiaries by urgency and demand zones.</p>
      </section>
      <StatusPoller />
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
