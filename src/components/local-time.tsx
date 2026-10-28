"use client";

import { useEffect, useState } from "react";

const format = (zone: string) =>
  new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: zone, timeZoneName: "short" }).format(new Date());

/** "Accra · 14:32 GMT" with a live dot; ticks every 30 seconds. */
export function LocalTime({ city, zone }: { city: string; zone: string }) {
  // Empty on the server: the page is prerendered once, so any time it printed would be wrong.
  const [time, setTime] = useState<string | null>(null);
  useEffect(() => {
    const tick = () => setTime(format(zone));
    const first = window.setTimeout(tick, 0);
    const id = window.setInterval(tick, 30_000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
    };
  }, [zone]);
  return (
    <span className="inline-flex items-center gap-2">
      <span className="relative flex size-2" aria-hidden="true">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent opacity-60 motion-reduce:animate-none" />
        <span className="relative inline-flex size-2 rounded-full bg-accent" />
      </span>
      <span>
        {city}
        {time && <span className="tabular-nums"> · {time}</span>}
      </span>
    </span>
  );
}
