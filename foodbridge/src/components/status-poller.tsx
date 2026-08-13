"use client";

import { useEffect, useMemo, useState } from "react";
import { useRealtime } from "@/hooks/useRealtime";

type Assignment = {
  id: string;
  status: string;
  updatedAt: string;
  tracking?: {
    etaMinutes: number | null;
    estimatedArrivalAt: string | null;
    predictedDelayMinutes: number;
    delayProbabilityPct: number;
    delayRisk: "LOW" | "MEDIUM" | "HIGH";
    alertMessage: string | null;
    confidence: number;
  };
  donation: {
    foodType: string;
    pickupAddress: string;
    estimatedMeals: number;
  };
  ngo: { name: string } | null;
  volunteer: { name: string } | null;
};

export function StatusPoller() {
  const [items, setItems] = useState<Assignment[]>([]);
  const [error, setError] = useState<string>("");
  const [wsConnected, setWsConnected] = useState(false);

  // Initialize real-time WebSocket with fallback to polling
  const { isConnected, emit } = useRealtime({
    onUpdate: (data) => {
      console.log("Real-time update received:", data);
      // Update specific assignment in the list
      setItems((prev) =>
        prev.map((item) =>
          item.id === data.assignment?.id ? { ...item, ...data.assignment } : item
        )
      );
    },
    onNotification: (notification) => {
      console.log("Notification received:", notification);
      // You can trigger a toast or notification UI here
    },
  });

  useEffect(() => {
    setWsConnected(isConnected);
  }, [isConnected]);

  // Fallback: polling every 10 seconds if WebSocket is not available
  useEffect(() => {
    let timer: NodeJS.Timeout;

    const pull = async () => {
      try {
        const response = await fetch("/api/assignments", { cache: "no-store" });
        const payload = await response.json();
        if (!payload.ok) {
          throw new Error(payload.message || "Failed to fetch assignments");
        }
        setItems(payload.data);
        setError("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown polling error");
      } finally {
        // Use longer polling interval if WebSocket is connected
        timer = setTimeout(pull, wsConnected ? 30000 : 10000);
      }
    };

    pull();

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [wsConnected]);

  const latest = useMemo(() => items.slice(0, 6), [items]);
  const highRiskItems = useMemo(
    () => latest.filter((item) => item.tracking?.delayRisk === "HIGH"),
    [latest],
  );

  const formatEta = (minutes: number | null | undefined) => {
    if (minutes === null || minutes === undefined) return "ETA unavailable";
    if (minutes <= 0) return "Arriving now";
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const rem = minutes % 60;
    return `${hours}h ${rem}m`;
  };

  const riskStyles: Record<"LOW" | "MEDIUM" | "HIGH", string> = {
    LOW: "bg-emerald-100 text-emerald-900",
    MEDIUM: "bg-amber-100 text-amber-900",
    HIGH: "bg-red-100 text-red-900",
  };

  return (
    <section className="rounded-2xl border border-amber-950/10 bg-white/80 p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-amber-950">
          Live Pickup and Delivery Tracking
          {wsConnected && <span className="ml-2 inline-block h-2 w-2 rounded-full bg-green-500" title="WebSocket Connected" />}
        </h3>
        <span className="text-xs font-medium text-amber-900/70">
          {wsConnected ? "Real-time (WebSocket)" : "Updates every 10 seconds (Polling)"}
        </span>
      </div>
      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}

      {highRiskItems.length ? (
        <div className="sticky top-2 z-20 mt-3 rounded-xl border border-red-300 bg-red-50 p-3 shadow-sm">
          <p className="text-sm font-semibold text-red-900">Urgent Delay Alerts ({highRiskItems.length})</p>
          <div className="mt-2 space-y-1">
            {highRiskItems.map((item) => (
              <p key={`alert-${item.id}`} className="text-xs text-red-800">
                {item.donation.foodType} - {item.donation.pickupAddress} - ETA {formatEta(item.tracking?.etaMinutes)} - Delay {item.tracking?.delayProbabilityPct ?? 0}%
              </p>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-4 space-y-3">
        {latest.map((item) => (
          <article key={item.id} className="rounded-xl border border-amber-950/10 bg-amber-50/60 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <strong className="text-amber-950">{item.donation.foodType}</strong>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-900">{item.status}</span>
            </div>
            <p className="text-sm text-amber-900/80">{item.donation.pickupAddress}</p>
            <p className="text-sm text-amber-900/80">Meals: {item.donation.estimatedMeals}</p>
            <p className="text-xs text-amber-900/60">Assigned NGO: {item.ngo?.name ?? "TBD"} | Volunteer: {item.volunteer?.name ?? "TBD"}</p>

            <div className="mt-2 grid grid-cols-1 gap-2 text-xs sm:grid-cols-4">
              <div className="rounded-lg bg-white/70 px-2 py-1">
                <p className="text-amber-900/60">Predicted ETA</p>
                <p className="font-semibold text-amber-950">{formatEta(item.tracking?.etaMinutes)}</p>
              </div>
              <div className="rounded-lg bg-white/70 px-2 py-1">
                <p className="text-amber-900/60">Delay Forecast</p>
                <p className="font-semibold text-amber-950">{item.tracking?.predictedDelayMinutes ?? 0} min</p>
              </div>
              <div className="rounded-lg bg-white/70 px-2 py-1">
                <p className="text-amber-900/60">Delay Probability</p>
                <p className="font-semibold text-amber-950">{item.tracking?.delayProbabilityPct ?? 0}%</p>
              </div>
              <div className="rounded-lg bg-white/70 px-2 py-1">
                <p className="text-amber-900/60">Model Confidence</p>
                <p className="font-semibold text-amber-950">{Math.round((item.tracking?.confidence ?? 0) * 100)}%</p>
              </div>
            </div>

            {item.tracking ? (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2 py-1 text-xs font-semibold ${riskStyles[item.tracking.delayRisk]}`}>
                  Delay Risk: {item.tracking.delayRisk}
                </span>
                {item.tracking.alertMessage ? <span className="text-xs font-medium text-red-800">{item.tracking.alertMessage}</span> : null}
              </div>
            ) : null}
          </article>
        ))}
        {!latest.length ? <p className="text-sm text-amber-900/70">No active assignments yet.</p> : null}
      </div>
    </section>
  );
}
