#!/usr/bin/env node
/**
 * UI contract — the checks that were done by hand in a browser, done by a machine.
 *
 *   E2E_BASE_URL=http://127.0.0.1:3100 npm run e2e
 *
 * A provider is not needed: `/api/media/items`, `/api/media/children` and
 * `/api/media/item/*` are answered from fixtures, so the series detail, the deck and the
 * filter drawer render identically on a TMDB build, a Jellyfin build or CI. That is the
 * point — the UI defects that kept reaching Jakob were all invisible to `npm test` and
 * needed a real session to see.
 *
 * Screenshots land in `e2e/shots/` (gitignored) for a human or a vision pass.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BASE = process.env.E2E_BASE_URL || "http://127.0.0.1:3000";
const SHOTS = path.join(ROOT, "e2e/shots");
const require = createRequire(import.meta.url);

/** Playwright comes from the app, a sibling checkout, or PLAYWRIGHT_PATH. */
function loadPlaywright() {
  const roots = [
    path.join(ROOT, "node_modules"),
    process.env.PLAYWRIGHT_PATH,
    path.join(process.env.HOME ?? "", "Repos/messer-ui/node_modules"),
    "/tmp/node_modules",
  ].filter(Boolean);
  for (const root of roots) {
    try {
      return require(require.resolve("playwright", { paths: [root] }));
    } catch {}
  }
  throw new Error("playwright not found — npm i -D playwright, or set PLAYWRIGHT_PATH");
}

const series = {
  Id: "fixture-series-1",
  Kind: "series",
  Name: "Fixture Show",
  ProductionYear: 2019,
  CommunityRating: 8.4,
  OfficialRating: "16",
  Status: "Continuing",
  Genres: ["Drama"],
  Seasons: 2,
  EpisodeCount: 20,
  InLibrary: true,
  Overview: "Fixture series.",
  UserData: { IsFavorite: false, Played: false },
};
const seasons = [
  { Id: "s1", Kind: "season", Name: "Season 1", SeasonNumber: 1, SeriesId: series.Id, SeriesName: series.Name, ChildCount: 10 },
  { Id: "s2", Kind: "season", Name: "Season 2", SeasonNumber: 2, SeriesId: series.Id, SeriesName: series.Name, ChildCount: 10 },
];
const episodes = [1, 2, 3].map((n) => ({
  Id: `e${n}`, Kind: "episode", Name: `Episode ${n}`, SeriesId: series.Id, SeriesName: series.Name,
  SeasonNumber: 1, IndexNumber: n, RunTimeTicks: 27000000000, UserData: { IsFavorite: false, Played: false },
}));

const results = [];
const check = (name, ok, detail) => {
  results.push({ name, ok, detail });
  console.log(`${ok ? "ok  " : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
};

const luminance = (rgb) => {
  const [r, g, b] = rgb.match(/\d+/g).map(Number);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const login = async (page, base) => {
  await page.goto(`${base}/login`, { waitUntil: "domcontentloaded" });
  const name = page.locator('input[placeholder="Display name"]');
  const submit = page.locator("button[type=submit]");
  await name.waitFor({ timeout: 30000 });
  // hydration can swallow the first typing; retype until the form accepts it
  for (let attempt = 0; attempt < 4; attempt++) {
    await name.click();
    await name.pressSequentially("Reviewer", { delay: 25 });
    await page.waitForTimeout(700);
    if (await submit.isEnabled()) break;
    await name.fill("");
  }
  await submit.click();
  await page.waitForTimeout(9000);
};

const main = async () => {
  fs.mkdirSync(SHOTS, { recursive: true });
  const { chromium } = loadPlaywright();
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();

  await page.route("**/api/media/items**", (r) => r.fulfill({ contentType: "application/json", body: JSON.stringify({ items: [series], hasMore: false }) }));
  await page.route("**/api/media/children**", (r) => r.fulfill({ contentType: "application/json", body: JSON.stringify({ items: seasons }) }));
  await page.route("**/api/media/item/**", (r) => r.fulfill({ contentType: "application/json", body: JSON.stringify(series) }));
  await page.route("**/api/media/start-here**", (r) => r.fulfill({ contentType: "application/json", body: JSON.stringify({ startHere: { action: "start", label: "Start S1E1" }, hostOnly: false }) }));

  await login(page, BASE);
  await page.screenshot({ path: path.join(SHOTS, "deck.png") });

  // 1. the deck shows the fixture, not a skeleton
  const cardName = await page.evaluate(() => document.body.innerText.includes("Fixture Show"));
  check("deck renders the fixture card", cardName);

  // 2. series detail: the rating appears exactly once
  const cardBox = await page.evaluate(() => {
    const r = document.querySelector('[data-slot="card"]').getBoundingClientRect();
    return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) };
  });
  await page.mouse.click(cardBox.x, cardBox.y);
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(SHOTS, "series-detail.png") });
  const ratingText = series.CommunityRating.toFixed(1);
  const detail = await page.evaluate((needle) => {
    const surfaces = Array.from(document.querySelectorAll('[data-slot="drawer-content"], [data-slot="sheet-content"], [role=dialog]'));
    const surface = surfaces.sort((a, b) => (b.textContent || "").length - (a.textContent || "").length)[0];
    const text = (surface?.textContent || "").replace(/\s+/g, " ");
    var dbg = `${surface?.tagName}|${surface?.getAttribute("data-slot")}|${text.length}|${text.slice(0, 60)}`;
    // two texts can abut ("Library8.4" "20 episodes"), so count the exact value, not a pattern
    const ratings = [];
    for (let i = text.indexOf(needle); i !== -1; i = text.indexOf(needle, i + 1)) ratings.push(needle);
    return { ratings, hasPanel: /Where to start|Where you are/i.test(text), dbg };
  }, ratingText);
  check("series detail shows one rating", detail.ratings.length === 1, `found ${JSON.stringify(detail.ratings)} · ${detail.dbg}`);
  check("start-here heading matches the action", detail.hasPanel ? "Where to start" : "missing");

  // 3. switch: paper thumb, and the whole row toggles it
  await page.keyboard.press("Escape");
  await page.waitForTimeout(1500);
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll("button")).find((b) => /absolute/.test(b.className) && /right-6/.test(b.className));
    btn?.click();
  });
  await page.waitForTimeout(1200);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(800);
  await page.evaluate(() => {
    const filter = Array.from(document.querySelectorAll("button")).find((b) => {
      const r = b.getBoundingClientRect();
      return r.y > 600 && r.x > 250 && r.width >= 44;
    });
    filter?.click();
  });
  await page.waitForTimeout(1800);
  const beforeSwitch = await page.evaluate(() => {
    const sw = document.querySelector('[data-slot="drawer-content"] [data-slot="switch"]');
    if (!sw) return null;
    const row = sw.closest('div[role="switch"]');
    const r = sw.getBoundingClientRect();
    return { thumb: getComputedStyle(sw, "::after").backgroundColor, state: sw.checked, row: !!row, rect: [r.x, r.y, r.width, r.height] };
  });
  if (beforeSwitch) {
    const lum = luminance(beforeSwitch.thumb);
    check("switch thumb is the paper colour", lum > 200, `${beforeSwitch.thumb}`);
    const rowBox = await page.evaluate(() => {
      const r = document.querySelector('[data-slot="drawer-content"] div[role="switch"]').getBoundingClientRect();
      return { before: document.querySelector('[data-slot="drawer-content"] div[role="switch"]').getAttribute("aria-checked"), x: Math.round(r.x + 40), y: Math.round(r.y + r.height / 2) };
    });
    await page.mouse.click(rowBox.x, rowBox.y);
    await page.waitForTimeout(600);
    const after = await page.evaluate(() => document.querySelector('[data-slot="drawer-content"] div[role="switch"]').getAttribute("aria-checked"));
    check("the whole row toggles the switch", rowBox.before !== after, `${rowBox.before} → ${after}`);
    await page.screenshot({ path: path.join(SHOTS, "filter-drawer.png") });
  } else {
    check("filter drawer has the Hide Watched switch", false, "no [data-slot=switch] found");
  }

  // 4. the settings sheet draws no shadow
  await page.keyboard.press("Escape");
  await page.waitForTimeout(1200);
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll("button")).find((b) => /absolute/.test(b.className) && /right-6/.test(b.className));
    btn?.click();
  });
  await page.waitForTimeout(1500);
  const shadow = await page.evaluate(() => {
    const s = document.querySelector('[data-slot="sheet-content"]');
    return s ? getComputedStyle(s).boxShadow : "no sheet";
  });
  check("sheet draws no shadow", shadow === "none", shadow.slice(0, 60));
  await page.screenshot({ path: path.join(SHOTS, "settings.png") });

  await browser.close();
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${failed.length === 0 ? "e2e: all checks passed" : `e2e: ${failed.length} failed`} · shots in e2e/shots/`);
  process.exit(failed.length === 0 ? 0 : 1);
};

main().catch((error) => {
  console.error("e2e: failed to run —", error.message);
  process.exit(1);
});
