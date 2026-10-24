/**
 * Applies a "Credential" issue form (.github/ISSUE_TEMPLATE/credential.yml) to content/resume.json.
 * Run by .github/workflows/credential.yml; reads the issue from the event payload, never from
 * the command line, so issue text is never interpreted by a shell.
 *
 *   node scripts/credential-from-issue.mjs <event.json>
 *
 * Writes the reply comment to $REPLY_FILE and the commit message to $COMMIT_FILE, and sets
 * `changed=true` in $GITHUB_OUTPUT when resume.json was modified. Exits 1 on invalid input.
 */
import fs from "node:fs";
import { pathToFileURL } from "node:url";
import { DATE, SECTIONS, addSkill, describe, find, readResume, remove, removeSkill, upsert, writeResume } from "./resume-merge.mjs";

const LABELS = {
  Action: "action",
  Section: "section",
  Title: "title",
  Organization: "organization",
  "Field of study": "area",
  Location: "location",
  "Start date": "start",
  "End date": "end",
  Link: "link",
  Summary: "summary",
  Highlights: "highlights",
  Keywords: "keywords",
};
const SECTION_KEYS = { Certificate: "certificates", "Work experience": "work", Education: "education", Leadership: "leadership", Skill: "skills" };

/** Issue forms render as "### Label\n\nvalue" blocks; "_No response_" marks an empty field. */
export function parseForm(body) {
  const out = {};
  for (const block of `\n${body ?? ""}`.split(/\r?\n### /).slice(1)) {
    const [label, ...rest] = block.split(/\r?\n/);
    const id = LABELS[label.trim()];
    const value = rest.join("\n").trim();
    if (id && value && value !== "_No response_") out[id] = value;
  }
  return out;
}

function date(value, field) {
  if (value === undefined) return undefined;
  if (/^(present|current|ongoing|now)$/i.test(value)) return null;
  if (!DATE.test(value)) throw new Error(`${field} must look like 2026-06 or 2026, not "${value}".`);
  return value;
}

/** Maps the form onto the section's JSON Resume fields; undefined = leave alone. */
function toEntry(section, f) {
  const highlights = f.highlights?.split(/\r?\n/).map((l) => l.replace(/^\s*[-*•]\s*/, "").trim()).filter(Boolean);
  const keywords = f.keywords?.split(",").map((k) => k.trim()).filter(Boolean);
  const start = date(f.start, "Start date");
  const end = date(f.end, "End date");
  switch (section) {
    case "certificates":
      return { name: f.title, issuer: f.organization, date: start ?? undefined, url: f.link };
    case "work":
      return { name: f.organization, position: f.title, location: f.location, startDate: start ?? undefined, endDate: end, summary: f.summary, highlights, keywords };
    case "education":
      return { institution: f.organization, studyType: f.title, area: f.area, url: f.link, startDate: start ?? undefined, endDate: end };
    case "leadership":
      return { organization: f.organization, position: f.title, startDate: start ?? undefined, endDate: end, highlights };
  }
}

export function apply(resume, form) {
  const section = SECTION_KEYS[form.section];
  if (!section) throw new Error(`Unknown section "${form.section ?? ""}".`);
  if (!form.title || !form.organization) throw new Error("Title and Organization are both required.");
  const removing = form.action === "Remove";

  if (section === "skills") {
    const done = removing ? removeSkill(resume, form.organization, form.title) : addSkill(resume, form.organization, form.title);
    const verb = removing ? "Remove" : "Add";
    return done
      ? { changed: true, summary: `${verb} skill: ${form.title} (${form.organization})` }
      : { changed: false, summary: removing ? `No skill "${form.title}" under ${form.organization}.` : `${form.title} is already listed under ${form.organization}.` };
  }

  const entry = toEntry(section, form);
  const name = describe(section, entry);
  if (removing) {
    return remove(resume, section, entry)
      ? { changed: true, summary: `Remove ${SECTIONS[section].label}: ${name}` }
      : { changed: false, summary: `No ${SECTIONS[section].label} matching "${name}" to remove.` };
  }
  // A new dated entry needs a start date to take its place in the timeline.
  if (SECTIONS[section].dated && !entry.startDate && find(resume, section, entry) === -1) {
    throw new Error(`A new ${SECTIONS[section].label} needs a start date.`);
  }
  const { change, fields } = upsert(resume, section, entry);
  if (change === "unchanged") return { changed: false, summary: `${name} is already up to date.` };
  const what = change === "added" ? "Add" : `Update (${fields.join(", ")})`;
  return { changed: true, summary: `${what} ${SECTIONS[section].label}: ${name}` };
}

function output(key, value) {
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `${key}=${value}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const event = JSON.parse(fs.readFileSync(process.argv[2] ?? process.env.GITHUB_EVENT_PATH, "utf8"));
  const issue = event.issue;
  const reply = (text) => process.env.REPLY_FILE && fs.writeFileSync(process.env.REPLY_FILE, text);
  try {
    const resume = readResume();
    const result = apply(resume, parseForm(issue.body));
    if (result.changed) {
      writeResume(resume);
      if (process.env.COMMIT_FILE) fs.writeFileSync(process.env.COMMIT_FILE, `${result.summary}\n\nFrom #${issue.number}.\n`);
      reply(`Done: **${result.summary}**. The site redeploys in a few minutes.`);
    } else {
      reply(`Nothing to change: ${result.summary}`);
    }
    output("changed", String(result.changed));
    console.log(result.summary);
  } catch (error) {
    reply(`Couldn't apply this: ${error.message}\n\nEdit the issue to fix it and it will be re-checked.`);
    console.error(error.message);
    process.exit(1);
  }
}
