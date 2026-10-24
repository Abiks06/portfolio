/**
 * Adding, updating and removing credentials in content/resume.json. Shared by the
 * "Credential" issue workflow and the LinkedIn importer, so both match entries the same way.
 */
import fs from "node:fs";
import { formatJson } from "./format-json.mjs";

export const RESUME_PATH = new URL("../content/resume.json", import.meta.url);
export const DATE = /^\d{4}(-\d{2})?$/;

export const readResume = () => JSON.parse(fs.readFileSync(RESUME_PATH, "utf8"));
export const writeResume = (resume) => fs.writeFileSync(RESUME_PATH, formatJson(resume));

/** How each section identifies an entry: the fields that name it, in display order. */
export const SECTIONS = {
  certificates: { label: "certificate", keys: ["name", "issuer"] },
  work: { label: "work experience", keys: ["position", "name"], dated: true },
  education: { label: "education", keys: ["studyType", "institution"], dated: true },
  leadership: { label: "leadership role", keys: ["position", "organization"], dated: true },
};
const key = (section, e) => SECTIONS[section].keys.map((k) => e[k]);

const norm = (s) =>
  String(s ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/**
 * Same name, allowing for extra words: every word of the shorter name appears in the longer
 * ("Ecobank Ghana" ~ "Ecobank Ghana (eProcess)", "Morning Star School" ~ "Morning Star High School").
 */
export function similar(a, b) {
  const [x, y] = [norm(a), norm(b)].map((s) => new Set(s.split(" ").filter(Boolean)));
  const [short, long] = x.size <= y.size ? [x, y] : [y, x];
  return short.size > 0 && [...short].every((w) => long.has(w));
}

export function find(resume, section, entry) {
  const want = key(section, entry);
  return (resume[section] ?? []).findIndex((e) => key(section, e).every((part, i) => similar(part, want[i])));
}

export const describe = (section, entry) => key(section, entry).filter(Boolean).join(" · ");

/** Newest first, like the hand-written file; undated entries keep their place at the end. */
function insert(list, entry) {
  if (!entry.startDate) return list.push(entry);
  const i = list.findIndex((e) => !e.startDate || e.startDate < entry.startDate);
  list.splice(i === -1 ? list.length : i, 0, entry);
}

/**
 * Adds the entry, or merges it into the matching one. `undefined` fields are left alone
 * and `null` removes a field (e.g. endDate: null for "present"). A matched entry keeps its
 * own name fields: "Ecobank Ghana" updates "Ecobank Ghana (eProcess)" without renaming it.
 * Returns { change: "added" | "updated" | "unchanged", fields }.
 */
export function upsert(resume, section, entry, { fillOnly = false } = {}) {
  resume[section] ??= [];
  const i = find(resume, section, entry);
  const clean = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== null));
  if (i === -1) {
    insert(resume[section], clean(entry));
    return { change: "added", fields: Object.keys(clean(entry)) };
  }
  const current = resume[section][i];
  const fields = [];
  for (const [k, v] of Object.entries(entry)) {
    if (v === undefined || SECTIONS[section].keys.includes(k) || (fillOnly && current[k] !== undefined)) continue;
    if (JSON.stringify(current[k]) === JSON.stringify(v ?? undefined)) continue;
    if (v === null) delete current[k];
    else current[k] = v;
    fields.push(k);
  }
  if (fields.includes("startDate")) {
    resume[section].splice(i, 1);
    insert(resume[section], current);
  }
  return { change: fields.length ? "updated" : "unchanged", fields };
}

export function remove(resume, section, entry) {
  const i = find(resume, section, entry);
  if (i === -1) return false;
  resume[section].splice(i, 1);
  return true;
}

/** Skills are grouped keywords ({ name: "Frontend", keywords: [...] }). */
export function addSkill(resume, group, skill) {
  resume.skills ??= [];
  let g = resume.skills.find((s) => norm(s.name) === norm(group)) ?? resume.skills.find((s) => similar(s.name, group));
  if (!g) resume.skills.push((g = { name: group, keywords: [] }));
  if (g.keywords.some((k) => norm(k) === norm(skill))) return false;
  g.keywords.push(skill);
  return true;
}

export function removeSkill(resume, group, skill) {
  const g = (resume.skills ?? []).find((s) => similar(s.name, group));
  const i = g ? g.keywords.findIndex((k) => norm(k) === norm(skill)) : -1;
  if (i === -1) return false;
  g.keywords.splice(i, 1);
  if (!g.keywords.length) resume.skills.splice(resume.skills.indexOf(g), 1);
  return true;
}

export const hasSkill = (resume, skill) => (resume.skills ?? []).some((g) => g.keywords.some((k) => norm(k) === norm(skill)));
