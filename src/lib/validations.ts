import { z } from "zod";

export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().optional(),
  provider: z.string().optional(),
  config: z.object({
    serverUrl: z.string().optional(),
    tmdbToken: z.string().optional(),
  }).optional(),
  profilePicture: z.string().optional(), // Base64 encoded
});

export const guestLoginSchema = z.object({
  username: z.string().min(1, "Username is required").max(50),
  sessionCode: z.string().max(4).optional().or(z.literal("")),
  profilePicture: z.string().optional(), // Base64 encoded
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
  filters: z.object({
    genres: z.array(z.string()).optional(),
    yearRange: z.array(z.number()).length(2).optional(),
    minCommunityRating: z.number().optional(),
    officialRatings: z.array(z.string()).optional(),
    runtimeRange: z.array(z.number()).length(2).optional(),
    watchProviders: z.array(z.string()).optional(),
    watchRegion: z.string().optional(),
    sortBy: z.string().optional(),
    themes: z.array(z.string()).optional(),
    languages: z.array(z.string()).optional(),
    unplayedOnly: z.boolean().optional(),
    mediaType: z.enum(["movie", "tv", "both"]).optional(),
  }).optional().or(z.any()),
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

export const userSettingsSchema = z.object({
  watchProviders: z.array(z.string()).min(1, "At least one streaming service must be selected"),
  watchRegion: z.string().min(2).max(2),
});
