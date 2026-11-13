#!/usr/bin/env node
/**
 * Live contract — the same invariants as `contract.mjs`, but against a real provider.
 *
 *   E2E_BASE_URL=http://127.0.0.1:3000 npm run e2e:live
 *
 * Credentials come from `~/.config/messer/jellyfin-test.env` (chmod 600) and are never printed.
 * The Jellyfin server is reached by the app itself (`http://jellyfin:8096`), so no Cloudflare
 * Access is involved.
 *
 * This is the check that fixtures cannot make: real paging, real kinds, real seasons.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BASE = process.env.E2E_BASE_URL || "http://127.0.0.1:3000";
const SHOTS = path.join(ROOT, "e2e/shots");
const require = createRequire(import.meta.url);

function loadPlaywright() {
  for (const root of [path.join(ROOT, "node_modules"), process.env.PLAYWRIGHT_PATH, path.join(os.homedir(), "Repos/messer-ui/node_modules"), "/tmp/node_modules"].filter(Boolean)) {
    try {
      return require(require.resolve("playwright", { paths: [root] }));
    } catch {}
  }
  throw new Error("playwright not found — npm i -D playwright, or set PLAYWRIGHT_PATH");
}

function credentials() {
  const file = process.env.E2E_CREDENTIALS || path.join(os.homedir(), ".config/messer/jellyfin-test.env");
  if (!fs.existsSync(file)) throw new Error(`no credential file at ${file}`);
  const env = {};
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].trim();
  }
  if (!env.JELLYFIN_USER || !env.JELLYFIN_PASSWORD) throw new Error("credential file is missing JELLYFIN_USER / JELLYFIN_PASSWORD");
  return env;
}

const results = [];
const check = (name, ok, detail) => {
  results.push({ name, ok, detail });
  console.log(`${ok ? "ok  " : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
};

const luminance = (rgb) => {
  const [r, g, b] = rgb.match(/\d+/g).map(Number);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const main = async () => {
  fs.mkdirSync(SHOTS, { recursive: true });
  const { JELLYFIN_USER, JELLYFIN_PASSWORD } = credentials();
  const { chromium } = loadPlaywright();
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();

  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  const user = page.locator('input[placeholder="Username"]');
  await user.waitFor({ timeout: 30000 });
  await user.click();
  await user.pressSequentially(JELLYFIN_USER, { delay: 20 });
  const pass = page.locator('input[placeholder="Password"]');
  await pass.click();
  await pass.pressSequentially(JELLYFIN_PASSWORD, { delay: 20 });
  const submit = page.locator("button[type=submit]");
  for (let i = 0; i < 4 && !(await submit.isEnabled()); i++) {
    await pass.click();
    await pass.pressSequentially("x", { delay: 30 });
    await pass.press("Backspace");
    await page.waitForTimeout(400);
  }
  await submit.click();
  await page.waitForTimeout(14000);
  // A fresh database promotes the first user to admin and says so behind a Continue button.
  const continued = await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll("button")).find((b) => b.textContent?.trim().startsWith("Continue"));
    if (!btn) return false;
    btn.click();
    return true;
  });
  if (continued) await page.waitForTimeout(6000);
  await page.screenshot({ path: path.join(SHOTS, "live-deck.png") });

  // 1. a real card rendered
  const deckText = await page.evaluate(() => document.body.innerText.replace(/\s+/g, " ").trim());
  check("deck renders a real card", deckText.length > 40, deckText.slice(0, 70));

  // 2. mixed deck really contains both kinds (the 1.10.0 interleave, on live data)
  const mixed = await page.evaluate(async () => {
    const res = await fetch('/api/media/items?limit=40&filters=' + encodeURIComponent(JSON.stringify({ kinds: ["movie", "series"] })));
    if (!res.ok) return { error: res.status };
    const data = await res.json();
    const items = data.items || [];
    const counts = items.reduce((acc, item) => { const k = item.Kind || "movie"; acc[k] = (acc[k] || 0) + 1; return acc; }, {});
    return { total: items.length, counts, firstFive: items.slice(0, 5).map((i) => `${i.Kind || "movie"}:${i.Name}`) };
  });
  check("mixed deck returns shows as well as films", !mixed.error && (mixed.counts?.series || 0) > 0, JSON.stringify(mixed.counts ?? mixed));

  // 3. series detail: one rating, and the seasons carry episodes
  const opened = await page.evaluate(async () => {
    const res = await fetch('/api/media/items?limit=20&filters=' + encodeURIComponent(JSON.stringify({ kinds: ["series"] })));
    if (!res.ok) return null;
    const data = await res.json();
    return (data.items || [])[0] || null;
  });
  check("series deck has a show", !!opened, opened?.Name || "none");

  if (opened) {
    const detail = await page.evaluate(async (id) => {
      const res = await fetch(`/api/media/children?seriesId=${encodeURIComponent(id)}&kind=season`);
      const seasons = res.ok ? (await res.json()).items || [] : [];
      const seasonNumbers = [...new Set(seasons.map((s) => s.SeasonNumber))].sort((a, b) => a - b);
      const counts = [];
      for (const n of seasonNumbers.slice(0, 4)) {
        const r = await fetch(`/api/media/children?seriesId=${encodeURIComponent(id)}&kind=episode&season=${n}`);
        counts.push({ season: n, episodes: r.ok ? (await r.json()).items?.length ?? 0 : -1 });
      }
      return { seasonNumbers, counts };
    }, opened.Id);
    // A season the library has no files for is legitimate (a placeholder for an unaired season),
    // so the invariant is: every requested season answers, and the show's episodes are reachable.
    const total = detail.counts.reduce((sum, c) => sum + Math.max(c.episodes, 0), 0);
    check("seasons resolve and carry episodes", detail.counts.every((c) => c.episodes >= 0) && total > 0, JSON.stringify(detail.counts));
  }

  // 4. filter drawer: paper knob, whole row toggles
  await page.evaluate(() => {
    const filter = Array.from(document.querySelectorAll("button")).find((b) => {
      const r = b.getBoundingClientRect();
      return r.y > 600 && r.x > 250 && r.width >= 44;
    });
    filter?.click();
  });
  await page.waitForTimeout(2000);
  const sw = await page.evaluate(() => {
    const el = document.querySelector('[data-slot="drawer-content"] [data-slot="switch"]');
    if (!el) return null;
    const thumb = el;
    const row = el.closest('div[role="switch"]');
    const r = row?.getBoundingClientRect();
    return { thumb: getComputedStyle(el, "::after").backgroundColor, row: !!row, box: r ? { x: Math.round(r.x + 40), y: Math.round(r.y + r.height / 2) } : null, before: row?.getAttribute("aria-checked") };
  });
  if (sw) {
    check("switch knob is the paper colour", luminance(sw.thumb) > 200, sw.thumb);
    if (sw.box) {
      await page.mouse.click(sw.box.x, sw.box.y);
      await page.waitForTimeout(600);
      const after = await page.evaluate(() => document.querySelector('[data-slot="drawer-content"] div[role="switch"]')?.getAttribute("aria-checked"));
      check("the whole row toggles the switch", sw.before !== after, `${sw.before} → ${after}`);
      await page.mouse.click(sw.box.x, sw.box.y);
      await page.waitForTimeout(500);
    }
    await page.screenshot({ path: path.join(SHOTS, "live-filter.png") });
  } else {
    check("filter drawer has a switch", false, "none found");
  }

  // 5. settings sheet: no shadow, region popup opens clean
  await page.keyboard.press("Escape");
  await page.waitForTimeout(1200);
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll("button")).find((b) => /absolute/.test(b.className) && /right-6/.test(b.className));
    btn?.click();
  });
  await page.waitForTimeout(1600);
  const shadow = await page.evaluate(() => {
    const s = document.querySelector('[data-slot="sheet-content"]');
    return s ? getComputedStyle(s).boxShadow : "no sheet";
  });
  check("settings sheet draws no shadow", shadow === "none", shadow.slice(0, 60));
  await page.screenshot({ path: path.join(SHOTS, "live-settings.png") });

  await browser.close();
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${failed.length === 0 ? "e2e:live all checks passed" : `e2e:live ${failed.length} failed`} · shots in e2e/shots/`);
  process.exit(failed.length === 0 ? 0 : 1);
};

main().catch((error) => {
  console.error("e2e:live failed to run —", error.message);
  process.exit(1);
});
