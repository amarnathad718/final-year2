export function Hero() {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-amber-950/10 bg-gradient-to-br from-amber-100 via-orange-50 to-emerald-100 p-8 shadow-xl sm:p-12">
      <div className="pointer-events-none absolute -right-10 -top-10 h-52 w-52 rounded-full bg-emerald-300/35 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-12 -left-8 h-44 w-44 rounded-full bg-orange-300/35 blur-2xl" />
      <p className="text-sm font-semibold uppercase tracking-[0.12em] text-emerald-800">Welcome to FoodBridge</p>
      <h1 className="max-w-3xl text-3xl font-bold leading-tight text-amber-950 sm:text-5xl">
        Smart Urban Food Redistribution Network
      </h1>
      <p className="mt-4 max-w-2xl text-base text-amber-900/85 sm:text-lg">
        Real-time coordination between donors, NGOs, volunteers, and communities to reduce food waste, improve food access,
        and deliver measurable climate impact.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <span className="rounded-full bg-emerald-700 px-4 py-2 text-sm font-semibold text-amber-50">Geo-Aware Matching</span>
        <span className="rounded-full bg-amber-900 px-4 py-2 text-sm font-semibold text-amber-50">Trust and Verification</span>
        <span className="rounded-full bg-orange-700 px-4 py-2 text-sm font-semibold text-amber-50">Live Logistics Tracking</span>
      </div>
    </section>
  );
}
