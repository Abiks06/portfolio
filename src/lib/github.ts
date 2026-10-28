import { cacheLife, cacheTag } from "next/cache";
import { resume, type ResumeProject } from "./resume";

/** Tag shared by all GitHub data; /api/revalidate refreshes it on demand. */
export const GITHUB_CACHE_TAG = "github";

/** Re-check GitHub every 15 minutes; new portfolio-tagged repos appear without any per-repo setup. */
const GITHUB_CACHE_LIFE = { stale: 300, revalidate: 900, expire: 86400 };

const API = "https://api.github.com";
const USERNAME = process.env.GITHUB_USERNAME ?? "Abiks06";
const TOPIC = process.env.GITHUB_PORTFOLIO_TOPIC ?? "portfolio";

export type Project = {
  slug: string;
  name: string;
  description: string | null;
  url: string | null;
  homepage: string | null;
  stars: number;
  forks: number;
  pushedAt: string | null;
  topics: string[];
  /** Bytes of code per language, largest first. */
  languages: { name: string; bytes: number }[];
  featured: boolean;
  highlights: string[];
  keywords: string[];
  startDate?: string;
  endDate?: string;
  /** A picture of the project: the card's own image, else a screenshot of its live demo. */
  image: string | null;
};

export type ContributionDay = { date: string; count: number; level: 0 | 1 | 2 | 3 | 4 };

type GitHubRepo = {
  name: string;
  description: string | null;
  html_url: string;
  homepage: string | null;
  stargazers_count: number;
  forks_count: number;
  pushed_at: string;
  topics?: string[];
  fork: boolean;
  archived: boolean;
};

function headers(accept = "application/vnd.github+json"): HeadersInit {
  const token = process.env.GITHUB_TOKEN;
  return {
    Accept: accept,
    "X-GitHub-Api-Version": "2022-11-28",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function gh<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`, { headers: headers() });
  if (!res.ok) throw new Error(`GitHub ${path} failed: ${res.status}`);
  return res.json() as Promise<T>;
}

function prettify(repoName: string) {
  return repoName.replace(/[-_]+/g, " ");
}

/** Where a project repo keeps its own card data (all fields optional). */
const CARD_PATH = ".github/portfolio.json";

type Card = Partial<Omit<ResumeProject, "repo">> & { image?: string };

const isDate = (v: unknown): v is string => typeof v === "string" && /^\d{4}(-\d{2})?$/.test(v);
const isStrings = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === "string");

/** Keeps only well-formed fields, so a typo in one repo's file can't break the page. */
function parseCard(raw: unknown): Card {
  if (!raw || typeof raw !== "object") return {};
  const r = raw as Record<string, unknown>;
  return {
    ...(typeof r.name === "string" && { name: r.name }),
    ...(typeof r.featured === "boolean" && { featured: r.featured }),
    ...(typeof r.description === "string" && { description: r.description }),
    ...(isDate(r.startDate) && { startDate: r.startDate }),
    ...(isDate(r.endDate) && { endDate: r.endDate }),
    ...(isStrings(r.highlights) && { highlights: r.highlights }),
    ...(isStrings(r.keywords) && { keywords: r.keywords }),
    ...(typeof r.image === "string" && r.image.startsWith("https://") && { image: r.image }),
  };
}

/** The repo's own .github/portfolio.json, or nothing when it has none. */
async function repoCard(repo: string): Promise<Card> {
  try {
    const res = await fetch(`${API}/repos/${USERNAME}/${repo}/contents/${CARD_PATH}`, { headers: headers("application/vnd.github.raw+json") });
    return res.ok ? parseCard(await res.json()) : {};
  } catch {
    return {};
  }
}

function toProject(repo: GitHubRepo | null, extra: Card | undefined, languages: Record<string, number>): Project {
  const name = extra?.name ?? prettify(repo?.name ?? "");
  return {
    slug: (repo?.name ?? name).toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    name,
    // Repos without a GitHub description borrow the first resume highlight.
    description: repo?.description ?? extra?.description ?? extra?.highlights?.[0] ?? null,
    url: repo?.html_url ?? null,
    homepage: repo?.homepage || null,
    stars: repo?.stargazers_count ?? 0,
    forks: repo?.forks_count ?? 0,
    pushedAt: repo?.pushed_at ?? null,
    topics: (repo?.topics ?? []).filter((t) => t !== TOPIC),
    languages: Object.entries(languages)
      .map(([name, bytes]) => ({ name, bytes }))
      .sort((a, b) => b.bytes - a.bytes),
    featured: extra?.featured ?? false,
    highlights: extra?.highlights ?? [],
    keywords: extra?.keywords ?? [],
    startDate: extra?.startDate,
    endDate: extra?.endDate,
    image: extra?.image ?? null,
  };
}

/**
 * A 1280×800 screenshot of a live demo from Microlink's free API (no key, 50 a day). Cached for
 * 6 hours per URL, so a handful of projects stays far under the limit and a redesigned demo
 * shows up the same day. Null on any failure: the card just has no picture.
 */
async function screenshot(url: string): Promise<string | null> {
  "use cache";
  cacheLife({ stale: 3600, revalidate: 21600, expire: 43200 });
  cacheTag(GITHUB_CACHE_TAG);
  try {
    const q = new URLSearchParams({
      url,
      screenshot: "true",
      meta: "false",
      "viewport.width": "1280",
      "viewport.height": "800",
      "viewport.deviceScaleFactor": "1",
      "screenshot.type": "jpeg",
      waitForTimeout: "1500",
    });
    const res = await fetch(`https://api.microlink.io/?${q}`);
    if (!res.ok) return null;
    const body = (await res.json()) as { status?: string; data?: { screenshot?: { url?: string } } };
    const shot = body.data?.screenshot?.url;
    return body.status === "success" && shot?.startsWith("https://") ? shot : null;
  } catch {
    return null;
  }
}

/** Projects from resume.json alone, used when GitHub is unreachable. */
function fallbackProjects(): Project[] {
  return resume.projects.map((p) => toProject(null, p, {}));
}

/**
 * Public repos tagged with the portfolio topic, each described by its own
 * .github/portfolio.json (overridden field by field by a matching resume.json entry),
 * plus resume-only projects that have no repo.
 * Featured first, then most recently pushed.
 */
export async function getProjects(): Promise<Project[]> {
  "use cache";
  cacheLife(GITHUB_CACHE_LIFE);
  cacheTag(GITHUB_CACHE_TAG);

  try {
    const repos = await gh<GitHubRepo[]>(`/users/${USERNAME}/repos?per_page=100&type=owner&sort=pushed`);
    const tagged = repos.filter((r) => !r.fork && !r.archived && r.topics?.includes(TOPIC));
    const byRepo = new Map(resume.projects.filter((p) => p.repo).map((p) => [p.repo!.toLowerCase(), p]));

    const fromGitHub = await Promise.all(
      tagged.map(async (repo) => {
        const [languages, card] = await Promise.all([
          gh<Record<string, number>>(`/repos/${USERNAME}/${repo.name}/languages`).catch(() => ({})),
          repoCard(repo.name),
        ]);
        const project = toProject(repo, { ...card, ...byRepo.get(repo.name.toLowerCase()) }, languages);
        if (!project.image && project.homepage) project.image = await screenshot(project.homepage);
        return project;
      }),
    );
    const resumeOnly = resume.projects.filter((p) => !p.repo).map((p) => toProject(null, p, {}));

    return [...fromGitHub, ...resumeOnly].sort(
      (a, b) => Number(b.featured) - Number(a.featured) || (b.pushedAt ?? "").localeCompare(a.pushedAt ?? ""),
    );
  } catch (error) {
    console.error(error);
    return fallbackProjects();
  }
}

/** Public profile numbers for the stats row; null when GitHub is unreachable. */
export async function getGitHubStats(): Promise<{ publicRepos: number; followers: number } | null> {
  "use cache";
  cacheLife(GITHUB_CACHE_LIFE);
  cacheTag(GITHUB_CACHE_TAG);

  try {
    const user = await gh<{ public_repos: number; followers: number }>(`/users/${USERNAME}`);
    return { publicRepos: user.public_repos, followers: user.followers };
  } catch (error) {
    console.error(error);
    return null;
  }
}

/** Last year of contributions. Needs GITHUB_TOKEN (GraphQL only); returns null without one. */
export async function getContributions(): Promise<{ total: number; days: ContributionDay[] } | null> {
  "use cache";
  cacheLife(GITHUB_CACHE_LIFE);
  cacheTag(GITHUB_CACHE_TAG);

  if (!process.env.GITHUB_TOKEN) return null;

  const query = `query($login: String!) {
    user(login: $login) {
      contributionsCollection {
        contributionCalendar {
          totalContributions
          weeks { contributionDays { date contributionCount contributionLevel } }
        }
      }
    }
  }`;
  const levels = { NONE: 0, FIRST_QUARTILE: 1, SECOND_QUARTILE: 2, THIRD_QUARTILE: 3, FOURTH_QUARTILE: 4 } as const;

  try {
    const res = await fetch(`${API}/graphql`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ query, variables: { login: USERNAME } }),
    });
    if (!res.ok) throw new Error(`GitHub GraphQL failed: ${res.status}`);
    const { data } = await res.json();
    const calendar = data.user.contributionsCollection.contributionCalendar;
    const days: ContributionDay[] = calendar.weeks.flatMap(
      (w: { contributionDays: { date: string; contributionCount: number; contributionLevel: keyof typeof levels }[] }) =>
        w.contributionDays.map((d) => ({ date: d.date, count: d.contributionCount, level: levels[d.contributionLevel] })),
    );
    return { total: calendar.totalContributions, days };
  } catch (error) {
    console.error(error);
    return null;
  }
}

export type Activity = { id: string; kind: "push" | "pr" | "repo" | "release" | "star"; repo: string; title: string; url: string; at: string };

type GitHubEvent = {
  id: string;
  type: string;
  created_at: string;
  repo: { name: string };
  payload: {
    head?: string;
    ref?: string;
    ref_type?: string;
    action?: string;
    number?: number;
    pull_request?: { number: number; title?: string; html_url?: string; url?: string; merged?: boolean };
    release?: { name: string | null; tag_name: string; html_url: string };
  };
};

/**
 * The latest public things done on GitHub, newest first: pushes (with the commit message, which
 * the events API no longer includes), pull requests, new repositories and releases. Consecutive
 * pushes to one repo collapse into the newest. Empty when GitHub is unreachable.
 */
export async function getActivity(limit = 5): Promise<Activity[]> {
  "use cache";
  cacheLife(GITHUB_CACHE_LIFE);
  cacheTag(GITHUB_CACHE_TAG);

  try {
    const events = await gh<GitHubEvent[]>(`/users/${USERNAME}/events/public?per_page=40`);
    events.sort((a, b) => b.created_at.localeCompare(a.created_at));
    const picked: GitHubEvent[] = [];
    for (const e of events) {
      if (picked.length >= limit) break;
      const last = picked.at(-1);
      // A run of the same kind of event on one repo collapses into its newest, so the feed shows a mix.
      if (last && last.type === e.type && last.repo.name === e.repo.name) continue;
      if (["PushEvent", "PullRequestEvent", "CreateEvent", "ReleaseEvent"].includes(e.type)) {
        if (e.type === "CreateEvent" && e.payload.ref_type !== "repository") continue;
        if (e.type === "PullRequestEvent" && !["opened", "closed"].includes(e.payload.action ?? "")) continue;
        picked.push(e);
      }
    }
    return await Promise.all(
      picked.map(async (e): Promise<Activity> => {
        const repo = e.repo.name.split("/")[1] ?? e.repo.name;
        const repoUrl = `https://github.com/${e.repo.name}`;
        if (e.type === "PushEvent") {
          const commit = e.payload.head
            ? await gh<{ commit: { message: string }; html_url: string }>(`/repos/${e.repo.name}/commits/${e.payload.head}`).catch(() => null)
            : null;
          return { id: e.id, kind: "push", repo, title: commit?.commit.message.split("\n")[0] ?? "Pushed commits", url: commit?.html_url ?? repoUrl, at: e.created_at };
        }
        if (e.type === "PullRequestEvent") {
          // Events no longer carry the PR's title or merge state, so look the PR up.
          const number = e.payload.pull_request?.number ?? e.payload.number;
          const pr = number
            ? await gh<{ title: string; html_url: string; merged: boolean }>(`/repos/${e.repo.name}/pulls/${number}`).catch(() => null)
            : null;
          const verb = e.payload.action === "opened" ? "Opened" : pr?.merged ? "Merged" : "Closed";
          return { id: e.id, kind: "pr", repo, title: pr ? `${verb} #${number}: ${pr.title}` : `${verb} pull request #${number}`, url: pr?.html_url ?? repoUrl, at: e.created_at };
        }
        if (e.type === "ReleaseEvent" && e.payload.release) {
          const r = e.payload.release;
          return { id: e.id, kind: "release", repo, title: `Released ${r.name || r.tag_name}`, url: r.html_url, at: e.created_at };
        }
        return { id: e.id, kind: "repo", repo, title: "Created a new repository", url: repoUrl, at: e.created_at };
      }),
    );
  } catch (error) {
    console.error(error);
    return [];
  }
}
