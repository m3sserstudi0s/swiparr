import { z } from "zod";
import { assertSafeUrl } from "@/lib/security/url-guard";
import { config } from "@/lib/config";

export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().optional(),
  provider: z.string().optional(),
  config: z.object({
    serverUrl: z.string().optional().refine((value) => {
      if (!value) return true;
      try {
        const source = config.app.providerLock ? "env" : "user";
        assertSafeUrl(value, { source });
        return true;
      } catch {
        return false;
      }
    }, "Invalid or blocked server URL"),
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
    excludedGenres: z.array(z.string()).optional(),
    yearRange: z.array(z.number()).length(2).optional(),
    minCommunityRating: z.number().optional(),
    officialRatings: z.array(z.string()).optional(),
    excludedOfficialRatings: z.array(z.string()).optional(),
    runtimeRange: z.array(z.number()).length(2).optional(),
    watchProviders: z.array(z.string()).optional(),
    watchRegion: z.string().optional(),
    sortBy: z.string().optional(),
    themes: z.array(z.string()).optional(),
    excludedThemes: z.array(z.string()).optional(),
    tmdbLanguages: z.array(z.string()).optional(),
    unplayedOnly: z.boolean().optional(),
  }).optional().or(z.any()),
  settings: z.object({
    maxMatches: z.number().int().min(0).optional(),
    maxRightSwipes: z.number().int().min(0).optional(),
    maxLeftSwipes: z.number().int().min(0).optional(),
    matchStrategy: z.enum(["atLeastTwo", "allMembers"]).optional(),
  }).optional(),
  allowGuestLending: z.boolean().optional(),
});

export const plexAuthSchema = z.object({
  authToken: z.string().min(1, "authToken is required"),
  clientId: z.string().min(1, "clientId is required"),
  // Note: 'user' is intentionally NOT accepted. User identity is always
  // fetched server-side from plex.tv to prevent client impersonation (H5).
});

export const deleteSwipeSchema = z.object({
  itemId: z.string().min(1).max(256),
});

export const watchlistSchema = z.object({
  itemId: z.string().min(1).max(256),
  action: z.enum(["add", "remove"]),
  useWatchlist: z.boolean().optional(),
});

export const libraryUpdateSchema = z.array(z.string());

export const quickConnectSchema = z.object({
  secret: z.string().min(1),
});

export const userSettingsSchema = z.object({
  watchProviders: z.array(z.string()).min(1, "At least one streaming service must be selected"),
  watchRegion: z.string().min(2).max(2),
});
