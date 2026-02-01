import { z } from "zod";

export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export const guestLoginSchema = z.object({
  username: z.string().min(1, "Username is required").max(50),
  sessionCode: z.string().length(4, "Session code must be 4 characters").optional().or(z.literal("")),
});

export const swipeSchema = z.object({
  itemId: z.string().min(1),
  direction: z.enum(["left", "right"]),
  item: z.any().optional(),
  sessionCode: z.string().length(4).optional().nullable(),
});

export const sessionActionSchema = z.object({
  action: z.enum(["join", "create"]),
  code: z.string().length(4).optional(),
  allowGuestLending: z.boolean().optional(),
});

export const sessionSettingsSchema = z.object({
  filters: z.any().optional(),
  settings: z.object({
    maxMatches: z.number().int().min(0).optional(),
    maxRightSwipes: z.number().int().min(0).optional(),
    maxLeftSwipes: z.number().int().min(0).optional(),
    matchStrategy: z.enum(["atLeastTwo", "allMembers"]).optional(),
  }).optional(),
  allowGuestLending: z.boolean().optional(),
});

export const libraryUpdateSchema = z.array(z.string());

export const quickConnectSchema = z.object({
  secret: z.string().min(1),
});
