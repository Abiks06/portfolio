import { ActivityViews } from "@/components/activity";
import { CommandMenu } from "@/components/command-menu";
import { Constellation } from "@/components/constellation";
import { EasterEgg } from "@/components/easter-egg";
import { LiveActivity } from "@/components/live-activity";
import { ParticleInitials } from "@/components/particle-initials";
import { Hero } from "@/components/hero";
import { SkillsMarquee } from "@/components/marquee";
import { CopyEmail, KineticText, Magnetic, ScrubText } from "@/components/motion-bits";
import { Nav } from "@/components/nav";
import { Projects } from "@/components/projects";
import { CountUp, Reveal } from "@/components/reveal";
import { Timeline } from "@/components/timeline";
import { getActivity, getContributions, getGitHubStats, getProjects } from "@/lib/github";
import { formatDate, formatRange, resume } from "@/lib/resume";
import { SITE_URL } from "@/lib/site";

function SectionHeading({ index, title, kicker }: { index: string; title: string; kicker?: string }) {
  return (
    <Reveal className="mb-12 flex flex-col gap-3 border-t border-line pt-6 sm:mb-16 sm:flex-row sm:items-baseline sm:justify-between">
      <h2 className="font-display text-5xl leading-none tracking-[-0.01em] sm:text-7xl">
        <span className="mr-4 align-top font-mono text-xs tracking-wider text-ink-2">{index}</span>
        <KineticText text={title} />
      </h2>
      {kicker && <p className="max-w-sm text-sm leading-relaxed text-ink-2 sm:text-right">{kicker}</p>}
    </Reveal>
  );
}

export default async function Home() {
  const [projects, contributions, stats, activity] = await Promise.all([getProjects(), getContributions(), getGitHubStats(), getActivity()]);
  const { basics, education, work, leadership, skills, certificates, languages } = resume;

  const [firstName, ...rest] = basics.name.split(" ");
  const lastName = rest.at(-1) ?? "";
  const university = education[0];
  const cwa = Number(university.score?.match(/[\d.]+/)?.[0] ?? 0);
  const internships = work.filter((w) => /intern/i.test(w.position)).length;

  const statItems = [
    contributions && { value: contributions.total, label: "Contributions this year" },
    stats && { value: stats.publicRepos, label: "Public repositories" },
    { value: internships, label: "Internships at banks" },
    cwa && { value: cwa, decimals: 2, label: "Cumulative weighted average" },
  ].filter(Boolean) as { value: number; decimals?: number; label: string }[];

  // schema.org Person, so search engines can show a rich result for the name.
  const personJsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: basics.name,
    url: SITE_URL,
    email: `mailto:${basics.email}`,
    jobTitle: basics.label,
    image: basics.image,
    address: { "@type": "PostalAddress", addressLocality: basics.location.city, addressCountry: basics.location.countryCode },
    alumniOf: { "@type": "CollegeOrUniversity", name: university.institution },
    knowsAbout: skills.flatMap((s) => s.keywords).slice(0, 20),
    sameAs: basics.profiles.map((p) => p.url),
  };

  return (
    <>
      <script
        type="application/ld+json"
        // Escape "<" so no string in the data can close the script tag.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd).replace(/</g, "\\u003c") }}
      />
      <Nav initials={`${firstName[0]}${lastName[0]}`} />
      <EasterEgg />
      <CommandMenu
        projects={projects.map((p) => ({ slug: p.slug, name: p.name, description: p.description }))}
        email={basics.email}
        profiles={basics.profiles.map((p) => ({ network: p.network, url: p.url }))}
      />
      <main id="top" className="mx-auto w-full max-w-6xl px-4 sm:px-8">
        <Hero
          firstName={firstName}
          lastName={lastName}
          eyebrow={`${university.area} · ${university.institution} · Class of ${university.endDate?.slice(0, 4)}`}
          label={basics.label}
          summary={basics.summary}
          email={basics.email}
          city={basics.location.city}
          timezone={basics.timezone}
          availability={basics.availability}
        />

        <section aria-label="At a glance" className="grid grid-cols-2 gap-px overflow-hidden rounded-3xl border border-line bg-line lg:grid-cols-4">
          {statItems.map((s, i) => (
            <Reveal key={s.label} delay={i * 0.08} className="bg-paper p-6 sm:p-8">
              <p className="font-display text-5xl leading-none sm:text-6xl">
                <CountUp value={s.value} decimals={s.decimals} />
              </p>
              <p className="mt-3 text-sm text-ink-2">{s.label}</p>
            </Reveal>
          ))}
        </section>

        {basics.statement && (
          <section aria-label="What I build" className="pt-28 sm:pt-40">
            <ScrubText text={basics.statement} className="max-w-5xl font-display text-[clamp(2rem,4.6vw,4rem)] leading-[1.08] tracking-[-0.01em]" />
          </section>
        )}

        <section id="work" className="scroll-mt-20 pt-28 sm:pt-40">
          <SectionHeading
            index="01"
            title="Selected work"
            kicker="Pulled live from GitHub. Tap a project for the full story."
          />
          <Projects projects={projects} />

          {activity.length > 0 && (
            <Reveal className="mt-16 rounded-3xl border border-line p-6 sm:p-8">
              <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-display text-2xl">Right now on GitHub</h3>
                <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-3">Live · refreshes every 15 min</span>
              </div>
              <LiveActivity items={activity} />
            </Reveal>
          )}

          {contributions && (
            <Reveal className="mt-4 rounded-3xl border border-line p-6 sm:p-8">
              <div className="mb-6 flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-display text-2xl">GitHub activity</h3>
                <a href={basics.profiles.find((p) => p.network === "GitHub")?.url} className="text-sm text-ink-2 underline-offset-4 hover:text-ink hover:underline">
                  @{basics.profiles.find((p) => p.network === "GitHub")?.username} ↗
                </a>
              </div>
              <ActivityViews days={contributions.days} total={contributions.total} />
            </Reveal>
          )}
        </section>

        <section id="experience" className="scroll-mt-20 pt-28 sm:pt-40">
          <SectionHeading index="02" title="Experience" kicker="Internships across three of Ghana's largest banks." />
          <Timeline work={work} />

          <div className="mt-24">
            <Reveal>
              <h3 className="mb-8 font-mono text-xs uppercase tracking-[0.18em] text-ink-3">Leading teams</h3>
            </Reveal>
            <div className="grid gap-4 md:grid-cols-2">
              {leadership.map((role, i) => (
                <Reveal key={role.position} delay={i * 0.1} className="flex flex-col rounded-3xl bg-paper-2 p-6 sm:p-8">
                  <div className="flex items-baseline gap-3">
                    <span className="font-display text-6xl leading-none text-accent">
                      <CountUp value={role.teamSize ?? 0} />
                    </span>
                    <span className="text-sm text-ink-2">person team</span>
                  </div>
                  <h4 className="mt-6 font-display text-2xl leading-tight sm:text-3xl">{role.position}</h4>
                  <p className="mt-1 text-sm text-ink-3">
                    {role.organization} · {formatRange(role.startDate, role.endDate)}
                  </p>
                  <ul className="mt-5 space-y-2.5 text-sm leading-relaxed text-ink-2">
                    {role.highlights.map((h) => (
                      <li key={h} className="flex gap-3">
                        <span className="mt-2 size-1 shrink-0 rounded-full bg-ink-3" />
                        {h}
                      </li>
                    ))}
                  </ul>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <SkillsMarquee skills={skills.filter((s) => s.name !== "Analytical").flatMap((s) => s.keywords)} />

        <section id="about" className="scroll-mt-20 pt-28 sm:pt-40">
          <SectionHeading index="03" title="Education & skills" kicker="How the tools connect, then where I learned them." />
          <Reveal className="mb-20 rounded-3xl border border-line p-4 sm:p-8">
            <Constellation
              projects={projects.map((p) => ({ slug: p.slug, name: p.name, tech: [...p.keywords, ...p.languages.slice(0, 3).map((l) => l.name)] }))}
            />
          </Reveal>
          <div className="grid gap-12 lg:grid-cols-[1fr_1.2fr] lg:gap-16">
            <div className="space-y-10">
              {education.map((e, i) => (
                <Reveal key={e.institution} delay={i * 0.1}>
                  <p className="font-mono text-xs uppercase tracking-wider text-ink-3">{formatRange(e.startDate, e.endDate)}</p>
                  <h3 className="mt-2 font-display text-3xl leading-tight">{e.institution}</h3>
                  <p className="mt-1 text-ink-2">
                    {e.studyType} {e.area}
                    {e.score && <span className="ml-2 rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-on-accent">{e.score}</span>}
                  </p>
                  {e.courses && (
                    <ul className="mt-4 flex flex-wrap gap-1.5">
                      {e.courses.map((c) => (
                        <li key={c} className="rounded-full border border-line px-3 py-1 text-xs text-ink-2">
                          {c}
                        </li>
                      ))}
                    </ul>
                  )}
                </Reveal>
              ))}

              <Reveal>
                <h3 className="font-mono text-xs uppercase tracking-[0.18em] text-ink-3">Certifications</h3>
                <ul className="mt-4 divide-y divide-line border-y border-line">
                  {certificates.map((c) => (
                    <li key={c.name} className="flex items-baseline justify-between gap-4 py-3">
                      {c.url ? (
                        <a href={c.url} className="underline decoration-line underline-offset-4 hover:decoration-current">
                          {c.name}
                        </a>
                      ) : (
                        <span>{c.name}</span>
                      )}
                      <span className="shrink-0 text-right text-xs text-ink-3">
                        {c.issuer}
                        {c.date && ` · ${formatDate(c.date)}`}
                      </span>
                    </li>
                  ))}
                </ul>
              </Reveal>
            </div>

            <div>
              <dl className="divide-y divide-line border-y border-line">
                {skills.map((s, i) => (
                  <Reveal key={s.name} delay={i * 0.05} className="grid gap-2 py-5 sm:grid-cols-[9rem_1fr] sm:gap-6">
                    <dt className="font-mono text-xs uppercase tracking-wider text-ink-3 sm:pt-1">{s.name}</dt>
                    <dd className="flex flex-wrap gap-x-4 gap-y-1">
                      {s.keywords.map((k) => (
                        <span key={k} className="transition-colors duration-200 hover:text-accent">
                          {k}
                        </span>
                      ))}
                    </dd>
                  </Reveal>
                ))}
              </dl>
              <Reveal className="mt-8 text-sm text-ink-2">
                Speaks {languages.map((l) => `${l.language} (${l.fluency.toLowerCase()})`).join(", ")}.
              </Reveal>
            </div>
          </div>
        </section>

        <section id="contact" className="scroll-mt-20 py-28 sm:py-40">
          <Reveal className="grid items-center gap-10 border-t border-line pt-10 lg:grid-cols-[1.35fr_1fr]">
            <div>
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-ink-3">04 · Contact</p>
            <h2 className="mt-6 font-display text-[clamp(3rem,9vw,7.5rem)] leading-[0.95] tracking-[-0.02em]">
              <KineticText text="Let’s build" className="block" />
              <KineticText text="something solid." className="block italic text-accent" />
            </h2>
            <Magnetic strength={0.15} className="mt-10">
            <a
              href={`mailto:${basics.email}`}
              className="group inline-flex items-center gap-3 text-lg sm:text-2xl"
            >
              <span className="bg-[linear-gradient(currentColor,currentColor)] bg-[length:0%_1px] bg-left-bottom bg-no-repeat pb-1 transition-[background-size] duration-500 ease-out-expo group-hover:bg-[length:100%_1px]">
                {basics.email}
              </span>
              <span className="transition-transform duration-300 ease-out-expo group-hover:translate-x-1">→</span>
            </a>
            </Magnetic>
            <div className="mt-6">
              <CopyEmail email={basics.email} />
            </div>
            <ul className="mt-8 flex gap-6 text-sm text-ink-2">
              {basics.profiles.map((p) => (
                <li key={p.network}>
                  <a href={p.url} target="_blank" rel="noreferrer" className="transition-colors hover:text-ink">
                    {p.network} ↗
                  </a>
                </li>
              ))}
            </ul>
            </div>
            <ParticleInitials text={`${firstName[0]}${lastName[0]}.`} />
          </Reveal>
        </section>
      </main>
      <footer className="mx-auto w-full max-w-6xl border-t border-line px-4 py-8 text-xs text-ink-3 sm:px-8">
        {basics.name} · {basics.location.city} · Projects sync from GitHub · <a href="/cv" className="underline-offset-4 hover:text-ink hover:underline">Printable CV</a> · Press <kbd className="font-mono">/</kbd> to search
      </footer>
    </>
  );
}
