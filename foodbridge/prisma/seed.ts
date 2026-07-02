import { DonationStatus, PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

type SeedUser = {
  name: string;
  email: string;
  role: Role;
  organization: string;
  lat: number;
  lng: number;
  trustScore: number;
};

type Location = {
  area: string;
  address: string;
  lat: number;
  lng: number;
};

const donorProfiles: SeedUser[] = [
  { name: "Demo Donor", email: "donor@foodbridge.org", role: Role.DONOR, organization: "Demo Donor Kitchens", lat: 12.9716, lng: 77.5946, trustScore: 4.4 },
  { name: "Riya Sharma", email: "riya.sharma@urbanplates.in", role: Role.DONOR, organization: "Urban Plates", lat: 12.9758, lng: 77.6055, trustScore: 4.6 },
  { name: "Amit Verma", email: "amit.verma@grandharvest.co", role: Role.DONOR, organization: "Grand Harvest Hotel", lat: 12.9683, lng: 77.594, trustScore: 4.5 },
  { name: "Nisha Rao", email: "nisha.rao@cityevents.live", role: Role.DONOR, organization: "City Events Live", lat: 12.9349, lng: 77.6101, trustScore: 4.3 },
  { name: "Kabir Khan", email: "kabir.khan@metrocanteens.org", role: Role.DONOR, organization: "Metro Canteens", lat: 12.9141, lng: 77.6403, trustScore: 4.2 },
  { name: "Priya Nair", email: "priya.nair@freshforks.in", role: Role.DONOR, organization: "Fresh Forks", lat: 13.0052, lng: 77.5697, trustScore: 4.4 },
  { name: "Harshil Mehta", email: "harshil.mehta@orchidstays.com", role: Role.DONOR, organization: "Orchid Stays", lat: 12.9258, lng: 77.5932, trustScore: 4.1 },
  { name: "Sonal Iyer", email: "sonal.iyer@skylinehalls.co", role: Role.DONOR, organization: "Skyline Banquets", lat: 12.9989, lng: 77.6229, trustScore: 4.7 },
];

const ngoProfiles: SeedUser[] = [
  { name: "Demo NGO", email: "ngo@foodbridge.org", role: Role.NGO, organization: "Demo NGO Collective", lat: 12.9611, lng: 77.6387, trustScore: 4.5 },
  { name: "Ananya Foundation", email: "ops@ananyafoundation.org", role: Role.NGO, organization: "Ananya Foundation", lat: 12.9412, lng: 77.6078, trustScore: 4.7 },
  { name: "City Relief Network", email: "dispatch@cityrelief.net", role: Role.NGO, organization: "City Relief Network", lat: 12.9897, lng: 77.5769, trustScore: 4.6 },
  { name: "Hands for Hope", email: "support@handsforhope.in", role: Role.NGO, organization: "Hands for Hope", lat: 12.9057, lng: 77.6451, trustScore: 4.4 },
  { name: "Asha Community Trust", email: "care@ashatrust.org", role: Role.NGO, organization: "Asha Community Trust", lat: 13.0211, lng: 77.6402, trustScore: 4.3 },
];

const volunteerProfiles: SeedUser[] = [
  { name: "Demo Volunteer", email: "volunteer@foodbridge.org", role: Role.VOLUNTEER, organization: "Community Volunteer", lat: 12.946, lng: 77.6069, trustScore: 4.2 },
  { name: "Rahul S", email: "rahul.s@volnet.in", role: Role.VOLUNTEER, organization: "Volunteer Network", lat: 12.9581, lng: 77.6211, trustScore: 4.1 },
  { name: "Pooja M", email: "pooja.m@volnet.in", role: Role.VOLUNTEER, organization: "Volunteer Network", lat: 12.9318, lng: 77.6226, trustScore: 4.4 },
  { name: "Farhan A", email: "farhan.a@volnet.in", role: Role.VOLUNTEER, organization: "Volunteer Network", lat: 12.9072, lng: 77.6016, trustScore: 4.0 },
  { name: "Divya R", email: "divya.r@volnet.in", role: Role.VOLUNTEER, organization: "Volunteer Network", lat: 13.0086, lng: 77.5904, trustScore: 4.5 },
  { name: "Manoj K", email: "manoj.k@volnet.in", role: Role.VOLUNTEER, organization: "Volunteer Network", lat: 12.9854, lng: 77.6624, trustScore: 4.3 },
  { name: "Neha P", email: "neha.p@volnet.in", role: Role.VOLUNTEER, organization: "Volunteer Network", lat: 12.9643, lng: 77.5468, trustScore: 4.2 },
  { name: "Vikram G", email: "vikram.g@volnet.in", role: Role.VOLUNTEER, organization: "Volunteer Network", lat: 12.9247, lng: 77.5723, trustScore: 4.1 },
  { name: "Karthik L", email: "karthik.l@volnet.in", role: Role.VOLUNTEER, organization: "Volunteer Network", lat: 12.9962, lng: 77.6167, trustScore: 4.4 },
  { name: "Sneha T", email: "sneha.t@volnet.in", role: Role.VOLUNTEER, organization: "Volunteer Network", lat: 12.9448, lng: 77.6761, trustScore: 4.2 },
];

const adminProfiles: SeedUser[] = [
  { name: "Demo Admin", email: "admin@foodbridge.org", role: Role.ADMIN, organization: "FoodBridge Ops", lat: 12.9763, lng: 77.6033, trustScore: 4.9 },
  { name: "Platform Admin", email: "platform.admin@foodbridge.org", role: Role.ADMIN, organization: "FoodBridge Ops", lat: 12.9712, lng: 77.607, trustScore: 4.8 },
];

const pickupLocations: Location[] = [
  { area: "MG Road", address: "MG Road, Bengaluru", lat: 12.9755, lng: 77.6063 },
  { area: "Indiranagar", address: "100 Feet Road, Indiranagar, Bengaluru", lat: 12.9719, lng: 77.6412 },
  { area: "Koramangala", address: "5th Block, Koramangala, Bengaluru", lat: 12.9345, lng: 77.6145 },
  { area: "Whitefield", address: "ITPL Main Road, Whitefield, Bengaluru", lat: 12.9698, lng: 77.7499 },
  { area: "Electronic City", address: "Electronic City Phase 1, Bengaluru", lat: 12.8456, lng: 77.6603 },
  { area: "Yeshwanthpur", address: "Yeshwanthpur Market, Bengaluru", lat: 13.0285, lng: 77.5547 },
  { area: "Jayanagar", address: "Jayanagar 4th Block, Bengaluru", lat: 12.925, lng: 77.5938 },
  { area: "HSR Layout", address: "HSR Layout Sector 2, Bengaluru", lat: 12.9121, lng: 77.6446 },
  { area: "Malleshwaram", address: "Malleshwaram 8th Cross, Bengaluru", lat: 13.0067, lng: 77.5687 },
  { area: "Marathahalli", address: "Marathahalli Bridge, Bengaluru", lat: 12.9591, lng: 77.6974 },
];

const foodTypes = [
  "Cooked meal boxes",
  "Rice and curry packs",
  "Bakery surplus",
  "Fresh produce crates",
  "Dairy and fruit combo",
  "Breakfast idli packs",
  "Chapati and sabzi packs",
  "Event buffet portions",
] as const;

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number, digits = 2) {
  return Number((Math.random() * (max - min) + min).toFixed(digits));
}

function pickOne<T>(arr: T[]): T {
  return arr[randomInt(0, arr.length - 1)];
}

function statusForIndex(i: number): DonationStatus {
  if (i % 13 === 0) return DonationStatus.CANCELLED;
  if (i % 11 === 0) return DonationStatus.EXPIRED;
  if (i % 3 === 0) return DonationStatus.MATCHED;
  if (i % 2 === 0) return DonationStatus.DELIVERED;
  return DonationStatus.IN_TRANSIT;
}

async function upsertUsers(users: SeedUser[], passwordHash: string) {
  const output: Array<{ id: string; role: Role; email: string }> = [];

  for (const profile of users) {
    const user = await prisma.user.upsert({
      where: { email: profile.email },
      update: {
        name: profile.name,
        role: profile.role,
        organization: profile.organization,
        lat: profile.lat,
        lng: profile.lng,
        isVerified: true,
        trustScore: profile.trustScore,
      },
      create: {
        name: profile.name,
        email: profile.email,
        passwordHash,
        role: profile.role,
        organization: profile.organization,
        lat: profile.lat,
        lng: profile.lng,
        isVerified: true,
        trustScore: profile.trustScore,
      },
      select: { id: true, role: true, email: true },
    });

    output.push(user);
  }

  return output;
}

async function main() {
  const passwordHash = await bcrypt.hash("Passw0rd!", 10);
  const shouldReset = process.env.SEED_RESET === "true";

  if (shouldReset) {
    // Use SEED_RESET=true only for intentional full resets.
    await prisma.rating.deleteMany();
    await prisma.assignment.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.donation.deleteMany();
    await prisma.verification.deleteMany();
  }

  const donors = await upsertUsers(donorProfiles, passwordHash);
  const ngos = await upsertUsers(ngoProfiles, passwordHash);
  const volunteers = await upsertUsers(volunteerProfiles, passwordHash);
  const admins = await upsertUsers(adminProfiles, passwordHash);

  const donationCount = 140;
  const createdDonationIds: string[] = [];

  for (let i = 0; i < donationCount; i += 1) {
    const donor = pickOne(donors);
    const ngo = pickOne(ngos);
    const volunteer = pickOne(volunteers);
    const admin = pickOne(admins);
    const location = pickOne(pickupLocations);
    const status = statusForIndex(i);

    const createdAt = new Date(Date.now() - randomInt(2, 35) * 24 * 60 * 60 * 1000 - randomInt(0, 12) * 60 * 60 * 1000);
    const expiryAt = new Date(createdAt.getTime() + randomInt(2, 16) * 60 * 60 * 1000);

    const estimatedMeals = randomInt(60, 260);

    const donation = await prisma.donation.create({
      data: {
        donorId: donor.id,
        foodType: pickOne(foodTypes as unknown as string[]),
        quantity: randomInt(25, 120),
        quantityUnit: "boxes",
        estimatedMeals,
        expiryAt,
        pickupAddress: location.address,
        lat: location.lat + randomFloat(-0.007, 0.007, 6),
        lng: location.lng + randomFloat(-0.007, 0.007, 6),
        notes: `Daily surplus collection from ${location.area}`,
        status,
        spoilageRiskScore: randomFloat(0.12, 0.88),
        predictedDemandIdx: randomFloat(0.7, 1.8),
        createdAt,
        updatedAt: new Date(createdAt.getTime() + randomInt(20, 420) * 60 * 1000),
      },
      select: { id: true, status: true },
    });

    createdDonationIds.push(donation.id);

    if (status !== DonationStatus.POSTED && status !== DonationStatus.CANCELLED && status !== DonationStatus.EXPIRED) {
      const startedAt = new Date(createdAt.getTime() + randomInt(30, 240) * 60 * 1000);
      const deliveredAt =
        status === DonationStatus.DELIVERED
          ? new Date(startedAt.getTime() + randomInt(40, 210) * 60 * 1000)
          : null;

      await prisma.assignment.create({
        data: {
          donationId: donation.id,
          ngoId: ngo.id,
          volunteerId: volunteer.id,
          assignedBy: admin.id,
          status,
          priorityScore: randomFloat(0.62, 0.98),
          distanceKm: randomFloat(1.2, 14.7),
          demandMultiplier: randomFloat(1.0, 1.8),
          urgencyMultiplier: randomFloat(1.0, 1.9),
          startedAt,
          deliveredAt,
          routePlanJson: {
            city: "Bengaluru",
            route: [
              { checkpoint: "pickup", lat: location.lat, lng: location.lng },
              { checkpoint: "ngo", ngoId: ngo.id },
              { checkpoint: "delivery-zone", priority: "high" },
            ],
          },
        },
      });
    }
  }

  const raters = [...donors, ...ngos, ...volunteers, ...admins];
  const ratees = [...ngos, ...volunteers];

  for (let i = 0; i < 120; i += 1) {
    const rater = pickOne(raters);
    const ratee = pickOne(ratees);

    if (rater.id === ratee.id) continue;

    await prisma.rating.upsert({
      where: {
        raterId_rateeId: {
          raterId: rater.id,
          rateeId: ratee.id,
        },
      },
      update: {
        score: randomInt(3, 5),
        comment: "Reliable coordination and timely updates.",
      },
      create: {
        raterId: rater.id,
        rateeId: ratee.id,
        score: randomInt(3, 5),
        comment: "Reliable coordination and timely updates.",
      },
    });
  }

  for (const user of [...donors, ...ngos, ...volunteers, ...admins]) {
    await prisma.notification.createMany({
      data: [
        {
          userId: user.id,
          title: "Daily Operations Summary",
          body: "New redistribution opportunities have been added in your nearest zone.",
          isRead: false,
        },
        {
          userId: user.id,
          title: "Trust Score Update",
          body: "Your trust score has been recalculated based on latest completed deliveries.",
          isRead: randomInt(0, 1) === 1,
        },
      ],
    });
  }

  const participants = [...donors, ...ngos, ...volunteers];
  const admin = admins[0];

  for (const participant of participants) {
    await prisma.verification.create({
      data: {
        userId: participant.id,
        verifierId: admin.id,
        documentType: participant.role === Role.DONOR ? "BusinessLicense" : "IdentityProof",
        status: "APPROVED",
      },
    });
  }

  console.log(`Seed complete: ${donationCount} donations, ${createdDonationIds.length} records, ${participants.length + admins.length} users.`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
