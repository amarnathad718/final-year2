import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

export default async function Page() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/signin");

  return (
    <main className="mx-auto max-w-4xl p-6">
      <section className="rounded-2xl border border-amber-950/10 bg-white/80 p-5 shadow-sm">
        <h2 className="text-xl font-semibold text-amber-950">Food Spoilage Image Prediction</h2>
        <p className="mt-1 text-sm text-amber-900/75">This feature has been removed.</p>
      </section>
    </main>
  );
}
