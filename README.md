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
  "keywords": ["Python", "ONNX"]
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

## Motion

Motion is spent where a first visit benefits and kept out of the way of reading:

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
