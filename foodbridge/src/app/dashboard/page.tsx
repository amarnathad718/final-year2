import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

export default async function DashboardIndexPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/signin");
  }

  const role = session.user.role;
  const roleRoute =
    role === "ADMIN"
      ? "/dashboard/admin"
      : role === "DONOR"
        ? "/dashboard/donor"
        : role === "NGO"
          ? "/dashboard/ngo"
          : "/dashboard/volunteer";

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-5 px-4 py-8">
      <section className="rounded-2xl border border-amber-950/10 bg-white/80 p-5 shadow-sm">
        <h1 className="text-2xl font-semibold text-amber-950">Welcome, {session.user.name}</h1>
        <p className="text-amber-900/70">Your role: {role}</p>
        <Link href={roleRoute} className="pressable btn-primary mt-4 inline-block rounded-lg px-4 py-2 font-semibold">
          Open Role Dashboard
        </Link>
      </section>
    </main>
  );
}
