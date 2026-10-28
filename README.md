# Portfolio

Personal portfolio for Ayomide Abikoye, CS undergrad at Academic City University.

**Live:** https://ayomide-abikoye.vercel.app

## How content updates

Nothing here needs editing by hand.

### Projects: from each repo, every 15 minutes

Any public repo under [Abiks06](https://github.com/Abiks06) tagged with the `portfolio` topic gets a card: description, homepage, stars, languages and topics come from GitHub. The repo can describe its own card in `.github/portfolio.json` (every field optional):

```json
{
  "name": "PlateSight: License Plate Detection",
  "featured": true,
  "startDate": "2026-10",
  "highlights": ["One line per highlight."],
  "keywords": ["Python", "ONNX"],
  "image": "https://… (optional: otherwise the card shows a screenshot of the live demo)",
  "screenshot": { "waitForHidden": ".loading", "delay": 3000 }
}
```

So adding a project is: push the repo, add the `portfolio` topic and, optionally, that file. The site picks it up within 15 minutes (or straight away via `/api/revalidate?secret=<REVALIDATE_SECRET>`); no change to this repo, no redeploy. A project without a repo can still go in `content/resume.json` under `projects`, and an entry there with a `repo` field overrides that repo's file field by field.

### Credentials: an issue form, or your LinkedIn export

Education, experience, leadership, certificates and skills live in `content/resume.json` ([JSON Resume](https://jsonresume.org/schema) format). Two ways to update it without touching the file:

- **One change, from anywhere:** [open a Credential issue](https://github.com/Abiks06/portfolio/issues/new?template=credential.yml) (works in the GitHub mobile app). The `Apply credential` workflow adds, updates or removes the entry, commits it (which redeploys the site), replies and closes the issue. Existing entries are matched by title and organization, loosely ("Ecobank Ghana" finds "Ecobank Ghana (eProcess)"), and only the fields you fill in change. If something's invalid it says so on the issue; edit the issue to retry. Only issues opened by the repo owner are applied.
- **Everything from LinkedIn:** LinkedIn has no API for personal profiles, so request your data (LinkedIn → Settings → Data privacy → Get a copy of your data) and run the importer on the zip it emails you:

  ```bash
  npm run import:linkedin -- ~/Downloads/Basic_LinkedInDataExport.zip --dry-run
  npm run import:linkedin -- ~/Downloads/Basic_LinkedInDataExport.zip
  ```

  It adds new positions, education and certifications, fills in fields the site is missing and lists anything that differs, without touching the highlights written here. `--overwrite` takes LinkedIn's dates and locations instead; `--skills` adds LinkedIn skills the site doesn't list under "More". The zip is read in memory and never extracted; it also contains your messages and contacts, so don't commit it. Review `git diff`, then commit and push.

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS · Motion · Lenis · deployed on Vercel. GitHub data is pre-rendered and re-checked every 15 minutes, so a newly tagged repo appears with no per-repo setup. For an immediate refresh, open `/api/revalidate?secret=<REVALIDATE_SECRET>`.

### Screenshots of each live demo

`.github/workflows/screenshots.yml` runs `scripts/capture-screenshots.mjs` daily: headless Chrome opens every tagged project's homepage, and the images (2560×1600 WebP) are published to the `screenshots` branch as a single force-pushed commit. The site serves them from that commit on raw.githubusercontent.com. A capture that never reaches its ready state is dropped and the previous image is kept, so a loading screen never replaces a real screenshot.

A project tunes its capture with a `screenshot` block in its card file: `path`, `waitFor`, `waitForHidden`, `click`, `delay`, `colorScheme`, `hide` and `skip` (see the script's header). Two need a real machine and are refreshed locally:

- `"gpu": true` for scenes CI can't render (the ATM's Spline scene is WebGPU-only); CI keeps the last image.
- `"login": {...}` for apps behind sign-in. Credentials come only from `SHOT_LOGIN_<SLUG>="email:password"`, never from the card. Issue Logger is captured from a local copy running its own seed data:

```bash
SHOT_LOGIN_ISSUE_LOGGER="ada@demo.test:demo-password-1" CHROME_PATH="<chrome or edge>" npm run screenshots -- ./shots --base issue-logger=http://localhost:3000
```

Then publish `./shots` to the `screenshots` branch (or run the workflow, which keeps everything it can't capture).

## Features

- **Live from GitHub:** project cards (with a screenshot of each live demo, taken by [Microlink](https://microlink.io)'s free API and refreshed every 6 hours), stars and languages, a "Right now on GitHub" feed of the latest commits, pull requests and new repos, and the contribution calendar, which can switch to a **3D city** you can turn.
- **Stack constellation:** an interactive map of which tools each project uses, built from the same data; point at a node to trace it, click a project to open it.
- **Printable CV** at [/cv](https://ayomide-abikoye.vercel.app/cv), generated from `resume.json` and the featured projects; "Save as PDF" gives a clean two-page A4.
- **Light/dark theme toggle** (remembered, or following the system), local time in Accra and current availability (`basics.availability` in `resume.json`).
- **⌘K / Ctrl+K / `/` command menu** for everything above, and an easter egg for anyone who knows a certain cheat code.

## Motion

Motion is spent where a first visit benefits and kept out of the way of reading:

- **Background:** a topographic contour field drawn by one WebGL2 shader behind the whole page. It drifts, bends around the cursor like a lens (warming to the accent), and stirs as you scroll. Started once the page is idle, 30 fps (20 on phones) at reduced resolution, paused in hidden tabs.
- **3D:** the hero sculpture spins when you drag it (and coasts); a click shatters it, each face on its own spring, tumbling about its own axis and re-shading as it turns, then snapping home with a small overshoot while the wire cage breathes out. The contact section's initials are ~2,500 points with depth that tilt toward the cursor, part around it and scatter on click. The contribution city rises out of the ground week by week.
- **Type:** the letters of the name lean away from the cursor; a statement under the hero lights up word by word as you scroll through it.
- **Theme switch:** the new theme spreads out in a circle from the toggle (View Transitions API).
- **Scroll-linked:** the hero's text and sculpture separate into layers as you scroll away; a two-row skills marquee drifts and follows your scroll speed and direction; the timeline rail draws itself and each job's dot fills as it reaches the middle of the screen; a hairline under the nav shows reading progress.
- **On arrival:** section headings rise word by word out of a mask, matching the hero; stats count up; project cards and the contribution calendar stagger in.
- **On the pointer (mouse and trackpad only):** project cards tilt and carry a soft spotlight; the main buttons lean toward the cursor.
- **Feedback:** the nav marks the current section; "Copy email" confirms in place; a project card expands into its detail view.
- **⌘K / Ctrl+K / `/`:** a command menu to jump to any section, open any project or copy the email. It opens instantly, on purpose: anything opened from the keyboard should.

Everything honours `prefers-reduced-motion` (no movement, content shown in place), uses transforms and opacity only, and pauses off-screen.

## Setup

1. Use Node 24 (see `.nvmrc`).
2. Copy `.env.example` to `.env.local` and add a read-only GitHub token.
3. `npm install` then `npm run dev`.
