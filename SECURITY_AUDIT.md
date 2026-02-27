# Security Audit — Swiparr

**Audit scope**: Full codebase review covering authentication, session management, input validation, cryptography, SSRF, and HTTP security headers.  
**Started in**: v1.3.3

---

## Summary

| Severity | Total | Resolved | Open | Accepted |
|----------|------:|--------:|-----:|--------:
| Critical | 2 | 2 | 0 | 0 |
| High | 6 | 5 | 0 | 1 |
| Medium | 10 | 7 | 0 | 3 |

---

## Critical

### C1 — Weak AUTH_SECRET generation — **Resolved in v1.3.3**

**File**: `scripts/ensure-auth-secret.cjs`

**Finding**: The script that auto-generates `AUTH_SECRET` used a UUID (128 bits, 4 bits fixed version/variant, weak entropy source) instead of a cryptographically strong random value.

**Fix**: Replaced with `crypto.randomBytes(32).toString('hex')` (256 bits, CSPRNG).

---

### C2 — Weak KDF for stored tokens (AES key derived from plain UUID) — **Resolved in v1.3.3**

**File**: `src/lib/security/crypto.ts`

**Finding**: The AES-256-GCM key used to encrypt host access tokens was derived from the `AUTH_SECRET` by simply hashing it with SHA-256 — no salt, no iterations. Any token stored in the database was effectively protected only by the raw secret.

**Fix**: `deriveKey` now uses `crypto.scryptSync` with parameters N=16384, r=8, p=1 and a versioned salt (`swiparr-guest-lending-v2`). New ciphertexts are prefixed `v2:`. Legacy `v1:` ciphertexts cannot be decrypted with the new KDF; at startup, after migrations, all rows containing `v1:` tokens are wiped (`wipeLegacyCryptoTokens()` in `src/db/migrate.js`).

---

## High

### H1 — Predictable session codes — **Resolved in v1.3.3**

**File**: `src/lib/services/session-service.ts`

**Finding**: Session join-codes were generated with `Math.random()`, which is not cryptographically random. An attacker on the same network could brute-force or predict the 4-character code.

**Fix**: `generateCode()` now uses `crypto.randomBytes(4)` mapped over a 32-character alphanumeric alphabet via modulo, providing a CSPRNG source.

---

### H2 — No rate limiting on session creation endpoint — **Resolved in v1.3.3**

**File**: `src/app/api/session/provider/route.ts`

**Finding**: `POST /api/session/provider` had no rate limiting. An attacker could enumerate or brute-force session codes at high speed.

**Fix**: An in-process IP-based rate limiter (20 requests per IP per minute) was added. Excess requests receive `429 Too Many Requests` with a `Retry-After` header. The IP is extracted from `x-forwarded-for` → `x-real-ip` → `"unknown"`.

---

### H3 — Any authenticated user could delete another session's stats — **Resolved in v1.3.3**

**File**: `src/app/api/session/stats/route.ts`

**Finding**: `DELETE /api/session/stats` lacked an ownership check. Any logged-in user who knew a session code could delete its swipe statistics.

**Fix**: The handler now fetches the session row and verifies that `session.hostUserId === req.user.Id` before allowing the delete. Returns `403 Forbidden` if the caller is not the host.

---

### H4 — Plex auth route accepted client-supplied user identity — **Resolved in v1.3.3**

**File**: `src/app/api/auth/plex/route.ts`

**Finding**: The `POST /api/auth/plex` handler accepted a `user` object in the request body and used it directly to populate the session (username, UUID, etc.) if present — bypassing the plex.tv verification call entirely. A client could forge their own identity.

**Fix**: The request body is now validated with `plexAuthSchema` (Zod), which accepts only `authToken` and `clientId` and explicitly strips any `user` field. User identity is always fetched server-side from `https://plex.tv/api/v2/user`.

---

### H5 — Unvalidated `itemId` in swipe DELETE handler — **Resolved in v1.3.3**

**File**: `src/app/api/swipe/route.ts`

**Finding**: The `DELETE /api/swipe` handler cast the request body to `{ itemId: string }` without validation, allowing arbitrary strings (unbounded length, no type check) to be passed to the database layer.

**Fix**: Body is now validated with `deleteSwipeSchema` (Zod: required string, max 256 characters).

---

### H6 — Unvalidated body in watchlist handler — **Resolved in v1.3.3**

**File**: `src/app/api/user/watchlist/route.ts`

**Finding**: `POST /api/user/watchlist` destructured `{ itemId, action, useWatchlist }` from the raw request body without any schema validation. The `action` field was passed directly to the provider layer as an unchecked string.

**Fix**: Body is now validated with `watchlistSchema` (Zod: typed `action` enum `["add", "remove"]`, bounded `itemId`, optional boolean `useWatchlist`).

---

### H7 — Admin promotion on first login; env-var username bypass

**Status**: Accepted — documented below

**Finding**: Two behaviours are worth noting together:

1. **Auto-promotion on first login**: The first user to successfully authenticate is automatically made admin. On a fresh install this is the intended flow, but it means that if the admin record is ever cleared from the database, the next login wins the admin role without any explicit action.

2. **Env-var username bypass**: Setting `ADMIN_USERNAME`, `JELLYFIN_ADMIN_USERNAME`, `EMBY_ADMIN_USERNAME`, or `PLEX_ADMIN_USERNAME` causes any user whose username matches (case-insensitive) to be treated as admin immediately, bypassing the database record entirely. This is intentional opt-in behaviour for self-hosters who want a stable admin identity.

**Practical impact**: Admin currently grants two capabilities beyond regular users — selecting which media libraries appear in the shared deck (`GET/PATCH /api/admin/libraries`) and reading/writing app-level config (`GET/PATCH /api/admin/config`, currently returning empty data). Admin status also surfaces a badge in the Settings UI. There is no privilege that allows an admin to access other users' credentials, delete accounts, or perform destructive operations on user data.

---

## Medium

### M1 — TOCTOU race in admin claim endpoint — **Resolved in v1.3.3**

**File**: `src/app/api/admin/claim/route.ts`

**Finding**: The "check if admin exists → set admin" sequence was two separate database operations with no transaction, creating a time-of-check / time-of-use window where concurrent requests could both pass the existence check and both write.

**Fix**: The read and insert are now wrapped in a single `db.transaction()`. SQLite serialises writes, so the first writer wins and the second receives `400 Admin already exists`.

---

### M2 — Deferred: Missing CSRF protection on state-mutating API routes

**Status**: Partially mitigated by design

All state-mutating routes require a valid `iron-session` cookie with `isLoggedIn: true`. Same-site cookie policy (`SameSite=Strict` or `Lax`) provides baseline CSRF mitigation for browser-initiated requests. Explicit CSRF token validation is not implemented. This is an accepted risk for the Docker deployment model (single-origin, self-hosted).

---

### M3 — Deferred: Session tokens stored in plaintext-equivalent iron-session cookie

**Status**: Accepted

`iron-session` encrypts and signs the cookie with `AUTH_SECRET`. The full session payload (including `AccessToken` for Jellyfin/Emby/Plex) is stored client-side. If `AUTH_SECRET` is compromised, all sessions are immediately compromised. Mitigated by C2 (stronger secret generation) and the assumption that `AUTH_SECRET` is kept in a secrets manager.

---

### M4 — `?provider=` query param allowed provider confusion in image proxy — **Resolved in v1.3.3**

**File**: `src/app/api/media/image/[id]/route.ts`

**Finding**: The image proxy route accepted a `?provider=` query parameter and used it to select which media provider to proxy through. A client could force the server to make requests via a different provider than the one the session is authenticated to.

**Fix**: `providerType` is now always derived exclusively from `auth?.provider` (the authenticated session). The `?provider=` query parameter is ignored.

---

### M5 — Missing Content-Security-Policy header — **Resolved in v1.3.3**

**File**: `next.config.ts`

**Finding**: No `Content-Security-Policy` header was set. XSS payloads could load external scripts, exfiltrate data, or embed the page in an iframe.

**Fix**: A strict CSP header is now enforced for all routes:

```
default-src 'self';
script-src 'self' 'unsafe-inline';
style-src 'self' 'unsafe-inline';
img-src 'self' data: blob: https:;
font-src 'self' data:;
connect-src 'self' https://plex.tv https://*.plex.direct wss://*.plex.direct https://api.themoviedb.org https://image.tmdb.org;
media-src 'self' blob:;
object-src 'none';
base-uri 'self';
form-action 'self';
frame-ancestors 'none';
```

`'unsafe-inline'` is required for `script-src` by Next.js inline script injection and for `style-src` by Tailwind CSS v4 runtime styles. `'unsafe-eval'` is intentionally omitted.

---

### M6 — Deferred: No audit log for admin actions

**Status**: Accepted

Administrative actions (library selection, config changes, admin claim) are not logged to a persistent audit trail. Addressed in a future release.

---

### M7 — Deferred: Guest session lending does not expire access tokens

**Status**: Accepted

When a guest is lent a host's access token for media lookup, the encrypted token is stored in the `Session` table with no expiry tied to session end. Token wipe on session end is a planned improvement.

---

### M8 — Stored access tokens used ECB-mode-equivalent AES key derivation — **Resolved in v1.3.3**

Covered by C3 above. The KDF weakness applied equally to all tokens stored in the `Session` table, not only the auth secret. The scrypt migration and v1-token wipe described in C3 address this finding.

---

### M9 — SSRF via user-supplied Plex server URL (DNS rebinding) — **Resolved in v1.3.3**

**Files**: `src/lib/security/url-guard.ts`, `src/lib/plex/api.ts`, `src/app/api/auth/plex/route.ts`

**Finding**: `assertSafeUrl` checked the hostname of a user-supplied Plex server URL using only regex and static pattern matching. A DNS rebinding attack could serve a public IP at resolution time, pass the check, then rebind to an internal address before the subsequent HTTP request is made.

**Fix**: `assertSafeResolvedUrl` was added to `url-guard.ts`. It calls `assertSafeUrl` first (structural check), then resolves the hostname via `dns.lookup({ all: true })` and checks every returned address against the private-IP rules. Any address in a private range causes an immediate error. The Plex auth route calls `assertSafePlexServerUrl` (exported from `plex/api.ts`) on the user-supplied server URL before passing it to `getBestServerUrl`.

---

### M10 — Deferred: Missing `Strict-Transport-Security` header

**Status**: Accepted — delegated to reverse proxy

`HSTS` is intentionally omitted from the Next.js `headers()` config because Swiparr is designed to run behind a reverse proxy (e.g., Nginx, Caddy, Traefik) that handles TLS termination and sets HSTS at the edge. Setting it in the application layer would cause issues when accessed over HTTP on the local network.

---

## Low findings

Low-severity findings (L1–L6) were reviewed separately and are not tracked in this document.

---

*Last updated: v1.3.3*
