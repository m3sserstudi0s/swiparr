/**
 * API path utilities that return the correct endpoints based on the configured backend.
 * This allows the frontend to work with both Jellyfin and Plex.
 */

import { getRuntimeConfig, MediaBackend } from './runtime-config';

// Cached backend type
let cachedBackend: MediaBackend | null = null;

export function getBackend(): MediaBackend {
  if (cachedBackend) return cachedBackend;
  
  const config = getRuntimeConfig();
  cachedBackend = config.backend;
  return cachedBackend;
}

export function isPlex(): boolean {
  return getBackend() === 'plex';
}

export function isJellyfin(): boolean {
  return getBackend() === 'jellyfin';
}

// API endpoint paths
export const API_PATHS = {
  get items() {
    return isPlex() ? '/api/plex/items' : '/api/jellyfin/items';
  },
  get libraries() {
    return isPlex() ? '/api/plex/libraries' : '/api/jellyfin/libraries';
  },
  get genres() {
    return isPlex() ? '/api/plex/genres' : '/api/jellyfin/genres';
  },
  get years() {
    return isPlex() ? '/api/plex/years' : '/api/jellyfin/years';
  },
  item(id: string) {
    return isPlex() ? `/api/plex/item/${id}` : `/api/jellyfin/item/${id}`;
  },
  image(id: string, params?: Record<string, string | undefined>) {
    const base = isPlex() ? `/api/plex/image/${id}` : `/api/jellyfin/image/${id}`;
    if (!params) return base;
    // Filter out undefined values
    const filteredParams: Record<string, string> = {};
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        filteredParams[key] = value;
      }
    }
    if (Object.keys(filteredParams).length === 0) return base;
    const searchParams = new URLSearchParams(filteredParams);
    return `${base}?${searchParams.toString()}`;
  },
  // Auth endpoints
  get login() {
    return isPlex() ? '/api/auth-plex/login' : '/api/auth/login';
  },
  get guest() {
    return isPlex() ? '/api/auth-plex/guest' : '/api/auth/guest';
  },
  // Plex-specific
  get plexPin() {
    return '/api/auth-plex/pin';
  },
  // Jellyfin-specific
  get quickConnect() {
    return '/api/auth/quick-connect';
  },
};

// Helper for backward compatibility - returns correct image URL
export function getImageUrl(itemId: string, options?: {
  imageType?: string;
  tag?: string;
  width?: string;
  height?: string;
  type?: 'user' | 'item';
}): string {
  if (!options) return API_PATHS.image(itemId);
  return API_PATHS.image(itemId, options);
}

// Export backend name for display purposes
export function getBackendName(): string {
  return isPlex() ? 'Plex' : 'Jellyfin';
}
