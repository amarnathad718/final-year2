import Link from "next/link";

const links = [
  { href: "/", label: "Home" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/donor", label: "Donor" },
  { href: "/dashboard/ngo", label: "NGO" },
  { href: "/dashboard/volunteer", label: "Volunteer" },
  { href: "/dashboard/admin", label: "Admin" },
];

export function AppNav() {
  return (
    <nav className="sticky top-0 z-50 border-b border-amber-950/10 bg-amber-50/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
        <Link href="/" className="mr-3 text-2xl font-extrabold tracking-tight text-emerald-800 transition hover:text-emerald-700">
          FoodBridge
        </Link>
        {links.map((link) => (
          <Link
            key={`${link.label}-${link.href}`}
            href={link.href}
            className="pressable btn-pill rounded-full px-4 py-1.5 text-sm font-semibold tracking-wide transition"
          >
            {link.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
