import { getContributions, getProjects } from "@/lib/github";
import { formatRange, resume } from "@/lib/resume";

// Temporary data preview: every section renders real data so the data layer
// can be verified. Design and motion replace this markup in the next step.

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="border-t border-foreground/10 py-12">
      <h2 className="mb-6 font-mono text-sm uppercase tracking-widest text-foreground/60">{title}</h2>
      {children}
    </section>
  );
}

export default async function Home() {
  const [projects, contributions] = await Promise.all([getProjects(), getContributions()]);
  const { basics, education, work, leadership, skills, certificates } = resume;

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-16 sm:px-6">
      <header className="pb-12">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">{basics.name}</h1>
        <p className="mt-2 text-lg text-foreground/70">{basics.label}</p>
        <p className="mt-6 max-w-2xl leading-relaxed">{basics.summary}</p>
        <nav className="mt-6 flex gap-4 text-sm underline underline-offset-4">
          {basics.profiles.map((p) => (
            <a key={p.network} href={p.url}>{p.network}</a>
          ))}
          <a href={`mailto:${basics.email}`}>Email</a>
        </nav>
      </header>

      <Section id="projects" title={`Projects (${projects.length})`}>
        <ul className="grid gap-4 sm:grid-cols-2">
          {projects.map((p) => (
            <li key={p.slug} className="rounded-lg border border-foreground/10 p-5">
              <h3 className="font-medium">
                {p.name} {p.featured && <span className="text-xs text-foreground/50">· featured</span>}
              </h3>
              {p.description && <p className="mt-1 text-sm text-foreground/70">{p.description}</p>}
              {p.languages.length > 0 && (
                <p className="mt-3 font-mono text-xs text-foreground/50">{p.languages.map((l) => l.name).join(" · ")}</p>
              )}
              <p className="mt-3 flex gap-3 text-sm underline underline-offset-4">
                {p.url && <a href={p.url}>Code</a>}
                {p.homepage && <a href={p.homepage}>Live demo</a>}
              </p>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="activity" title="GitHub activity">
        {contributions ? (
          <p>{contributions.total} contributions in the last year</p>
        ) : (
          <p className="text-sm text-foreground/60">Add GITHUB_TOKEN to .env.local to load the contribution calendar.</p>
        )}
      </Section>

      <Section id="experience" title="Experience">
        <ol className="space-y-8">
          {work.map((job) => (
            <li key={`${job.name}-${job.startDate}`}>
              <h3 className="font-medium">{job.position} · {job.name}</h3>
              <p className="text-sm text-foreground/60">{formatRange(job.startDate, job.endDate)}</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                {job.highlights.map((h) => <li key={h}>{h}</li>)}
              </ul>
            </li>
          ))}
        </ol>
      </Section>

      <Section id="leadership" title="Leadership">
        <ol className="space-y-8">
          {leadership.map((role) => (
            <li key={role.position}>
              <h3 className="font-medium">{role.position}</h3>
              <p className="text-sm text-foreground/60">
                {role.organization} · {formatRange(role.startDate, role.endDate)}
              </p>
            </li>
          ))}
        </ol>
      </Section>

      <Section id="education" title="Education">
        {education.map((e) => (
          <div key={e.institution} className="mb-6">
            <h3 className="font-medium">{e.studyType} {e.area} · {e.institution}</h3>
            <p className="text-sm text-foreground/60">
              {formatRange(e.startDate, e.endDate)}{e.score && ` · ${e.score}`}
            </p>
          </div>
        ))}
      </Section>

      <Section id="skills" title="Skills">
        <dl className="grid gap-4 sm:grid-cols-2">
          {skills.map((s) => (
            <div key={s.name}>
              <dt className="font-medium">{s.name}</dt>
              <dd className="text-sm text-foreground/70">{s.keywords.join(", ")}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section id="certificates" title="Certificates">
        <ul className="space-y-1 text-sm">
          {certificates.map((c) => <li key={c.name}>{c.name} · {c.issuer}</li>)}
        </ul>
      </Section>
    </main>
  );
}
