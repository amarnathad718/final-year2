"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

const roles = ["DONOR", "NGO", "VOLUNTEER", "ADMIN"] as const;

export default function RegisterPage() {
  const [status, setStatus] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "DONOR",
    organization: "",
  });

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("Creating account...");

    const response = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const payload = await response.json();
    if (!payload.ok) {
      setStatus(payload.message || "Registration failed.");
      return;
    }

    setStatus("Account created. Opening FoodBridge...");
    const roleRoute =
      form.role === "ADMIN"
        ? "/dashboard/admin"
        : form.role === "DONOR"
          ? "/dashboard/donor"
          : form.role === "NGO"
            ? "/dashboard/ngo"
            : "/dashboard/volunteer";

    const loginResult = await signIn("credentials", {
      redirect: false,
      email: form.email,
      password: form.password,
      callbackUrl: roleRoute,
    });

    if (loginResult?.error) {
      setStatus("Account created. Please sign in to continue.");
      return;
    }

    window.location.href = loginResult?.url ?? roleRoute;
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 items-center px-4 py-10">
      <section className="grid w-full gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-3xl border border-amber-950/10 bg-white/90 p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.12em] text-emerald-800">Create Access</p>
          <h1 className="mt-2 text-3xl font-bold text-amber-950">Register for FoodBridge</h1>
          <p className="mt-3 text-sm text-amber-900/70">
            Create a donor, NGO, volunteer, or admin account to access your role-based dashboard.
          </p>
          <div className="mt-6 space-y-3 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">
            <p>Email and password are entered separately in the form on the right.</p>
            <p>After registration, FoodBridge opens automatically.</p>
          </div>
          <div className="mt-6 rounded-2xl border border-emerald-700/15 bg-emerald-50 p-4 text-sm text-emerald-900">
            Use the form to create your account and enter FoodBridge immediately after signup.
          </div>
        </div>

        <form onSubmit={submit} className="grid gap-4 rounded-3xl border border-amber-950/10 bg-white/95 p-6 shadow-sm">
          <h2 className="text-2xl font-semibold text-amber-950">Register</h2>
          <input className="rounded-lg border border-amber-950/20 px-3 py-2" placeholder="Full name" value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} />
          <input className="rounded-lg border border-amber-950/20 px-3 py-2" type="email" placeholder="Email" value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} />
          <input className="rounded-lg border border-amber-950/20 px-3 py-2" type="password" placeholder="Password" value={form.password} onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))} />
          <select className="rounded-lg border border-amber-950/20 px-3 py-2" value={form.role} onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))}>
            {roles.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
          <input className="rounded-lg border border-amber-950/20 px-3 py-2" placeholder="Organization (optional)" value={form.organization} onChange={(e) => setForm((prev) => ({ ...prev, organization: e.target.value }))} />
          <button className="pressable btn-primary rounded-lg px-4 py-2 font-semibold" type="submit">
            Create Account
          </button>
          {status ? <p className="text-sm text-amber-900">{status}</p> : null}
        </form>
      </section>
    </main>
  );
}
