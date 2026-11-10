# MESSER.md — Swiparr

Port: **1 (React)** · Brand: **`brand-swiparr`** (violet `oklch(.52 .13 300)`) · Sink: **`/ui`**

Adopted from `jakobbjelver/messer-ui@v0.1.3`: tokens copied to `src/styles/messer/` and imported by
`src/app/globals.css`; components stay local, so patches are ordinary edits and upstream deltas stay
visible through `shadcn add <item> --diff`.

## Local decisions

- Layout, sidebar mapping (`--sidebar-*` → surface/text tokens), navigation shape.
- Deck interactions (swipe, match overlay) — behaviour, not style.
- Copy voice.

## Deviations

| Date | Rule | What | Exit |
|---|---|---|---|
| 2026-11-08 | R2 | The swipe stack keeps `shadow-xl` on the front card, and movie posters keep `shadow-2xl` over artwork | Depth is the only signal that cards are stacked and that a poster floats over a backdrop; drop when the deck gets an explicit offset/blur treatment |
| 2026-11-08 | R1 | `rounded-full` remains on avatars and on the scroll-area / slider thumbs | Permanent — these are the sanctioned circles |
| 2026-11-08 | R9 | `@react-bits` / `@animate-ui` registry components keep their own icon sizes | Third-party items; revisit if they diverge visually |

## Notes from adoption

- `next lint` no longer exists in Next 16 and `eslint-config-next` was pinned to `^0.2.4` (a stub), so
  lint had never run. Fixed: `eslint-config-next@16.1.6`, `eslint@^9`, `npx eslint src`.
  Pre-existing `any` and React-Compiler-era rule violations are **warnings**, not errors.
- Icons: 71 lucide imports across 44 files replaced with Phosphor; server components import
  `@phosphor-icons/react/dist/ssr` (the browser entry calls `createContext`).
- The sink is public in development and behind the session in production unless `MESSER_SINK_PUBLIC=1`
  (see `src/proxy.ts`).

## Verify

```bash
npx eslint src            # 0 errors
npx tsc --noEmit          # 0 errors
npx next build
node ../messer-ui/scripts/check.mjs --url http://127.0.0.1:3001/ui --app . --profile full
```
