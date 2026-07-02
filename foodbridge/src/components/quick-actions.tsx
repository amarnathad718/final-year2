import Link from "next/link";

const actions = [
  { href: "/dashboard/donor", label: "Post Surplus", sub: "Donor workflow" },
  { href: "/dashboard/ngo", label: "Claim and Coordinate", sub: "NGO workflow" },
  { href: "/dashboard/volunteer", label: "Optimize Pickups", sub: "Volunteer workflow" },
  { href: "/dashboard/admin", label: "View Impact Metrics", sub: "Admin analytics" },
];

export function QuickActions() {
  return (
    <section className="grid gap-3 sm:grid-cols-2">
      {actions.map((action) => (
        <Link
          href={action.href}
          key={action.href}
          className="pressable rounded-2xl border border-amber-950/10 bg-white/85 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <h3 className="font-semibold text-amber-950">{action.label}</h3>
          <p className="text-sm text-amber-900/70">{action.sub}</p>
        </Link>
      ))}
    </section>
  );
}
