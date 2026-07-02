import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8).regex(/[A-Z]/).regex(/[a-z]/).regex(/[0-9]/),
  role: z.enum(["DONOR", "NGO", "VOLUNTEER", "ADMIN"]),
  organization: z.string().min(2).optional(),
  phone: z.string().min(8).max(20).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
});

export const donationSchema = z.object({
  foodType: z.string().min(2),
  quantity: z.number().int().positive(),
  quantityUnit: z.string().min(1),
  estimatedMeals: z.number().int().positive(),
  expiryAt: z.string().datetime(),
  temperatureC: z.number().min(-10).max(60).default(8),
  handlingScore: z.number().int().min(1).max(5).default(4),
  pickupAddress: z.string().min(6),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  imageUrl: z.string().url().optional(),
  notes: z.string().max(300).optional(),
});

export const ratingSchema = z.object({
  rateeId: z.string().cuid(),
  score: z.number().int().min(1).max(5),
  comment: z.string().max(250).optional(),
});

export const statusSchema = z.object({
  status: z.enum(["MATCHED", "PICKED_UP", "IN_TRANSIT", "DELIVERED", "EXPIRED", "CANCELLED"]),
});

export const allocationWeightsSchema = z
  .object({
    distance: z.number().min(0).max(1).optional(),
    urgency: z.number().min(0).max(1).optional(),
    trust: z.number().min(0).max(1).optional(),
    demand: z.number().min(0).max(1).optional(),
    capacity: z.number().min(0).max(1).optional(),
  })
  .strict();
