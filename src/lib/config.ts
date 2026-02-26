import { z } from 'zod';
import packageJson from '../../package.json';
import { ProviderType } from './providers/types';

const envSchema = z.object({
  // Core
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  
  // Database
  DATABASE_URL: z.string().optional(),
  TURSO_DATABASE_URL: z.string().optional(),
  DATABASE_AUTH_TOKEN: z.string().optional(),
  TURSO_AUTH_TOKEN: z.string().optional(),

  // Provider
  PROVIDER: z.enum(['jellyfin', 'tmdb', 'plex', 'emby', 'streaming']).default('jellyfin'),
  PROVIDER_LOCK: z.preprocess((val) => val === 'true' || val === true, z.boolean()).default(true),

  // Server URLs
  JELLYFIN_URL: z.string().optional(),
  JELLYFIN_PUBLIC_URL: z.string().optional(),
  EMBY_URL: z.string().optional(),
  EMBY_PUBLIC_URL: z.string().optional(),
  PLEX_URL: z.string().optional(),
  PLEX_PUBLIC_URL: z.string().optional(),

  // Auth & Security
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET must be at least 32 characters").optional(),
  USE_SECURE_COOKIES: z.preprocess((val) => val === 'true', z.boolean()).default(false),
  ALLOW_PRIVATE_PROVIDER_URLS: z.preprocess((val) => val === 'true', z.boolean()).default(false),
  PLEX_ALLOW_SELF_SIGNED: z.preprocess((val) => val === 'true', z.boolean()).default(false),
  PLEX_IMAGE_ALLOWED_HOSTS: z.string().optional(),
  ADMIN_USERNAME: z.string().optional(),
  JELLYFIN_ADMIN_USERNAME: z.string().optional(),
  EMBY_ADMIN_USERNAME: z.string().optional(),
  PLEX_ADMIN_USERNAME: z.string().optional(),

  // Provider Specific
  TMDB_ACCESS_TOKEN: z.string().optional(),
  TMDB_DEFAULT_REGION: z.string().optional(),
  PLEX_TOKEN: z.string().optional(),

  // UI / Proxy
  URL_BASE_PATH: z.string().default(''),
  APP_PUBLIC_URL: z.string().default('swiparr.com'),
  JELLYFIN_USE_WATCHLIST: z.preprocess((val) => val === 'true', z.boolean()).default(false),

  APP_VERSION: z.string().optional(),
  NEXT_PUBLIC_APP_VERSION: z.string().optional(),
  X_FRAME_OPTIONS: z.string().default('DENY'),
  CSP_FRAME_ANCESTORS: z.string().default('none'),

  USE_ANALYTICS: z.preprocess((val) => val === 'true', z.boolean()).default(false),
  ENABLE_DEBUG: z.preprocess((val) => val === 'true' || val === true, z.boolean()).default(false),
});

const parsedEnv = envSchema.parse(process.env);

// Log config summary at startup (server-side only)
if (typeof window === 'undefined' && parsedEnv.ENABLE_DEBUG) {
  console.info('[Swiparr] Config loaded:', {
    NODE_ENV: parsedEnv.NODE_ENV,
    PROVIDER: parsedEnv.PROVIDER,
    PROVIDER_LOCK: parsedEnv.PROVIDER_LOCK,
    JELLYFIN_URL: parsedEnv.JELLYFIN_URL ? '(set)' : '(not set)',
    JELLYFIN_PUBLIC_URL: parsedEnv.JELLYFIN_PUBLIC_URL ? '(set)' : '(not set)',
    JELLYFIN_USE_WATCHLIST: parsedEnv.JELLYFIN_USE_WATCHLIST,
    DATABASE_URL: parsedEnv.DATABASE_URL ? '(set)' : '(not set)',
    AUTH_SECRET: parsedEnv.AUTH_SECRET ? '(set)' : '(not set)',
    APP_VERSION: parsedEnv.APP_VERSION || parsedEnv.NEXT_PUBLIC_APP_VERSION || '(not set)',
    URL_BASE_PATH: parsedEnv.URL_BASE_PATH || '(not set)',
  });
}

// Calculated values
const getDefaultDbPath = () => {
  if (parsedEnv.NODE_ENV === 'production') {
    return 'file:/app/data/swiparr.db';
  }
  return 'file:swiparr.db';
};

const DATABASE_URL = parsedEnv.DATABASE_URL || parsedEnv.TURSO_DATABASE_URL || getDefaultDbPath();
const DATABASE_AUTH_TOKEN = parsedEnv.DATABASE_AUTH_TOKEN || parsedEnv.TURSO_AUTH_TOKEN;

const SERVER_URL = parsedEnv.JELLYFIN_URL || parsedEnv.EMBY_URL || parsedEnv.PLEX_URL || 
  (parsedEnv.PROVIDER === ProviderType.JELLYFIN ? 'http://localhost:8096' : 
   parsedEnv.PROVIDER === ProviderType.EMBY ? 'http://localhost:8096' : 
   parsedEnv.PROVIDER === ProviderType.PLEX ? 'http://localhost:32400' : '');

const SERVER_PUBLIC_URL = (parsedEnv.JELLYFIN_PUBLIC_URL || parsedEnv.EMBY_PUBLIC_URL || parsedEnv.PLEX_PUBLIC_URL || SERVER_URL || '').replace(/\/$/, '');

const RAW_BASE_PATH = parsedEnv.URL_BASE_PATH.replace(/\/$/, '');
const BASE_PATH = RAW_BASE_PATH && !RAW_BASE_PATH.startsWith('/') ? `/${RAW_BASE_PATH}` : RAW_BASE_PATH;

const ADMIN_USERNAME = parsedEnv.ADMIN_USERNAME || 
  (parsedEnv.PROVIDER === ProviderType.JELLYFIN ? parsedEnv.JELLYFIN_ADMIN_USERNAME :
   parsedEnv.PROVIDER === ProviderType.EMBY ? parsedEnv.EMBY_ADMIN_USERNAME :
   parsedEnv.PROVIDER === ProviderType.PLEX ? parsedEnv.PLEX_ADMIN_USERNAME : undefined);

export const config = {
  ...parsedEnv,
  db: {
    url: DATABASE_URL,
    authToken: DATABASE_AUTH_TOKEN,
    isProduction: parsedEnv.NODE_ENV === 'production',
  },
  server: {
    url: SERVER_URL,
    publicUrl: SERVER_PUBLIC_URL,
  },
  app: {
    version: (parsedEnv.APP_VERSION || parsedEnv.NEXT_PUBLIC_APP_VERSION || packageJson.version).replace(/^v/i, ''),
    basePath: BASE_PATH,
    appPublicUrl: parsedEnv.APP_PUBLIC_URL,
    provider: parsedEnv.PROVIDER,
    providerLock: parsedEnv.PROVIDER_LOCK,
    useWatchlist: parsedEnv.JELLYFIN_USE_WATCHLIST,
  },
  auth: {
    secret: parsedEnv.AUTH_SECRET,
    secureCookies: parsedEnv.USE_SECURE_COOKIES,
    adminUsername: ADMIN_USERNAME,
  },
  security: {
    allowPrivateProviderUrls: parsedEnv.ALLOW_PRIVATE_PROVIDER_URLS,
    plexAllowSelfSigned: parsedEnv.PLEX_ALLOW_SELF_SIGNED,
    plexImageAllowedHosts: parsedEnv.PLEX_IMAGE_ALLOWED_HOSTS,
  },
  proxy: {
    xFrameOptions: parsedEnv.X_FRAME_OPTIONS,
    cspFrameAncestors: parsedEnv.CSP_FRAME_ANCESTORS,
  }
} as const;

export type Config = typeof config;
