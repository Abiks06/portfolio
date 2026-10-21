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

function headers(): HeadersInit {
  const token = process.env.GITHUB_TOKEN;
  return {
    Accept: "application/vnd.github+json",
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

function toProject(repo: GitHubRepo | null, extra: ResumeProject | undefined, languages: Record<string, number>): Project {
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
  };
}

/** Projects from resume.json alone, used when GitHub is unreachable. */
function fallbackProjects(): Project[] {
  return resume.projects.map((p) => toProject(null, p, {}));
}

/**
 * Public repos tagged with the portfolio topic, merged with the matching
 * entries in resume.json, plus resume-only projects that have no repo.
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
        const languages = await gh<Record<string, number>>(`/repos/${USERNAME}/${repo.name}/languages`).catch(() => ({}));
        return toProject(repo, byRepo.get(repo.name.toLowerCase()), languages);
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
