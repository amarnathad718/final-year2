"use client";

import { useMemo, useState } from "react";

const CUSTOM_FOOD_OPTION = "__CUSTOM__";

const foodTypeOptions = [
  "Cooked meals",
  "Breakfast items",
  "Snacks",
  "Bakery items",
  "Rice and curry packs",
  "Chapati and sabzi packs",
  "Fresh produce",
  "Dry ration kits",
  "Dairy products",
  "Water bottles",
  "Juice packs",
  "Baby food",
  CUSTOM_FOOD_OPTION,
] as const;

const initial = {
  foodType: "Cooked meals",
  quantity: 50,
  quantityUnit: "boxes",
  estimatedMeals: 100,
  expiryDate: "",
  expiryTime: "",
  temperatureC: 8,
  handlingScore: 4,
  pickupAddress: "",
  lat: 12.9716,
  lng: 77.5946,
  imageUrl: "",
  notes: "",
};

const shelfLifeHoursByFoodType: Record<string, number> = {
  "Cooked meals": 6,
  "Breakfast items": 4,
  Snacks: 8,
  "Bakery items": 24,
  "Rice and curry packs": 6,
  "Chapati and sabzi packs": 8,
  "Fresh produce": 36,
  "Dry ration kits": 168,
  "Dairy products": 12,
  "Water bottles": 720,
  "Juice packs": 72,
  "Baby food": 24,
};

const idealStorageTempByFoodType: Record<string, number> = {
  "Cooked meals": 6,
  "Breakfast items": 8,
  Snacks: 18,
  "Bakery items": 22,
  "Rice and curry packs": 6,
  "Chapati and sabzi packs": 10,
  "Fresh produce": 8,
  "Dry ration kits": 24,
  "Dairy products": 4,
  "Water bottles": 24,
  "Juice packs": 8,
  "Baby food": 5,
};

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function toLocalDateInputValue(date: Date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function toLocalTimeInputValue(date: Date) {
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

function shelfLifeFromFoodType(foodType: string) {
  const exactMatch = shelfLifeHoursByFoodType[foodType];
  if (exactMatch) return exactMatch;

  const normalized = foodType.toLowerCase();
  if (normalized.includes("dairy") || normalized.includes("milk") || normalized.includes("paneer")) return 12;
  if (normalized.includes("rice") || normalized.includes("curry") || normalized.includes("cooked")) return 6;
  if (normalized.includes("fresh") || normalized.includes("produce") || normalized.includes("fruit") || normalized.includes("vegetable")) return 36;
  if (normalized.includes("ration") || normalized.includes("dry")) return 168;
  if (normalized.includes("water")) return 720;
  return 12;
}

function idealStorageTempFromFoodType(foodType: string) {
  const exactMatch = idealStorageTempByFoodType[foodType];
  if (typeof exactMatch === "number") return exactMatch;

  const normalized = foodType.toLowerCase();
  if (normalized.includes("dairy") || normalized.includes("milk") || normalized.includes("paneer")) return 4;
  if (normalized.includes("rice") || normalized.includes("curry") || normalized.includes("cooked")) return 6;
  if (normalized.includes("fresh") || normalized.includes("produce") || normalized.includes("fruit") || normalized.includes("vegetable")) return 8;
  if (normalized.includes("ration") || normalized.includes("dry")) return 24;
  if (normalized.includes("water")) return 24;
  return 10;
}

function suggestExpiry(foodType: string, temperatureC: number, handlingScore: number) {
  const now = new Date();
  const rounded = new Date(now);
  rounded.setMinutes(Math.ceil(rounded.getMinutes() / 15) * 15, 0, 0);

  const baseShelfLifeHours = shelfLifeFromFoodType(foodType);
  const idealStorageTemp = idealStorageTempFromFoodType(foodType);

  const tempDelta = temperatureC - idealStorageTemp;
  const temperatureFactor =
    tempDelta <= 0
      ? Math.min(1.35, 1 + Math.abs(tempDelta) * 0.03)
      : Math.max(0.2, 1 - tempDelta * 0.07);

  const safeHandling = Number.isFinite(handlingScore) ? Math.max(1, Math.min(5, handlingScore)) : 4;
  const handlingFactor = 0.75 + safeHandling * 0.08;

  const adjustedShelfLifeHours = Math.max(1, Math.round(baseShelfLifeHours * temperatureFactor * handlingFactor));
  const expiry = new Date(rounded.getTime() + adjustedShelfLifeHours * 60 * 60 * 1000);

  return {
    expiryDate: toLocalDateInputValue(expiry),
    expiryTime: toLocalTimeInputValue(expiry),
    shelfLifeHours: adjustedShelfLifeHours,
    idealStorageTemp,
  };
}

type InspectionIssue = {
  id: string;
  label: string;
  detected: boolean;
  severity: "LOW" | "MEDIUM" | "HIGH";
  reason: string;
};

type InspectionReport = {
  score: number;
  verdict: "PASS" | "REVIEW" | "BLOCK";
  verdictMessage: string;
  inspectionMode: string;
  issues: InspectionIssue[];
};

type SpoilageVisionResult = {
  spoilageRiskPct: number;
  verdict: "LIKELY_FRESH" | "CHECK_MANUALLY" | "LIKELY_SPOILED";
  confidencePct: number;
  reasons: string[];
};

function clamp(value: number, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function linePath(values: number[], width: number, height: number, ceiling?: number) {
  if (!values.length) return "";
  const max = Math.max(ceiling ?? 0, ...values, 1);
  const step = values.length === 1 ? width : width / (values.length - 1);

  return values
    .map((value, index) => {
      const x = index * step;
      const y = height - (value / max) * height;
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

function rgbToHsv(r: number, g: number, b: number) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const cmax = Math.max(rn, gn, bn);
  const cmin = Math.min(rn, gn, bn);
  const delta = cmax - cmin;

  let hue = 0;
  if (delta !== 0) {
    if (cmax === rn) {
      hue = 60 * (((gn - bn) / delta) % 6);
    } else if (cmax === gn) {
      hue = 60 * ((bn - rn) / delta + 2);
    } else {
      hue = 60 * ((rn - gn) / delta + 4);
    }
  }

  if (hue < 0) hue += 360;

  const saturation = cmax === 0 ? 0 : delta / cmax;
  const value = cmax;

  return {
    h: hue,
    s: saturation,
    v: value,
  };
}

async function analyzeImageSpoilage(file: File): Promise<SpoilageVisionResult> {
  return {
    spoilageRiskPct: 0,
    verdict: 'LIKELY_FRESH',
    confidencePct: 70,
    reasons: ['Image-based spoilage detection has been disabled.'],
  };
}

export function DonationForm() {
  const [payload, setPayload] = useState(initial);
  const [result, setResult] = useState<string>("");
  const [resultTone, setResultTone] = useState<"success" | "error" | "info">("info");
  const [customFoodType, setCustomFoodType] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [inspectionReport, setInspectionReport] = useState<InspectionReport | null>(null);
  const [spoilageVision, setSpoilageVision] = useState<SpoilageVisionResult | null>(null);

  const previewImpact = useMemo(() => {
    const effectiveFoodType = payload.foodType === CUSTOM_FOOD_OPTION ? customFoodType.trim() || "Cooked meals" : payload.foodType;
    const baseShelfLife = shelfLifeFromFoodType(effectiveFoodType);
    const idealTemp = idealStorageTempFromFoodType(effectiveFoodType);
    const tempFactor = Math.max(0.35, 1 - Math.max(0, payload.temperatureC - idealTemp) * 0.04);
    const handlingFactor = 0.75 + Math.max(1, Math.min(5, payload.handlingScore)) * 0.08;
    const quantityFactor = Math.max(0.7, Math.min(3.2, payload.quantity / 30));
    const mealsFactor = Math.max(0.7, Math.min(4.5, payload.estimatedMeals / 40));
    const score = Math.max(1, Math.round(payload.estimatedMeals * 0.9 * quantityFactor * tempFactor * handlingFactor + baseShelfLife * 2.5));

    const series = [
      score * 0.42,
      score * 0.58,
      score * 0.7,
      score * 0.84,
      score * 0.98 * mealsFactor,
      score * 1.08 * quantityFactor,
      score * 1.18 * mealsFactor * quantityFactor,
    ].map((value) => Math.max(1, Math.round(value)));

    return {
      effectiveFoodType,
      score,
      series,
      path: linePath(series, 320, 90, 1500),
    };
  }, [customFoodType, payload.foodType, payload.quantity, payload.estimatedMeals, payload.temperatureC, payload.handlingScore]);

  function resolveFoodTypeForExpiry(nextFoodType?: string) {
    const activeFoodType = typeof nextFoodType === "string" ? nextFoodType : payload.foodType;
    if (activeFoodType === CUSTOM_FOOD_OPTION) {
      const custom = customFoodType.trim();
      return custom.length >= 2 ? custom : "Cooked meals";
    }
    return activeFoodType;
  }

  function applyAutoExpiry(foodType: string, temperatureC: number, handlingScore: number) {
    const suggestion = suggestExpiry(foodType, temperatureC, handlingScore);
    setPayload((p) => ({
      ...p,
      expiryDate: suggestion.expiryDate,
      expiryTime: suggestion.expiryTime,
    }));
    setResult(
      `Expiry auto-set for ${foodType}: ${suggestion.expiryDate} ${suggestion.expiryTime} (${suggestion.shelfLifeHours}h shelf-life at ${temperatureC.toFixed(1)} C, ideal ${suggestion.idealStorageTemp} C).`,
    );
    setResultTone("info");
  }

  async function uploadImageToCloudinary(file: File) {
    const signResponse = await fetch("/api/media/sign", { method: "POST" });
    const signJson = await signResponse.json();

    if (!signJson?.ok) {
      throw new Error(signJson?.message || "Failed to sign image upload request.");
    }

    const { timestamp, folder, signature, cloudName, apiKey } = signJson.data ?? {};
    if (!timestamp || !folder || !signature || !cloudName || !apiKey) {
      throw new Error("Cloudinary is not configured. Add Cloudinary environment keys.");
    }

    const uploadBody = new FormData();
    uploadBody.append("file", file);
    uploadBody.append("api_key", String(apiKey));
    uploadBody.append("timestamp", String(timestamp));
    uploadBody.append("signature", String(signature));
    uploadBody.append("folder", String(folder));

    const uploadResponse = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: "POST",
      body: uploadBody,
    });

    const uploadJson = await uploadResponse.json();
    if (!uploadResponse.ok || !uploadJson?.secure_url) {
      throw new Error(uploadJson?.error?.message || "Image upload failed.");
    }

    return uploadJson.secure_url as string;
  }

  async function autoDetectFromImage() {
    if (!selectedImage) {
      setResult("Choose an image first to auto-detect food details.");
      setResultTone("error");
      return;
    }

    setIsRecognizing(true);
    setResult("Uploading image and detecting food type...");
    setResultTone("info");

          <div className="rounded-2xl border border-amber-950/10 bg-amber-50/60 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h4 className="font-semibold text-amber-950">Donation Impact Preview</h4>
                <p className="text-xs text-amber-900/70">This updates immediately as you edit the form.</p>
              </div>
              <span className="rounded-full bg-amber-200 px-2 py-1 text-xs font-semibold text-amber-900">
                {previewImpact.effectiveFoodType}
              </span>
            </div>

            <svg viewBox="0 0 320 100" className="mt-3 h-28 w-full">
              <defs>
                <linearGradient id="previewFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0f766e" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="#0f766e" stopOpacity="0.05" />
                </linearGradient>
              </defs>
              <path d={`${previewImpact.path} L320,100 L0,100 Z`} fill="url(#previewFill)" />
              <path d={previewImpact.path} stroke="#0f766e" strokeWidth="3" fill="none" strokeLinecap="round" />
            </svg>

            <div className="mt-2 grid grid-cols-7 gap-1 text-center text-[11px] text-amber-900/75">
              {previewImpact.series.map((value, index) => (
                <div key={`preview-${index}`}>
                  <p className="font-semibold text-amber-950">{value}</p>
                  <p>{["Now", "+1", "+2", "+3", "+4", "+5", "+6"][index]}</p>
                </div>
              ))}
            </div>

            <p className="mt-2 text-xs text-amber-900/70">
              Preview score: {previewImpact.score} | Meals: {payload.estimatedMeals} | Quantity: {payload.quantity}
            </p>
          </div>

    try {
      const spoilageVisionResult = await analyzeImageSpoilage(selectedImage);
      setSpoilageVision(spoilageVisionResult);
    } catch {
      setSpoilageVision(null);
    }

    let uploadedImageUrl = payload.imageUrl;

    try {
      uploadedImageUrl = await uploadImageToCloudinary(selectedImage);
      setPayload((p) => ({ ...p, imageUrl: uploadedImageUrl }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Image upload failed.";
      setResult(`Upload skipped (${message}). Detecting by filename only...`);
      setResultTone("info");
    }

    const recognitionResponse = await fetch("/api/food-recognition", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        imageUrl: uploadedImageUrl,
        fileName: selectedImage.name,
        quantity: payload.quantity,
        temperatureC: payload.temperatureC,
        expiryAt: payload.expiryDate && payload.expiryTime ? new Date(`${payload.expiryDate}T${payload.expiryTime}:00`).toISOString() : undefined,
      }),
    });
    const recognitionJson = await recognitionResponse.json();

    if (!recognitionJson?.ok) {
      setResult(`Auto-detection failed: ${recognitionJson?.message || "Unknown error"}`);
      setResultTone("error");
      setIsRecognizing(false);
      return;
    }

    const detectedFoodType = String(recognitionJson.data.foodType || "Cooked meals");
    const confidencePct = Number(recognitionJson.data.confidencePct || 0);
    const shouldUseCustom = !foodTypeOptions.includes(detectedFoodType as (typeof foodTypeOptions)[number]);

    setPayload((p) => ({
      ...p,
      foodType: shouldUseCustom ? CUSTOM_FOOD_OPTION : detectedFoodType,
      quantityUnit: recognitionJson.data.quantityUnit || p.quantityUnit,
      temperatureC: Number(recognitionJson.data.temperatureC ?? p.temperatureC),
      handlingScore: Number(recognitionJson.data.handlingScore ?? p.handlingScore),
      estimatedMeals: Number(recognitionJson.data.estimatedMealsSuggestion ?? p.estimatedMeals),
      imageUrl: uploadedImageUrl || p.imageUrl,
    }));

    if (shouldUseCustom) {
      setCustomFoodType(detectedFoodType);
    } else {
      setCustomFoodType("");
    }

    if (recognitionJson.data.inspection) {
      setInspectionReport(recognitionJson.data.inspection as InspectionReport);
    } else {
      setInspectionReport(null);
    }

    setResult(`Detected ${detectedFoodType} (${confidencePct}% confidence). Details auto-filled.`);
    setResultTone("success");
    setIsRecognizing(false);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setResult("Submitting donation...");
    setResultTone("info");

    if (!payload.expiryDate || !payload.expiryTime) {
      setResult("Please enter expiry date and time.");
      setResultTone("error");
      return;
    }

    const parsedExpiry = new Date(`${payload.expiryDate}T${payload.expiryTime}:00`);
    if (Number.isNaN(parsedExpiry.getTime())) {
      setResult("Please enter a valid expiry date and time.");
      setResultTone("error");
      return;
    }

    const resolvedFoodType = payload.foodType === CUSTOM_FOOD_OPTION ? customFoodType.trim() : payload.foodType;
    if (!resolvedFoodType || resolvedFoodType.length < 2) {
      setResult("Please select a food item or provide a custom food item name.");
      setResultTone("error");
      return;
    }

    const donationPayload = {
      ...payload,
      foodType: resolvedFoodType,
      expiryAt: parsedExpiry.toISOString(),
      imageUrl: payload.imageUrl.trim() ? payload.imageUrl.trim() : undefined,
      notes: payload.notes.trim() ? payload.notes.trim() : undefined,
    };

    try {
      const response = await fetch("/api/donations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(donationPayload),
      });

      const json = await response.json();

      if (!json.ok) {
        setResult(`Error: ${json.message}`);
        setResultTone("error");
        return;
      }

      const createdId = json.data.donation?.id ?? json.data.id;
      const riskLevel = json.data.spoilagePrediction?.riskLevel;
      const riskScore = json.data.spoilagePrediction?.riskScore;
      const riskMsg = riskLevel ? ` | Spoilage Risk: ${riskLevel} (${riskScore})` : "";

      let finalMessage = `Donation saved successfully.${riskMsg}`;
      let finalTone: "success" | "info" = "success";

      if (createdId) {
        const matchResponse = await fetch(`/api/donations/${createdId}/match`, {
          method: "POST",
        });
        const matchPayload = await matchResponse.json();

        if (!matchPayload.ok) {
          finalMessage = `Donation saved successfully. Auto-match pending: ${matchPayload.message}`;
          finalTone = "info";
        } else {
          finalMessage = `Donation saved and matched successfully.${riskMsg}`;
        }
      }

      setResult(finalMessage);
      setResultTone(finalTone);

      // Tell analytics widgets to refresh immediately instead of waiting for the next poll cycle.
      window.dispatchEvent(new CustomEvent("donation:created"));

      setPayload(initial);
      setCustomFoodType("");
      setInspectionReport(null);
      setSpoilageVision(null);
      setSelectedImage(null);
    } catch {
      setResult("Unable to submit donation right now. Please try again.");
      setResultTone("error");
    }
  }

  const resultClass =
    resultTone === "success"
      ? "border-emerald-300 bg-emerald-50 text-emerald-900"
      : resultTone === "error"
        ? "border-red-300 bg-red-50 text-red-800"
        : "border-amber-300 bg-amber-50 text-amber-900";

  const fieldClass = "h-11 rounded-lg border border-amber-950/20 bg-white px-3 py-2 text-sm leading-tight";

  return (
    <form onSubmit={submit} className="grid gap-3 rounded-2xl border border-amber-950/10 bg-white/80 p-5 shadow-sm">
      <h3 className="text-lg font-semibold text-amber-950">Post Surplus Food</h3>
      <div className={`min-h-12 rounded-lg border px-3 py-2 text-sm font-medium ${resultClass}`} aria-live="polite">
        {result || "Fill details and click Post and Auto-Match. Status will appear here."}
      </div>
      <label className="text-sm font-medium text-amber-950">Food item type</label>
      <select
        className={fieldClass}
        value={payload.foodType}
        onChange={(e) => {
          const selectedFoodType = e.target.value;
          setPayload((p) => ({ ...p, foodType: selectedFoodType }));

          if (selectedFoodType !== CUSTOM_FOOD_OPTION) {
            applyAutoExpiry(selectedFoodType, payload.temperatureC, payload.handlingScore);
          }
        }}
      >
        {foodTypeOptions.map((option) => (
          <option key={option} value={option}>
            {option === CUSTOM_FOOD_OPTION ? "Other (specify)" : option}
          </option>
        ))}
      </select>
      {payload.foodType === CUSTOM_FOOD_OPTION ? (
        <input
          className={fieldClass}
          placeholder="Enter custom food item"
          value={customFoodType}
          onChange={(e) => {
            const nextCustomFoodType = e.target.value;
            setCustomFoodType(nextCustomFoodType);
            if (nextCustomFoodType.trim().length >= 2) {
              applyAutoExpiry(nextCustomFoodType.trim(), payload.temperatureC, payload.handlingScore);
            }
          }}
        />
      ) : null}
      <div className="grid gap-1">
        <label className="text-xs font-semibold uppercase tracking-[0.08em] text-amber-900/80">Quantity</label>
        <input
          className={fieldClass}
          type="number"
          placeholder="Quantity"
          value={payload.quantity}
          onChange={(e) => setPayload((p) => ({ ...p, quantity: Number(e.target.value) }))}
        />
      </div>
      <input className={fieldClass} placeholder="Unit" value={payload.quantityUnit} onChange={(e) => setPayload((p) => ({ ...p, quantityUnit: e.target.value }))} />
      <div className="grid gap-1">
        <label className="text-xs font-semibold uppercase tracking-[0.08em] text-amber-900/80">Estimated Meals</label>
        <input
          className={fieldClass}
          type="number"
          placeholder="Estimated meals"
          value={payload.estimatedMeals}
          onChange={(e) => setPayload((p) => ({ ...p, estimatedMeals: Number(e.target.value) }))}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="grid gap-1">
          <label className="text-xs font-semibold uppercase tracking-[0.08em] text-amber-900/80">Expiry Date</label>
          <input
            className={fieldClass}
            type="date"
            value={payload.expiryDate}
            onChange={(e) => setPayload((p) => ({ ...p, expiryDate: e.target.value }))}
          />
        </div>
        <div className="grid gap-1">
          <label className="text-xs font-semibold uppercase tracking-[0.08em] text-amber-900/80">Expiry Time</label>
          <input
            className={fieldClass}
            type="time"
            step={60}
            value={payload.expiryTime}
            onChange={(e) => setPayload((p) => ({ ...p, expiryTime: e.target.value }))}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="grid gap-1">
          <label className="text-xs font-semibold uppercase tracking-[0.08em] text-amber-900/80">Storage Temperature (Celsius)</label>
          <input
            className={fieldClass}
            type="number"
            step="0.1"
            placeholder="Enter temperature in C"
            value={payload.temperatureC}
            onChange={(e) => {
              const nextTemperatureC = Number(e.target.value);
              setPayload((p) => ({ ...p, temperatureC: nextTemperatureC }));

              const foodTypeForExpiry = resolveFoodTypeForExpiry();
              applyAutoExpiry(foodTypeForExpiry, nextTemperatureC, payload.handlingScore);
            }}
          />
        </div>
        <div className="grid gap-1">
          <label className="text-xs font-semibold uppercase tracking-[0.08em] text-amber-900/80">Handling Quality</label>
          <select
            className={fieldClass}
            value={payload.handlingScore}
            onChange={(e) => {
              const nextHandlingScore = Number(e.target.value);
              setPayload((p) => ({ ...p, handlingScore: nextHandlingScore }));

              const foodTypeForExpiry = resolveFoodTypeForExpiry();
              applyAutoExpiry(foodTypeForExpiry, payload.temperatureC, nextHandlingScore);
            }}
          >
            <option value={5}>Handling: Excellent (5)</option>
            <option value={4}>Handling: Good (4)</option>
            <option value={3}>Handling: Fair (3)</option>
            <option value={2}>Handling: Poor (2)</option>
            <option value={1}>Handling: Critical (1)</option>
          </select>
        </div>
      </div>
      <input className={fieldClass} placeholder="Pickup address" value={payload.pickupAddress} onChange={(e) => setPayload((p) => ({ ...p, pickupAddress: e.target.value }))} />
      <div className="grid grid-cols-2 gap-2">
        <div className="grid gap-1">
          <label className="text-xs font-semibold uppercase tracking-[0.08em] text-amber-900/80">Latitude</label>
          <input
            className={fieldClass}
            type="number"
            step="any"
            placeholder="Latitude"
            value={payload.lat}
            onChange={(e) => setPayload((p) => ({ ...p, lat: Number(e.target.value) }))}
          />
        </div>
        <div className="grid gap-1">
          <label className="text-xs font-semibold uppercase tracking-[0.08em] text-amber-900/80">Longitude</label>
          <input
            className={fieldClass}
            type="number"
            step="any"
            placeholder="Longitude"
            value={payload.lng}
            onChange={(e) => setPayload((p) => ({ ...p, lng: Number(e.target.value) }))}
          />
        </div>
      </div>

        <div className="grid gap-2 rounded-lg border border-amber-950/10 bg-amber-50/40 p-3">
          <label className="text-sm font-medium text-amber-950">Food image (auto-detect)</label>
          <input
            className="h-11 rounded-lg border border-amber-950/20 bg-white px-3 py-2 text-sm leading-tight file:mr-3 file:rounded-md file:border-0 file:bg-emerald-600 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white"
            type="file"
            accept="image/*"
            onChange={(e) => setSelectedImage(e.target.files?.[0] ?? null)}
          />
          <button
            className="pressable btn-secondary h-11 rounded-lg px-4 py-2 text-sm font-semibold"
            type="button"
            onClick={autoDetectFromImage}
            disabled={isRecognizing}
          >
            {isRecognizing ? "Detecting..." : "Upload and Auto-Detect"}
          </button>
          {selectedImage ? <p className="text-xs text-amber-900/80">Selected file: {selectedImage.name}</p> : null}
        </div>

        {spoilageVision ? (
          <div
            className={`rounded-lg border p-3 ${
              spoilageVision.verdict === "LIKELY_SPOILED"
                ? "border-red-300 bg-red-50"
                : spoilageVision.verdict === "CHECK_MANUALLY"
                  ? "border-amber-300 bg-amber-50"
                  : "border-emerald-300 bg-emerald-50"
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-amber-950">AI Visual Freshness Check</p>
              <span
                className={`rounded-full px-2 py-1 text-xs font-semibold ${
                  spoilageVision.verdict === "LIKELY_SPOILED"
                    ? "bg-red-100 text-red-800"
                    : spoilageVision.verdict === "CHECK_MANUALLY"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-emerald-100 text-emerald-800"
                }`}
              >
                {spoilageVision.verdict === "LIKELY_SPOILED"
                  ? "Likely Spoiled"
                  : spoilageVision.verdict === "CHECK_MANUALLY"
                    ? "Needs Manual Check"
                    : "Likely Fresh"}
              </span>
            </div>
            <p className="mt-1 text-xs text-amber-900/80">
              Spoilage risk {spoilageVision.spoilageRiskPct}% | Confidence {spoilageVision.confidencePct}%
            </p>
            <ul className="mt-2 space-y-1 text-xs text-amber-900/85">
              {spoilageVision.reasons.map((reason) => (
                <li key={reason}>- {reason}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {inspectionReport ? (
          <div className="rounded-lg border border-amber-950/15 bg-white p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-amber-950">Image Food Safety Check</p>
              <span
                className={`rounded-full px-2 py-1 text-xs font-semibold ${
                  inspectionReport.verdict === "PASS"
                    ? "bg-emerald-100 text-emerald-800"
                    : inspectionReport.verdict === "REVIEW"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-red-100 text-red-800"
                }`}
              >
                {inspectionReport.verdict} | Score {inspectionReport.score}
              </span>
            </div>
            <p className="mt-1 text-xs text-amber-900/80">{inspectionReport.verdictMessage}</p>
            <p className="mt-1 text-[11px] uppercase tracking-wide text-amber-900/60">Mode: {inspectionReport.inspectionMode}</p>

            <div className="mt-3 grid gap-2">
              {inspectionReport.issues.map((issue) => (
                <div
                  key={issue.id}
                  className={`rounded-md border px-2 py-1.5 text-xs ${
                    issue.detected
                      ? issue.severity === "HIGH"
                        ? "border-red-300 bg-red-50 text-red-800"
                        : "border-amber-300 bg-amber-50 text-amber-900"
                      : "border-emerald-200 bg-emerald-50 text-emerald-800"
                  }`}
                >
                  <p className="font-semibold">{issue.label}: {issue.detected ? "Detected" : "Not detected"}</p>
                  <p className="mt-0.5">{issue.reason}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}

      <input className={fieldClass} placeholder="Image URL (Cloudinary)" value={payload.imageUrl} onChange={(e) => setPayload((p) => ({ ...p, imageUrl: e.target.value }))} />
      <textarea className="rounded-lg border border-amber-950/20 bg-white px-3 py-2 text-sm leading-tight" placeholder="Notes" value={payload.notes} onChange={(e) => setPayload((p) => ({ ...p, notes: e.target.value }))} rows={3} />
      <button className="pressable btn-primary h-12 rounded-lg px-4 py-2 text-base font-semibold" type="submit">
        Post and Auto-Match
      </button>
    </form>
  );
}
