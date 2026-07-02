import type { Role } from "@prisma/client";

export type DemoUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  password: string;
};

export const demoUsers: DemoUser[] = [
  { id: "demo-admin", email: "admin@foodbridge.org", name: "Demo Admin", role: "ADMIN", password: "Passw0rd!" },
  { id: "demo-donor", email: "donor@foodbridge.org", name: "Demo Donor", role: "DONOR", password: "Passw0rd!" },
  { id: "demo-ngo", email: "ngo@foodbridge.org", name: "Demo NGO", role: "NGO", password: "Passw0rd!" },
  { id: "demo-volunteer", email: "volunteer@foodbridge.org", name: "Demo Volunteer", role: "VOLUNTEER", password: "Passw0rd!" },
];

export const isDemoMode = !process.env.DATABASE_URL;

type DemoDonation = {
  id: string;
  donorId: string;
  foodType: string;
  quantity: number;
  quantityUnit: string;
  estimatedMeals: number;
  expiryAt: string;
  pickupAddress: string;
  lat: number;
  lng: number;
  imageUrl?: string;
  notes?: string;
  status: string;
  spoilageRiskScore?: number;
  createdAt: string;
};

type DemoAssignment = {
  id: string;
  donationId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  deliveredAt?: string;
  distanceKm?: number;
  priorityScore?: number;
  urgencyMultiplier?: number;
  demandMultiplier?: number;
  donation: {
    id: string;
    foodType: string;
    estimatedMeals: number;
    pickupAddress: string;
    expiryAt?: string;
  };
  ngo: { id: string; name: string } | null;
  volunteer: { id: string; name: string } | null;
};

function seedDemoAssignments() {
  const now = Date.now();

  return [
    {
      id: "asg_demo_1",
      donationId: "don_demo_1",
      status: "MATCHED",
      createdAt: new Date(now - 1000 * 60 * 18).toISOString(),
      updatedAt: new Date(now - 1000 * 60 * 2).toISOString(),
      distanceKm: 8.2,
      priorityScore: 0.86,
      urgencyMultiplier: 1.2,
      demandMultiplier: 1.1,
      donation: {
        id: "don_demo_1",
        foodType: "Cooked meal boxes",
        estimatedMeals: 120,
        pickupAddress: "MG Road, Bengaluru",
        expiryAt: new Date(now + 1000 * 60 * 65).toISOString(),
      },
      ngo: { id: "demo-ngo", name: "Demo NGO" },
      volunteer: { id: "demo-volunteer", name: "Demo Volunteer" },
    },
    {
      id: "asg_demo_2",
      donationId: "don_demo_2",
      status: "IN_TRANSIT",
      createdAt: new Date(now - 1000 * 60 * 52).toISOString(),
      startedAt: new Date(now - 1000 * 60 * 28).toISOString(),
      updatedAt: new Date(now - 1000 * 60 * 4).toISOString(),
      distanceKm: 13.7,
      priorityScore: 0.78,
      urgencyMultiplier: 1,
      demandMultiplier: 1.15,
      donation: {
        id: "don_demo_2",
        foodType: "Bakery items",
        estimatedMeals: 90,
        pickupAddress: "Indiranagar 100 Feet Road, Bengaluru",
        expiryAt: new Date(now + 1000 * 60 * 34).toISOString(),
      },
      ngo: { id: "demo-ngo", name: "Demo NGO" },
      volunteer: { id: "demo-volunteer", name: "Demo Volunteer" },
    },
    {
      id: "asg_demo_3",
      donationId: "don_demo_3",
      status: "DELIVERED",
      createdAt: new Date(now - 1000 * 60 * 70).toISOString(),
      startedAt: new Date(now - 1000 * 60 * 55).toISOString(),
      deliveredAt: new Date(now - 1000 * 60 * 20).toISOString(),
      updatedAt: new Date(now - 1000 * 60 * 20).toISOString(),
      distanceKm: 10.4,
      priorityScore: 0.74,
      urgencyMultiplier: 1,
      demandMultiplier: 1,
      donation: {
        id: "don_demo_3",
        foodType: "Rice and curry packs",
        estimatedMeals: 180,
        pickupAddress: "Electronic City Phase 1, Bengaluru",
        expiryAt: new Date(now - 1000 * 60 * 15).toISOString(),
      },
      ngo: { id: "demo-ngo", name: "Demo NGO" },
      volunteer: { id: "demo-volunteer", name: "Demo Volunteer" },
    },
    {
      id: "asg_demo_4",
      donationId: "don_demo_4",
      status: "PICKED_UP",
      createdAt: new Date(now - 1000 * 60 * 40).toISOString(),
      startedAt: new Date(now - 1000 * 60 * 18).toISOString(),
      updatedAt: new Date(now - 1000 * 60 * 3).toISOString(),
      distanceKm: 6.3,
      priorityScore: 0.91,
      urgencyMultiplier: 1.25,
      demandMultiplier: 1.05,
      donation: {
        id: "don_demo_4",
        foodType: "Fresh produce crates",
        estimatedMeals: 140,
        pickupAddress: "Yeshwanthpur Market, Bengaluru",
        expiryAt: new Date(now + 1000 * 60 * 28).toISOString(),
      },
      ngo: { id: "demo-ngo", name: "Demo NGO" },
      volunteer: { id: "demo-volunteer", name: "Demo Volunteer" },
    },
  ] satisfies DemoAssignment[];
}

const demoAssignmentsStore: DemoAssignment[] = seedDemoAssignments();

const demoDonationsStore: DemoDonation[] = demoAssignmentsStore.map((assignment) => ({
  id: assignment.donation.id,
  donorId: "demo-donor",
  foodType: assignment.donation.foodType,
  quantity: Math.max(25, Math.round(assignment.donation.estimatedMeals / 2)),
  quantityUnit: "boxes",
  estimatedMeals: assignment.donation.estimatedMeals,
  expiryAt: assignment.donation.expiryAt ?? new Date(Date.now() + 1000 * 60 * 120).toISOString(),
  pickupAddress: assignment.donation.pickupAddress,
  lat: 12.9716,
  lng: 77.5946,
  status: assignment.status,
  createdAt: assignment.createdAt,
}));

export function demoAssignments() {
  return demoAssignmentsStore
    .slice()
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export function demoDonations() {
  return demoDonationsStore
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function addDemoDonation(payload: Omit<DemoDonation, "id" | "createdAt">) {
  const donation: DemoDonation = {
    id: `don_demo_${Date.now()}`,
    createdAt: new Date().toISOString(),
    ...payload,
  };
  demoDonationsStore.unshift(donation);
  return donation;
}

export function addDemoAssignment(input: {
  donation: DemoDonation;
  ngoId?: string;
  ngoName?: string;
  volunteerId?: string;
  volunteerName?: string;
  priorityScore?: number;
  distanceKm?: number;
}) {
  const nowIso = new Date().toISOString();
  const assignment: DemoAssignment = {
    id: `asg_demo_${Date.now()}`,
    donationId: input.donation.id,
    status: "MATCHED",
    createdAt: nowIso,
    updatedAt: nowIso,
    priorityScore: input.priorityScore ?? 0.86,
    distanceKm: input.distanceKm ?? 6.8,
    urgencyMultiplier: 1.1,
    demandMultiplier: 1.05,
    donation: {
      id: input.donation.id,
      foodType: input.donation.foodType,
      estimatedMeals: input.donation.estimatedMeals,
      pickupAddress: input.donation.pickupAddress,
      expiryAt: input.donation.expiryAt,
    },
    ngo: input.ngoId ? { id: input.ngoId, name: input.ngoName ?? "Demo NGO" } : null,
    volunteer: input.volunteerId ? { id: input.volunteerId, name: input.volunteerName ?? "Demo Volunteer" } : null,
  };

  demoAssignmentsStore.unshift(assignment);

  const donation = demoDonationsStore.find((item) => item.id === input.donation.id);
  if (donation) donation.status = "MATCHED";

  return assignment;
}

export function demoAnalytics() {
  return {
    totalDonations: 287,
    deliveredDonations: 241,
    activeParticipants: 132,
    beneficiaries: 28940,
    wasteReductionKg: 13023,
    co2SavingsKg: 72350,
    impactScore: 0.84,
    heatmap: [
      { id: "h1", lat: 12.9716, lng: 77.5946, estimatedMeals: 220, status: "DELIVERED" },
      { id: "h2", lat: 12.9352, lng: 77.6245, estimatedMeals: 140, status: "MATCHED" },
      { id: "h3", lat: 12.9915, lng: 77.5713, estimatedMeals: 90, status: "POSTED" },
      { id: "h4", lat: 12.9279, lng: 77.6271, estimatedMeals: 170, status: "DELIVERED" },
      { id: "h5", lat: 12.9698, lng: 77.7499, estimatedMeals: 120, status: "MATCHED" },
      { id: "h6", lat: 12.9138, lng: 77.6102, estimatedMeals: 200, status: "DELIVERED" },
      { id: "h7", lat: 13.0074, lng: 77.5695, estimatedMeals: 160, status: "IN_TRANSIT" },
      { id: "h8", lat: 12.9561, lng: 77.7012, estimatedMeals: 110, status: "POSTED" },
      { id: "h9", lat: 12.9409, lng: 77.5665, estimatedMeals: 185, status: "DELIVERED" },
      { id: "h10", lat: 12.9984, lng: 77.6206, estimatedMeals: 145, status: "MATCHED" },
    ],
    weeklyTrend: [
      { label: "Mon", donations: 34, meals: 2420 },
      { label: "Tue", donations: 38, meals: 2670 },
      { label: "Wed", donations: 31, meals: 2190 },
      { label: "Thu", donations: 43, meals: 3010 },
      { label: "Fri", donations: 48, meals: 3290 },
      { label: "Sat", donations: 28, meals: 2010 },
      { label: "Sun", donations: 24, meals: 1750 },
    ],
    monthlyTrend: [
      { label: "Nov", donations: 146, meals: 9940 },
      { label: "Dec", donations: 162, meals: 10920 },
      { label: "Jan", donations: 171, meals: 11710 },
      { label: "Feb", donations: 155, meals: 10630 },
      { label: "Mar", donations: 183, meals: 12480 },
      { label: "Apr", donations: 176, meals: 12130 },
    ],
    peakDonationTimes: [
      { hour: 9, count: 28 },
      { hour: 13, count: 35 },
      { hour: 18, count: 42 },
      { hour: 20, count: 31 },
      { hour: 22, count: 24 },
    ],
    areasNeedingHelp: [
      { area: "HR Layout Bengaluru", needScore: 88, pendingMeals: 940, fulfilledMeals: 510 },
      { area: "Electronic City", needScore: 81, pendingMeals: 860, fulfilledMeals: 490 },
      { area: "Yeshwanthpur", needScore: 73, pendingMeals: 790, fulfilledMeals: 470 },
      { area: "Indiranagar", needScore: 66, pendingMeals: 650, fulfilledMeals: 430 },
      { area: "Whitefield", needScore: 62, pendingMeals: 590, fulfilledMeals: 405 },
    ],
  };
}
