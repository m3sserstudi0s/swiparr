# Implementation Plan: Minimal i18n Migration (Proxy-based)

## Objective
Enable multi-language support (EN/DE) using `next-intl` (Next.js 16 Proxy standard) with the absolute minimum of changes.

## Guiding Principle: "Minimal Intervention"
- **Strictly i18n:** No code refactoring, no bug fixes, no UI "improvements."
- **Proxy Standard:** Use `src/proxy.ts` instead of the deprecated `middleware.ts`.
- **Maintain Standards:** Adhere to the testing and build requirements of the Smok3y97/swiparr repository.

## Execution Roadmap

### Phase 1: Infrastructure (Proxy-Setup)
1. **Branching:** Create `feature/i18n-setup` from `master`.
2. **Dependencies:** Install `next-intl`.
3. **Proxy Setup:**
   - Create `src/proxy.ts` (replaces `middleware.ts`) using `createMiddleware` from `next-intl`.
   - Update `next.config.ts` with the `withNextIntl` plugin.
   - Configure `src/i18n/routing.ts` and `src/i18n/request.ts`.
4. **Folder Migration:**
   - Move `src/app/*` to `src/app/[locale]/` (excluding `api/`, `globals.css`, `favicon.ico`).
5. **String Extraction:**
   - Replace hardcoded strings with `t('key')` in `src/app/[locale]` and `src/components`.
   - Create `messages/en.json` with original text.

### Phase 2: Localization & Validation
1. **Translation:** Create `messages/de.json`.
2. **UI:** Add a minimal EN/DE toggle to the existing header.
3. **Testing (per Repository Guidelines):**
   - Run `npm run lint` to ensure no syntax errors.
   - Run `npm run build` to verify the Next.js compilation.
   - Run `docker build --build-arg URL_BASE_PATH=/ -t swiparr-test .` to ensure container compatibility.

## Verification Checklist (Smok3y97-Standard)
- [ ] `npm run lint` passes without errors.
- [ ] `npm run build` completes successfully.
- [ ] Docker container starts and handles `/en` and `/de` routes.
- [ ] Original functionality (Swiping, Search, Auth) remains unchanged.