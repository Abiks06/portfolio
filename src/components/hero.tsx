import { Hero3D } from "./hero-3d";
import { LocalTime } from "./local-time";
import { HeroDepth, Magnetic } from "./motion-bits";
import { ReactiveName } from "./reactive-name";

const delay = (s: number) => ({ animationDelay: `${s}s` });

/** A line of display type that slides up out of a mask. */
function MaskLine({ children, delay: d, className }: { children: React.ReactNode; delay: number; className?: string }) {
  return (
    <span className="mask-line block pb-[0.08em]">
      <span className={`anim-rise block ${className ?? ""}`} style={delay(d)}>
        {children}
      </span>
    </span>
  );
}

// Server component: the intro animates with CSS keyframes, so the text is in the first paint.
export function Hero({
  firstName,
  lastName,
  eyebrow,
  label,
  summary,
  email,
  city,
  timezone,
  availability,
}: {
  firstName: string;
  lastName: string;
  eyebrow: string;
  label: string;
  summary: string;
  email: string;
  city: string;
  timezone?: string;
  availability?: string;
}) {
  return (
    // overflow-x-clip: the sculpture hangs off the right edge on phones; clip (not hidden) keeps vertical overflow visible.
    <section className="relative grid min-h-[calc(100svh-4rem)] overflow-x-clip items-center gap-8 py-12 lg:grid-cols-[1.25fr_1fr] lg:py-0">
      <HeroDepth layer="text" className="relative z-10">
        <p className="anim-fade-up font-mono text-xs uppercase tracking-[0.18em] text-ink-3" style={delay(0.05)}>
          {eyebrow}
        </p>
        {(timezone || availability) && (
          <p className="anim-fade-up mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-xs text-ink-2" style={delay(0.08)}>
            {timezone && <LocalTime city={city} zone={timezone} />}
            {availability && <span>{availability}</span>}
          </p>
        )}
        <h1 className="mt-6 font-display text-[clamp(3.5rem,11vw,8.5rem)] leading-[0.9] tracking-[-0.02em]">
          <MaskLine delay={0.1}>
            <ReactiveName text={firstName} />
          </MaskLine>
          <MaskLine delay={0.2} className="italic text-accent">
            <ReactiveName text={lastName} />
          </MaskLine>
        </h1>
        <p className="anim-fade-up mt-8 text-lg font-medium text-ink sm:text-xl" style={delay(0.3)}>
          {label}
        </p>
        <p className="anim-fade-up mt-4 max-w-xl leading-relaxed text-ink-2" style={delay(0.35)}>
          {summary}
        </p>
        <div className="anim-fade-up mt-10 flex flex-wrap gap-3" style={delay(0.45)}>
          <Magnetic>
          <a
            href="#work"
            className="group inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 text-sm font-medium text-paper transition-transform duration-200 active:scale-[0.97]"
          >
            See my work
            <span className="transition-transform duration-300 ease-out-expo group-hover:translate-x-1">→</span>
          </a>
          </Magnetic>
          <Magnetic>
          <a
            href={`mailto:${email}`}
            className="inline-flex items-center rounded-full border border-line px-6 py-3 text-sm font-medium transition-[border-color,transform] duration-200 hover:border-ink active:scale-[0.97]"
          >
            Get in touch
          </a>
          </Magnetic>
          <Magnetic>
          <a
            href="/cv"
            className="inline-flex items-center rounded-full px-4 py-3 text-sm font-medium text-ink-2 underline-offset-4 transition-colors duration-200 hover:text-ink hover:underline"
          >
            CV ↗
          </a>
          </Magnetic>
        </div>
      </HeroDepth>

      <div
        className="anim-fade-scale pointer-events-none absolute -right-28 -top-10 -z-0 aspect-square w-[17rem] sm:-right-16 sm:top-0 sm:w-[26rem] lg:pointer-events-auto lg:relative lg:right-0 lg:top-0 lg:w-full"
        style={delay(0.2)}
      >
        {/* Behind the text on small screens, so it's faded there. */}
        <div className="h-full w-full opacity-25 sm:opacity-35 lg:opacity-100">
          <HeroDepth layer="art" className="h-full w-full">
            <Hero3D />
          </HeroDepth>
        </div>
      </div>
    </section>
  );
}
