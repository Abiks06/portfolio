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
};

export type Leadership = {
  organization: string;
  position: string;
  startDate: string;
  endDate?: string;
  teamSize?: number;
  highlights: string[];
};

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
};

export type Resume = {
  basics: {
    name: string;
    label: string;
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
