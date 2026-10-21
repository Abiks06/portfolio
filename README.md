# Portfolio

Personal portfolio for Ayomide Abikoye, CS undergrad at Academic City University.

**Live:** https://ayomide-abikoye.vercel.app

## How content updates

- **Projects** come from GitHub: any public repo under [Abiks06](https://github.com/Abiks06) tagged with the `portfolio` topic. Extra detail (highlights, dates, featured flag) lives in `content/resume.json` under `projects`, matched by `repo` name.
- **Credentials** (education, experience, leadership, skills, certificates) come from `content/resume.json` ([JSON Resume](https://jsonresume.org/schema) format). Edit it and push.

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS · Motion · Lenis · deployed on Vercel. GitHub data is pre-rendered and re-checked every 15 minutes, so a newly tagged repo appears with no per-repo setup. For an immediate refresh, open `/api/revalidate?secret=<REVALIDATE_SECRET>`.

## Setup

1. Use Node 24 (see `.nvmrc`).
2. Copy `.env.example` to `.env.local` and add a read-only GitHub token.
3. `npm install` then `npm run dev`.
