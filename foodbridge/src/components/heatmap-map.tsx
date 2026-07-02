"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Severity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

type HeatPoint = {
  id: string;
  lat: number;
  lng: number;
  estimatedMeals: number;
  severity: Severity;
  severityScore: number;
  createdAt: string;
};

type TrendFrame = {
  index: number;
  label: string;
  pointCount: number;
  severityCounts: Record<Severity, number>;
  points: HeatPoint[];
};

type HeatmapPayload = {
  points: HeatPoint[];
  trend: {
    intervalHours: number;
    frames: TrendFrame[];
  };
  generatedAt: string;
};

function isValidGoogleMapsApiKey(apiKey: string | undefined) {
  if (!apiKey) return false;

  const blockedValues = [
    "replace-with-google-maps-key",
    "your-google-maps-api-key",
    "replace",
    "changeme",
  ];

  if (blockedValues.includes(apiKey.trim().toLowerCase())) return false;

  return /^AIza[0-9A-Za-z_-]{20,}$/.test(apiKey.trim());
}

const severityStyles: Record<Severity, string> = {
  LOW: "bg-emerald-100 text-emerald-900",
  MEDIUM: "bg-amber-100 text-amber-900",
  HIGH: "bg-orange-100 text-orange-900",
  CRITICAL: "bg-red-100 text-red-900",
};

const severityGradients: Record<Severity, string[]> = {
  LOW: ["rgba(16, 185, 129, 0)", "rgba(16, 185, 129, 0.35)", "rgba(5, 150, 105, 0.75)"],
  MEDIUM: ["rgba(245, 158, 11, 0)", "rgba(245, 158, 11, 0.45)", "rgba(180, 83, 9, 0.85)"],
  HIGH: ["rgba(249, 115, 22, 0)", "rgba(249, 115, 22, 0.5)", "rgba(194, 65, 12, 0.9)"],
  CRITICAL: ["rgba(239, 68, 68, 0)", "rgba(239, 68, 68, 0.55)", "rgba(153, 27, 27, 0.95)"],
};

declare global {
  interface Window {
    google?: {
      maps?: {
        Map: new (node: HTMLElement, config: unknown) => unknown;
        visualization?: {
          HeatmapLayer: new (config: {
            data: unknown[];
            map: unknown;
            radius?: number;
            opacity?: number;
            gradient?: string[];
          }) => {
            setMap: (map: unknown) => void;
          };
        };
        LatLng: new (lat: number, lng: number) => unknown;
      };
    };
  }
}

export function HeatmapMap() {
  const ref = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<unknown>(null);
  const layersRef = useRef<Record<Severity, { setMap: (map: unknown) => void } | null>>({
    LOW: null,
    MEDIUM: null,
    HIGH: null,
    CRITICAL: null,
  });

  const [payload, setPayload] = useState<HeatmapPayload | null>(null);
  const [error, setError] = useState("");
  const [selectedFrame, setSelectedFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeLayers, setActiveLayers] = useState<Record<Severity, boolean>>({
    LOW: true,
    MEDIUM: true,
    HIGH: true,
    CRITICAL: true,
  });

  const currentFrame = useMemo(() => {
    if (!payload?.trend.frames.length) return null;
    return payload.trend.frames[Math.min(selectedFrame, payload.trend.frames.length - 1)] ?? null;
  }, [payload, selectedFrame]);

  const teardownLayers = useCallback(() => {
    for (const layer of Object.values(layersRef.current)) {
      if (layer) layer.setMap(null);
    }
    layersRef.current = { LOW: null, MEDIUM: null, HIGH: null, CRITICAL: null };
  }, []);

  const drawLayers = useCallback((points: HeatPoint[], layers: Record<Severity, boolean>) => {
    if (!window.google?.maps || !mapRef.current) return;
    teardownLayers();

    const supported = window.google.maps.visualization?.HeatmapLayer;
    if (!supported) return;

    (Object.keys(layers) as Severity[]).forEach((severity) => {
      if (!layers[severity]) return;

      const severityPoints = points.filter((point) => point.severity === severity);
      if (!severityPoints.length) return;

      const weightedPoints = severityPoints.map((point) => ({
        location: new window.google!.maps!.LatLng(point.lat, point.lng),
        weight: Math.max(1, point.severityScore / 25),
      }));

      layersRef.current[severity] = new window.google.maps.visualization.HeatmapLayer({
        data: weightedPoints,
        map: mapRef.current,
        radius: severity === "CRITICAL" ? 42 : severity === "HIGH" ? 36 : 30,
        opacity: severity === "CRITICAL" ? 0.82 : 0.68,
        gradient: severityGradients[severity],
      });
    });
  }, [teardownLayers]);

  useEffect(() => {
    async function loadHeatmap() {
      try {
        const response = await fetch("/api/heatmap", { cache: "no-store" });
        const payload = await response.json();
        if (!payload.ok) throw new Error(payload.message || "Failed to fetch heatmap points");

        const data = payload.data as HeatmapPayload | HeatPoint[];
        const normalized: HeatmapPayload = Array.isArray(data)
          ? {
              points: data.map((point, index) => ({
                ...point,
                id: `legacy-${index}`,
                severity: "MEDIUM",
                severityScore: Math.max(30, point.estimatedMeals),
                createdAt: new Date().toISOString(),
              })),
              trend: {
                intervalHours: 24,
                frames: [
                  {
                    index: 0,
                    label: "Latest",
                    pointCount: data.length,
                    severityCounts: {
                      LOW: 0,
                      MEDIUM: data.length,
                      HIGH: 0,
                      CRITICAL: 0,
                    },
                    points: data.map((point, index) => ({
                      ...point,
                      id: `legacy-frame-${index}`,
                      severity: "MEDIUM",
                      severityScore: Math.max(30, point.estimatedMeals),
                      createdAt: new Date().toISOString(),
                    })),
                  },
                ],
              },
              generatedAt: new Date().toISOString(),
            }
          : data;

        setPayload(normalized);
        setSelectedFrame((current) => Math.min(current, Math.max(0, normalized.trend.frames.length - 1)));

        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
        if (!isValidGoogleMapsApiKey(apiKey)) {
          setError("Google Maps key is missing or invalid. Add a valid NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to enable map rendering.");
          return;
        }

        await new Promise<void>((resolve) => {
          if (window.google?.maps) {
            resolve();
            return;
          }
          const script = document.createElement("script");
          script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=visualization`;
          script.async = true;
          script.onload = () => resolve();
          document.body.appendChild(script);
        });

        if (!window.google?.maps || !ref.current) {
          setError("Google Maps SDK failed to load.");
          return;
        }

        const center = normalized.points[0] ?? { lat: 12.9716, lng: 77.5946 };

        mapRef.current = new window.google.maps.Map(ref.current, {
          center,
          zoom: 11,
        });

        drawLayers(normalized.trend.frames[0]?.points ?? normalized.points, {
          LOW: true,
          MEDIUM: true,
          HIGH: true,
          CRITICAL: true,
        });
        setError("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown heatmap error");
      }
    }

    loadHeatmap();

    return () => {
      teardownLayers();
    };
  }, [drawLayers, teardownLayers]);

  useEffect(() => {
    if (!payload) return;
    const points = currentFrame?.points ?? payload.points;
    drawLayers(points, activeLayers);
  }, [payload, currentFrame, activeLayers, drawLayers]);

  useEffect(() => {
    if (!payload?.trend.frames.length || !isPlaying) return;

    const timer = setInterval(() => {
      setSelectedFrame((current) => (current + 1) % payload.trend.frames.length);
    }, 1200);

    return () => clearInterval(timer);
  }, [payload, isPlaying]);

  const toggleLayer = (severity: Severity) => {
    setActiveLayers((prev) => ({ ...prev, [severity]: !prev[severity] }));
  };

  return (
    <section className="rounded-2xl border border-amber-950/10 bg-white/90 p-5 shadow-sm">
      <h3 className="text-lg font-semibold text-amber-950">Dynamic Hunger Heatmap</h3>
      <p className="mt-1 text-sm text-amber-900/70">Severity layers with time-based playback to visualize hunger pressure trends.</p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {(Object.keys(severityStyles) as Severity[]).map((severity) => (
          <button
            key={severity}
            type="button"
            onClick={() => toggleLayer(severity)}
            className={`pressable rounded-full border px-3 py-1 text-xs font-semibold ${
              activeLayers[severity]
                ? `${severityStyles[severity]} border-transparent`
                : "btn-pill border-amber-950/20 text-amber-900/60"
            }`}
          >
            {severity}
          </button>
        ))}
      </div>

      <div className="mt-3 rounded-xl border border-amber-950/10 bg-amber-50/60 p-3">
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-amber-900">
          <p>
            Trend Window: <span className="font-semibold text-amber-950">{currentFrame?.label ?? "Latest"}</span>
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsPlaying((value) => !value)}
              className="pressable btn-primary rounded-lg px-3 py-1 text-xs font-semibold"
            >
              {isPlaying ? "Pause" : "Play"} Trend
            </button>
            <span className="text-xs text-amber-900/70">{currentFrame?.pointCount ?? payload?.points.length ?? 0} points</span>
          </div>
        </div>
        <input
          type="range"
          className="mt-2 w-full"
          min={0}
          max={Math.max(0, (payload?.trend.frames.length ?? 1) - 1)}
          value={selectedFrame}
          onChange={(event) => {
            setIsPlaying(false);
            setSelectedFrame(Number(event.target.value));
          }}
        />
        {currentFrame ? (
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            {(Object.keys(currentFrame.severityCounts) as Severity[]).map((severity) => (
              <span key={`count-${severity}`} className={`rounded-full px-2 py-1 font-medium ${severityStyles[severity]}`}>
                {severity}: {currentFrame.severityCounts[severity]}
              </span>
            ))}
          </div>
        ) : null}

        {(currentFrame?.pointCount ?? payload?.points.length ?? 0) === 0 ? (
          <p className="mt-2 rounded-lg border border-amber-300 bg-amber-100/70 px-3 py-2 text-xs text-amber-900">
            No heatmap activity in this time window.
          </p>
        ) : null}
      </div>

      {error ? <p className="mt-2 text-sm text-amber-900">{error}</p> : null}
      <div ref={ref} className="mt-3 h-80 w-full rounded-xl border border-amber-950/10 bg-amber-50" />
    </section>
  );
}
