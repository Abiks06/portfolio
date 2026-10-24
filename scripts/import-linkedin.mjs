/**
 * Merges a LinkedIn data export into content/resume.json.
 *
 *   npm run import:linkedin -- <export.zip | extracted folder> [--dry-run] [--overwrite] [--skills]
 *
 * LinkedIn has no API for personal profiles, so this is the sync: request "Download your data"
 * (Settings → Data privacy) and run this on the zip it emails you. Run it locally only; the
 * export also contains private messages and contacts, so never commit or upload it.
 *
 * - New positions, education and certifications are added.
 * - Existing entries are matched loosely ("Ecobank Ghana" = "Ecobank Ghana (eProcess)") and only
 *   get fields they're missing; differences are reported. --overwrite lets LinkedIn's dates and
 *   locations win instead. Hand-written highlights are never touched.
 * - Skills not on the site are listed; --skills adds them under "More".
 */
import fs from "node:fs";
import path from "node:path";
import { inflateRawSync } from "node:zlib";
import { SECTIONS, addSkill, describe, find, hasSkill, readResume, similar, upsert, writeResume } from "./resume-merge.mjs";

const args = process.argv.slice(2);
const source = args.find((a) => !a.startsWith("--"));
const flags = new Set(args.filter((a) => a.startsWith("--")));
if (!source) {
  console.error("Usage: npm run import:linkedin -- <export.zip | folder> [--dry-run] [--overwrite] [--skills]");
  process.exit(1);
}

/** RFC 4180 CSV: quoted fields may contain commas, quotes ("") and newlines. */
function parseCsv(text) {
  const rows = [[]];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += c;
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === "," || c === "\n" || c === "\r") {
      rows.at(-1).push(field);
      field = "";
      if (c !== ",") rows.push([]);
      if (c === "\r" && text[i + 1] === "\n") i++;
    } else field += c;
  }
  rows.at(-1).push(field);
  return rows.filter((r) => r.some((f) => f.trim()));
}

/**
 * The export's CSV files by lower-case base name, read straight from the zip in memory, so
 * nothing private is ever extracted to disk. Handles stored and deflated entries (not ZIP64).
 */
function readCsvFiles(src) {
  if (fs.statSync(src).isDirectory()) {
    return new Map(fs.readdirSync(src).filter((f) => f.toLowerCase().endsWith(".csv")).map((f) => [f.toLowerCase(), fs.readFileSync(path.join(src, f), "utf8")]));
  }
  const zip = fs.readFileSync(src);
  const end = zip.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (end === -1) throw new Error(`${src} is not a zip file.`);
  const files = new Map();
  let at = zip.readUInt32LE(end + 16);
  for (let n = zip.readUInt16LE(end + 10); n > 0; n--) {
    if (zip.readUInt32LE(at) !== 0x02014b50) throw new Error("Unreadable zip (central directory).");
    const method = zip.readUInt16LE(at + 10);
    const size = zip.readUInt32LE(at + 20);
    const nameLen = zip.readUInt16LE(at + 28);
    const local = zip.readUInt32LE(at + 42);
    const name = zip.toString("utf8", at + 46, at + 46 + nameLen);
    at += 46 + nameLen + zip.readUInt16LE(at + 30) + zip.readUInt16LE(at + 32);
    if (!name.toLowerCase().endsWith(".csv")) continue;
    const start = local + 30 + zip.readUInt16LE(local + 26) + zip.readUInt16LE(local + 28);
    const raw = zip.subarray(start, start + size);
    if (method !== 0 && method !== 8) throw new Error(`${name}: unsupported zip compression (${method}).`);
    files.set(path.posix.basename(name).toLowerCase(), (method === 8 ? inflateRawSync(raw) : raw).toString("utf8"));
  }
  return files;
}

/** Rows as objects. Some export files start with notes, so the header is the first row naming `first`. */
function readTable(files, file, first) {
  const text = files.get(file.toLowerCase());
  if (!text) return [];
  const rows = parseCsv(text.replace(/^﻿/, ""));
  const h = rows.findIndex((r) => r.some((f) => f.trim() === first));
  if (h === -1) return [];
  const header = rows[h].map((f) => f.trim());
  return rows.slice(h + 1).map((r) => Object.fromEntries(header.map((k, i) => [k, (r[i] ?? "").trim()])));
}

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/** "Jun 2026", "06/2026", "2026-06-03" or "2026" → "2026-06" / "2026"; anything else → undefined. */
function toDate(value) {
  const v = (value ?? "").trim();
  let m;
  if ((m = v.match(/^([A-Za-z]{3})[a-z]*\.?\s+(?:\d{1,2},\s*)?(\d{4})$/))) {
    const month = MONTHS.indexOf(m[1].toLowerCase()) + 1;
    return month ? `${m[2]}-${String(month).padStart(2, "0")}` : m[2];
  }
  if ((m = v.match(/^(\d{1,2})\/(?:\d{1,2}\/)?(\d{4})$/))) return `${m[2]}-${m[1].padStart(2, "0")}`;
  if ((m = v.match(/^(\d{4})-(\d{2})/))) return `${m[1]}-${m[2]}`;
  if (/^\d{4}$/.test(v)) return v;
  return undefined;
}

/** LinkedIn descriptions mix a paragraph with bullet lines; bullets become highlights. */
function splitDescription(text) {
  const lines = (text ?? "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const bullet = /^[-*•●▪◦–]\s*/;
  const highlights = lines.filter((l) => bullet.test(l)).map((l) => l.replace(bullet, ""));
  const summary = lines.filter((l) => !bullet.test(l)).join(" ");
  return { summary: summary || undefined, highlights: highlights.length ? highlights : undefined };
}

let files;
try {
  files = readCsvFiles(path.resolve(source));
} catch (error) {
  console.error(error.code === "ENOENT" ? `Not found: ${source}` : error.message);
  process.exit(1);
}
if (!["positions.csv", "education.csv", "certifications.csv", "skills.csv"].some((f) => files.has(f))) {
  console.error("No Positions, Education, Certifications or Skills CSV found. Is this a LinkedIn data export?");
  process.exit(1);
}
const resume = readResume();
const report = { added: [], filled: [], overwritten: [], differs: [], skills: [] };

/** A real difference, not LinkedIn giving the same date less precisely ("2024" vs "2024-01"). */
const differs = (site, theirs) => theirs !== undefined && site !== undefined && site !== theirs && !String(site).startsWith(`${theirs}-`);

/** Fills the entry's missing fields; with --overwrite, LinkedIn's `compare` fields (dates, location) also win. */
function merge(section, entry, compare) {
  const i = find(resume, section, entry);
  const before = i === -1 ? null : structuredClone(resume[section][i]);
  const { change, fields } = upsert(resume, section, entry, { fillOnly: true });
  const name = describe(section, before ?? entry);
  const label = `${SECTIONS[section].label}: ${name}`;
  if (change === "added") report.added.push(label);
  else if (change === "updated") report.filled.push(`${label} (${fields.join(", ")})`);
  if (before && flags.has("--overwrite")) {
    const ids = Object.fromEntries(SECTIONS[section].keys.map((k) => [k, entry[k]]));
    const theirs = Object.fromEntries(compare.filter((k) => differs(before[k], entry[k])).map((k) => [k, entry[k]]));
    const taken = upsert(resume, section, { ...ids, ...theirs }).fields;
    if (taken.length) report.overwritten.push(`${label} (${taken.map((k) => `${k}: ${before[k]} → ${entry[k]}`).join(", ")})`);
  }
  if (before && !flags.has("--overwrite")) {
    for (const k of compare) {
      if (differs(before[k], entry[k])) {
        report.differs.push(`${SECTIONS[section].label}: ${name}: ${k} is ${before[k]} on the site, ${entry[k]} on LinkedIn`);
      }
    }
  }
}

for (const r of readTable(files, "Positions.csv", "Company Name")) {
  if (!r["Company Name"] || !r.Title) continue;
  const startDate = toDate(r["Started On"]);
  merge("work", { name: r["Company Name"], position: r.Title, location: r.Location || undefined, startDate, endDate: r["Finished On"] ? toDate(r["Finished On"]) : undefined, ...splitDescription(r.Description) }, ["startDate", "endDate", "location"]);
}

for (const r of readTable(files, "Education.csv", "School Name")) {
  if (!r["School Name"]) continue;
  // Degree names differ in style ("BSc" vs "Bachelor of Science - BS"), so match by school alone.
  const same = resume.education.find((e) => similar(e.institution, r["School Name"]));
  const studyType = same?.studyType ?? (r["Degree Name"] || "Studies");
  merge("education", { institution: r["School Name"], studyType, startDate: toDate(r["Start Date"]), endDate: toDate(r["End Date"]), activities: r.Activities ? r.Activities.split(/[,;]\s*/).filter(Boolean) : undefined }, ["startDate", "endDate"]);
}

for (const r of readTable(files, "Certifications.csv", "Name")) {
  if (!r.Name) continue;
  merge("certificates", { name: r.Name, issuer: r.Authority || "—", date: toDate(r["Started On"]), url: r.Url || undefined }, ["date"]);
}

for (const r of readTable(files, "Skills.csv", "Name")) {
  if (!r.Name || hasSkill(resume, r.Name)) continue;
  if (flags.has("--skills")) addSkill(resume, "More", r.Name);
  report.skills.push(r.Name);
}

const list = (title, items) => items.length && console.log(`\n${title} (${items.length})\n${items.map((i) => `  - ${i}`).join("\n")}`);
list("Added", report.added);
list("Filled in missing fields", report.filled);
list("Replaced with LinkedIn's", report.overwritten);
list("Different on LinkedIn (kept the site's; --overwrite to take LinkedIn's)", report.differs);
list(flags.has("--skills") ? 'Skills added under "More"' : "Skills on LinkedIn but not the site (--skills to add)", report.skills);
const changed = report.added.length || report.filled.length || report.overwritten.length || (flags.has("--skills") && report.skills.length);
if (!changed) console.log("\nresume.json already matches the export.");
else if (flags.has("--dry-run")) console.log("\nDry run: resume.json not written.");
else {
  writeResume(resume);
  console.log("\nUpdated content/resume.json. Review with `git diff content/resume.json`, then commit and push.");
}
