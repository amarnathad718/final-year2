import { DonationForm } from "@/components/donation-form";
import { StatusPoller } from "@/components/status-poller";
import Link from "next/link";

export default function DonorDashboardPage() {
  return (
    <main className="mx-auto grid w-full max-w-6xl gap-5 px-4 py-8 lg:grid-cols-2">
      <DonationForm />
      <StatusPoller />
      <section className="col-span-full rounded-2xl border border-amber-950/10 bg-white/80 p-5 shadow-sm">
        <div className="flex justify-end">
          <Link href="/dashboard/spoilage-image" className="inline-block rounded-lg border border-amber-900/25 px-4 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-100/70">
            🔍 Photo Spoilage Predictor
          </Link>
        </div>
      </section>
    </main>
  );
}
