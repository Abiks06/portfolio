/**
 * Screenshots each portfolio project's live demo for its card.
 *
 *   CHROME_PATH=/path/to/chrome node scripts/capture-screenshots.mjs <out-dir> [--only slug]
 *
 * SHOTS_OVERRIDE='{"slug": {...}}' tries screenshot settings locally before committing them.
 *
 * Run daily by .github/workflows/screenshots.yml, which publishes <out-dir> to the `screenshots`
 * branch; the site serves the images from there. A project's .github/portfolio.json
 * can tune its capture (all optional):
 *
 *   "screenshot": {
 *     "path": "/dashboard",          appended to the homepage
 *     "waitFor": ".chart",           wait until this exists
 *     "waitForHidden": ".loading",   wait until this is gone (e.g. a 3D scene's loading veil)
 *     "click": [".tour .skip"],      clicked in order, after the waits
 *     "delay": 2000,                 ms to let animations settle before the shot
 *     "colorScheme": "dark",         emulated prefers-color-scheme
 *     "hide": [".cookie-banner"],    hidden with CSS
 *     "gpu": true,                   needs a real GPU (e.g. a WebGPU-only scene): CI skips it,
 *                                    a local run (npm run screenshots) refreshes it
 *     "login": {                     sign in first; credentials come from the environment,
 *       "path": "/auth/login",       SHOT_LOGIN_<SLUG>="email:password", never from the card
 *       "email": "#email", "password": "#password", "submit": "button[type=submit]"
 *     },
 *     "skip": true                   never capture (set "image" in the card instead)
 *   }
 *
 * --base slug=http://localhost:3000 captures a project from a local copy instead of its live
 * site (e.g. an app behind a login, run with its seed data).
 *
 * A capture whose waits time out is dropped, and the previous image stays: a loading screen
 * never replaces a real screenshot. Projects with an "image" in their card file are skipped.
 */
import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";

const USER = process.env.GITHUB_USERNAME ?? "Abiks06";
const TOPIC = "portfolio";
const API = "https://api.github.com";
const WIDTH = 1280;
const HEIGHT = 800;
const SCALE = 2; // crisp on high-density screens; WebP keeps it small

const out = process.argv[2];
const arg = (name) => (process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : null);
const only = arg("--only");
const bases = Object.fromEntries((arg("--base") ?? "").split(",").filter(Boolean).map((kv) => kv.split("=")));
const ci = process.env.CI === "true";
if (!out) {
  console.error("Usage: node scripts/capture-screenshots.mjs <out-dir> [--only slug]");
  process.exit(1);
}

const headers = { Accept: "application/vnd.github+json", ...(process.env.GITHUB_TOKEN && { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }) };
const gh = async (url, accept) => {
  const res = await fetch(`${API}${url}`, { headers: { ...headers, ...(accept && { Accept: accept }) } });
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  return res.json();
};
const slugOf = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

async function projects() {
  const repos = await gh(`/users/${USER}/repos?per_page=100&type=owner`);
  const tagged = repos.filter((r) => !r.fork && !r.archived && r.homepage && r.topics?.includes(TOPIC));
  return Promise.all(
    tagged.map(async (r) => {
      const card = await gh(`/repos/${USER}/${r.name}/contents/.github/portfolio.json`, "application/vnd.github.raw+json").catch(() => ({}));
      const override = JSON.parse(process.env.SHOTS_OVERRIDE ?? "{}")[slugOf(r.name)];
      return { slug: slugOf(r.name), homepage: r.homepage, image: card.image, shot: override ?? card.screenshot ?? {} };
    }),
  );
}

async function capture(browser, p) {
  const page = await browser.newPage();
  try {
    await page.setViewport({ width: WIDTH, height: HEIGHT, deviceScaleFactor: SCALE });
    await page.emulateMediaFeatures([
      { name: "prefers-color-scheme", value: p.shot.colorScheme ?? "light" },
      { name: "prefers-reduced-motion", value: "no-preference" },
    ]);
    const home = bases[p.slug] ?? p.homepage;
    if (p.shot.login) {
      const creds = process.env[`SHOT_LOGIN_${p.slug.toUpperCase().replace(/-/g, "_")}`];
      if (!creds) throw new Error("needs SHOT_LOGIN_* credentials");
      const [email, ...rest] = creds.split(":");
      const l = p.shot.login;
      await page.goto(new URL(l.path ?? "/login", home).href, { waitUntil: "networkidle2", timeout: 45_000 });
      await page.type(l.email ?? "input[type=email]", email);
      await page.type(l.password ?? "input[type=password]", rest.join(":"));
      await Promise.all([page.waitForNavigation({ waitUntil: "networkidle2", timeout: 45_000 }), page.click(l.submit ?? "button[type=submit]")]);
    }
    const url = new URL(p.shot.path ?? "/", home).href;
    await page.goto(url, { waitUntil: "networkidle2", timeout: 45_000 });
    if (p.shot.waitFor) await page.waitForSelector(p.shot.waitFor, { visible: true, timeout: 30_000 });
    if (p.shot.waitForHidden) await page.waitForSelector(p.shot.waitForHidden, { hidden: true, timeout: 40_000 });
    for (const sel of p.shot.click ?? []) {
      await page.waitForSelector(sel, { visible: true, timeout: 15_000 });
      await page.click(sel);
      await new Promise((r) => setTimeout(r, 600));
    }
    if (p.shot.hide?.length) await page.addStyleTag({ content: `${p.shot.hide.join(",")}{visibility:hidden!important}` });
    await new Promise((r) => setTimeout(r, p.shot.delay ?? 2500));
    const file = `${p.slug}.webp`;
    await page.screenshot({ path: path.join(out, file), type: "webp", quality: 82 });
    return file;
  } finally {
    await page.close();
  }
}

fs.mkdirSync(out, { recursive: true });
const manifestPath = path.join(out, "manifest.json");
const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, "utf8")) : {};
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH,
  headless: "new",
  // In CI, software WebGL so WebGL demos render without a GPU; locally, the real GPU (WebGPU too).
  args: ["--hide-scrollbars", ...(ci ? ["--no-sandbox", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] : [])],
});
let failures = 0;
try {
  for (const p of await projects()) {
    if (only && p.slug !== only) continue;
    if (p.image || p.shot.skip || (ci && p.shot.gpu)) {
      console.log(`${p.slug}: skipped (${p.image ? "card has its own image" : p.shot.skip ? "skip: true" : "needs a GPU; refresh it locally"})`);
      continue;
    }
    try {
      const file = await capture(browser, p);
      manifest[p.slug] = { file, url: p.homepage, capturedAt: new Date().toISOString() };
      console.log(`${p.slug}: captured ${file}`);
    } catch (error) {
      failures++;
      console.warn(`${p.slug}: kept the previous image (${error.message.split("\n")[0]})`);
    }
  }
} finally {
  await browser.close();
}
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
if (failures) console.warn(`${failures} capture(s) failed; their previous images were kept.`);
