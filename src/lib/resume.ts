import data from "../../content/resume.json";

export type Profile = { network: string; username: string; url: string };

export type Education = {
  institution: string;
  url?: string;
  area: string;
  studyType: string;
  startDate: string;
  endDate?: string;
  score?: string;
  courses?: string[];
  activities?: string[];
};

export type Work = {
  name: string;
  position: string;
  location?: string;
  startDate: string;
  endDate?: string;
  summary?: string;
  highlights: string[];
  keywords?: string[];
  /** Projects that cover the same ground, by repo name, with what they share (a fact true of both). */
  related?: { repo: string; shared: string }[];
};

export type Leadership = {
  organization: string;
  position: string;
  startDate: string;
  endDate?: string;
  teamSize?: number;
  highlights: string[];
  /** The repo this role produced. */
  repo?: string;
};

export type Track = "backend" | "fullstack" | "ml";

/** A measured result, e.g. { value: "79%", label: "of 310 Ghanaian plates read exactly" }. */
export type Metric = { value: string; label: string; /** A short label that puts it in the hero's proof row. */ headline?: string };

/** A design choice and the alternative it beat. */
export type Decision = { choice: string; over: string; because: string };

/** Extra detail for a project. `repo` links it to a GitHub repo of the same name. */
export type ResumeProject = {
  repo?: string;
  name: string;
  featured?: boolean;
  startDate?: string;
  endDate?: string;
  description?: string;
  highlights?: string[];
  keywords?: string[];
  tracks?: Track[];
  metrics?: Metric[];
  decisions?: Decision[];
  /** How a request or a frame flows through the system, one stage per entry. */
  pipeline?: string[];
};

/** Role focuses: filter the projects and tailor the CV at /cv/<id>. */
export const TRACKS: { id: Track; label: string; headline: string; skills: string[] }[] = [
  {
    id: "backend",
    label: "Backend & security",
    headline: "Backend Developer · Java, Spring Boot, PostgreSQL, security",
    skills: ["Backend", "Languages", "Data", "Testing", "Infrastructure"],
  },
  {
    id: "fullstack",
    label: "Full-stack",
    headline: "Full-Stack Developer · React, Next.js, TypeScript, Supabase",
    skills: ["Frontend", "Languages", "Backend", "Data", "Testing"],
  },
  {
    id: "ml",
    label: "Applied ML & 3D",
    headline: "Applied ML & Real-Time 3D · PyTorch, ONNX, WebGPU, Three.js",
    skills: ["Languages", "Frontend", "Data", "Infrastructure"],
  },
];

/** The slug a repo's project gets on the page (matches getProjects). */
export const repoSlug = (repo: string) => repo.toLowerCase().replace(/[^a-z0-9]+/g, "-");

export type Resume = {
  basics: {
    name: string;
    label: string;
    /** A one-sentence statement for the scroll-lit section under the hero. */
    statement?: string;
    availability?: string;
    /** IANA zone for the local-time badge, e.g. Africa/Accra. */
    timezone?: string;
    image?: string;
    email: string;
    summary: string;
    location: { city: string; countryCode: string };
    profiles: Profile[];
  };
  education: Education[];
  work: Work[];
  leadership: Leadership[];
  projects: ResumeProject[];
  certificates: { name: string; issuer: string; date?: string; url?: string }[];
  skills: { name: string; keywords: string[] }[];
  languages: { language: string; fluency: string }[];
  interests: { name: string }[];
};

export const resume = data as Resume;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-07" → "Jul 2026", "2023" → "2023". */
export function formatDate(date?: string) {
  if (!date) return "Present";
  const [year, month] = date.split("-");
  return month ? `${MONTHS[Number(month) - 1]} ${year}` : year;
}

export function formatRange(start: string, end?: string) {
  return `${formatDate(start)} – ${formatDate(end)}`;
}
