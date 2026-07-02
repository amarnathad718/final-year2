"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";

export default function SignInPage() {
  const [email, setEmail] = useState("admin@foodbridge.org");
  const [password, setPassword] = useState("Passw0rd!");
  const [message, setMessage] = useState("");

  async function redirectToRoleDashboard() {
    const sessionResponse = await fetch("/api/auth/session", { cache: "no-store" });
    const session = await sessionResponse.json();
    const role = session?.user?.role;

    const roleRoute =
      role === "ADMIN"
        ? "/dashboard/admin"
        : role === "DONOR"
          ? "/dashboard/donor"
          : role === "NGO"
            ? "/dashboard/ngo"
            : "/dashboard/volunteer";

    window.location.href = roleRoute;
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("Signing in...");

    const result = await signIn("credentials", {
      redirect: false,
      email,
      password,
      callbackUrl: "/dashboard/admin",
    });

    if (result?.error) {
      setMessage("Invalid credentials.");
      return;
    }

    setMessage("Sign-in successful. Redirecting...");
    await redirectToRoleDashboard();
  }

  async function quickDemoAdminLogin() {
    setMessage("Signing in as Demo Admin...");
    const result = await signIn("credentials", {
      redirect: false,
      email: "admin@foodbridge.org",
      password: "Passw0rd!",
      callbackUrl: "/dashboard/admin",
    });

    if (result?.error) {
      setMessage("Invalid credentials.");
      return;
    }

    setMessage("Sign-in successful. Redirecting...");
    await redirectToRoleDashboard();
  }

  return (
    <main className="flex min-h-[calc(100vh-80px)] w-full items-center justify-center bg-[linear-gradient(135deg,#f5f3e7_0%,#eef7f2_45%,#e8f0fb_100%)] px-4 py-10">
      <section className="grid w-full max-w-4xl overflow-hidden rounded-3xl border border-emerald-900/10 bg-white shadow-[0_24px_60px_rgba(19,44,36,0.12)] lg:grid-cols-[0.95fr_1.05fr]">
        <aside className="bg-[linear-gradient(180deg,#0d6f56_0%,#0a4b54_100%)] p-8 text-emerald-50">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-100/90">Dashboard Access</p>
          <h1 className="mt-3 text-3xl font-bold leading-tight">FoodBridge Login</h1>
          <p className="mt-4 text-sm leading-6 text-emerald-100/90">
            Sign in to continue to your role-based dashboard. Access is validated on every dashboard entry.
          </p>
          <div className="mt-6 rounded-2xl bg-white/10 p-4 text-sm">
            <p className="font-semibold">Demo Credentials</p>
            <p className="mt-2">Email: admin@foodbridge.org</p>
            <p>Password: Passw0rd!</p>
          </div>
        </aside>

        <form onSubmit={onSubmit} className="p-8">
          <h2 className="text-2xl font-bold text-slate-900">Login</h2>
          <p className="mt-1 text-sm text-slate-600">Enter your email and password to continue.</p>

          <div className="mt-6 space-y-4">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Email ID</label>
              <input
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="admin@foodbridge.org"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Password</label>
              <input
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Passw0rd!"
              />
            </div>

            <div className="flex items-center justify-between text-xs text-slate-600">
              <label className="flex items-center gap-2">
                <input type="checkbox" className="h-3.5 w-3.5 accent-emerald-600" defaultChecked />
                Remember me
              </label>
              <a href="#" className="font-medium text-emerald-700 hover:text-emerald-800">
                Forgot password?
              </a>
            </div>
          </div>

          <button className="pressable btn-primary mt-6 w-full rounded-xl px-4 py-3 text-sm font-semibold uppercase tracking-[0.12em]" type="submit">
            Login
          </button>
          <button
            className="pressable btn-secondary mt-3 w-full rounded-xl px-4 py-3 text-sm font-semibold"
            type="button"
            onClick={quickDemoAdminLogin}
          >
            Login as Demo Admin
          </button>

          {message ? <p className="mt-4 text-center text-sm text-emerald-700">{message}</p> : null}
        </form>
      </section>
    </main>
  );
}
