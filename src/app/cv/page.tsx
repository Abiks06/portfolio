import type { Metadata } from "next";
import Link from "next/link";
import { getProjects } from "@/lib/github";
import { formatRange, resume } from "@/lib/resume";
import { PrintButton } from "./print-button";

export const metadata: Metadata = {
  title: `CV · ${resume.basics.name}`,
  description: `Printable CV for ${resume.basics.name}, generated from the same data as the portfolio.`,
  alternates: { canonical: "/cv" },
};

function Heading({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-3 mt-8 border-b border-line pb-1 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-3 print:mt-5">{children}</h2>;
}

/** The CV, generated from content/resume.json and the GitHub-synced projects, so it never drifts from the site. */
export default async function CvPage() {
  const { basics, education, work, leadership, skills, certificates, languages } = resume;
  const projects = (await getProjects()).filter((p) => p.featured).slice(0, 4);
  const site = basics.profiles.find((p) => p.network === "GitHub");

  return (
    <main className="min-h-svh bg-paper-2 px-4 py-10 print:bg-white print:p-0">
      <div className="mx-auto mb-6 flex max-w-[210mm] items-center justify-between print:hidden">
        <Link href="/" className="text-sm text-ink-2 underline-offset-4 hover:text-ink hover:underline">
          ← Back to the portfolio
        </Link>
        <PrintButton />
      </div>
      <article className="mx-auto max-w-[210mm] bg-paper px-[16mm] py-[14mm] text-[13px] leading-relaxed text-ink shadow-xl shadow-black/5 print:max-w-none print:bg-white print:p-0 print:shadow-none">
        <header>
          <h1 className="font-display text-5xl leading-none">{basics.name}</h1>
          <p className="mt-2 text-base text-ink-2">{basics.label}</p>
          {/* One line of contacts, dot-separated, so it never wraps into an odd right-aligned block. */}
          <ul className="mt-2 flex flex-wrap items-center gap-x-2 text-xs text-ink-2 [&_a]:inline-block [&_a]:py-1.5 print:[&_a]:py-0 [&>li+li]:before:mr-2 [&>li+li]:before:text-ink-3 [&>li+li]:before:content-['·']">
            <li>
              <a href={`mailto:${basics.email}`}>{basics.email}</a>
            </li>
            <li>
              {basics.location.city}, {basics.location.countryCode === "GH" ? "Ghana" : basics.location.countryCode}
            </li>
            {basics.profiles.map((p) => (
              <li key={p.network}>
                <a href={p.url}>{p.url.replace(/^https?:\/\/(www\.)?/, "")}</a>
              </li>
            ))}
          </ul>
        </header>
        <p className="mt-6 text-ink-2">{basics.summary}</p>

        <Heading>Experience</Heading>
        <div className="space-y-4">
          {work.map((w) => (
            <section key={`${w.name}-${w.startDate}`} className="break-inside-avoid">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-semibold">
                  {w.position} · {w.name}
                </h3>
                <span className="font-mono text-[11px] text-ink-3">{formatRange(w.startDate, w.endDate)}</span>
              </div>
              <ul className="mt-1 list-disc space-y-0.5 pl-4 text-ink-2 marker:text-ink-3">
                {w.highlights.slice(0, 4).map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <Heading>Selected projects</Heading>
        <div className="space-y-3">
          {projects.map((p) => (
            <section key={p.slug} className="break-inside-avoid">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-semibold">{p.name}</h3>
                {(p.homepage ?? p.url) && <a href={p.homepage ?? p.url ?? undefined} className="font-mono text-[11px] text-ink-3">{(p.homepage ?? p.url)!.replace(/^https?:\/\//, "")}</a>}
              </div>
              <p className="text-ink-2">{p.highlights[0] ?? p.description}</p>
            </section>
          ))}
        </div>

        <Heading>Leadership</Heading>
        {leadership.map((l) => (
          <section key={l.position} className="mb-2 break-inside-avoid">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="font-semibold">{l.position}</h3>
              <span className="font-mono text-[11px] text-ink-3">{formatRange(l.startDate, l.endDate)}</span>
            </div>
            <p className="text-ink-2">
              {l.organization}
              {l.teamSize ? ` · ${l.teamSize}-person team` : ""}. {l.highlights[0]}
            </p>
          </section>
        ))}

        <div className="grid gap-x-10 sm:grid-cols-2 print:grid-cols-2">
          <div>
            <Heading>Education</Heading>
            {education.map((e) => (
              <section key={e.institution} className="mb-2 break-inside-avoid">
                <h3 className="font-semibold">{e.institution}</h3>
                <p className="text-ink-2">
                  {e.studyType} {e.area} · {formatRange(e.startDate, e.endDate)}
                  {e.score && ` · ${e.score}`}
                </p>
              </section>
            ))}
            <Heading>Certifications</Heading>
            <ul className="space-y-0.5 text-ink-2">
              {certificates.map((c) => (
                <li key={c.name}>
                  {c.name} · <span className="text-ink-3">{c.issuer}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <Heading>Skills</Heading>
            <dl className="space-y-1">
              {skills.map((s) => (
                <div key={s.name} className="grid grid-cols-[7rem_1fr] gap-2">
                  <dt className="text-ink-3">{s.name}</dt>
                  <dd className="text-ink-2">{s.keywords.join(", ")}</dd>
                </div>
              ))}
            </dl>
            <Heading>Languages</Heading>
            <p className="text-ink-2">{languages.map((l) => `${l.language} (${l.fluency.toLowerCase()})`).join(", ")}</p>
          </div>
        </div>
        <p className="mt-8 font-mono text-[10px] text-ink-3">
          Generated from {site ? "the live portfolio" : "resume data"} · ayomide-abikoye.vercel.app/cv
        </p>
      </article>
    </main>
  );
}
