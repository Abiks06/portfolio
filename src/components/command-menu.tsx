"use client";

import { useLenis } from "lenis/react";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { copyText } from "@/lib/copy-text";

const OPEN_EVENT = "portfolio:command-menu";
export const OPEN_PROJECT_EVENT = "portfolio:open-project";

/** Opens the menu from anywhere (e.g. the nav button). */
export function openCommandMenu() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

type Item = { id: string; group: string; label: string; hint?: string; keywords?: string; run: () => void | Promise<void> };

/**
 * ⌘K / Ctrl+K / "/" command menu: jump to a section, open a project, copy the email. Deliberately
 * no open/close animation: it's keyboard-driven, and anything opened that way should be instant.
 */
export function CommandMenu({
  projects,
  email,
  profiles,
}: {
  projects: { slug: string; name: string; description: string | null }[];
  email: string;
  profiles: { network: string; url: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const lenis = useLenis();
  const listId = useId();

  const close = useCallback(() => {
    setOpen(false);
    opener.current?.focus({ preventScroll: true });
  }, []);

  const go = useCallback(
    (selector: string) => {
      const el = document.querySelector<HTMLElement>(selector);
      if (!el) return;
      if (lenis) lenis.scrollTo(el, { offset: -72 });
      else el.scrollIntoView({ block: "start" });
    },
    [lenis],
  );

  const items = useMemo<Item[]>(
    () => [
      { id: "top", group: "Go to", label: "Top", keywords: "home start hero", run: () => go("#top") },
      { id: "work", group: "Go to", label: "Selected work", keywords: "projects portfolio", run: () => go("#work") },
      { id: "experience", group: "Go to", label: "Experience", keywords: "jobs internships banks", run: () => go("#experience") },
      { id: "about", group: "Go to", label: "Education & skills", keywords: "university skills certifications", run: () => go("#about") },
      { id: "contact", group: "Go to", label: "Contact", keywords: "email hire", run: () => go("#contact") },
      ...projects.map((p) => ({
        id: `project-${p.slug}`,
        group: "Open project",
        label: p.name,
        hint: p.description ?? undefined,
        run: () => void window.dispatchEvent(new CustomEvent(OPEN_PROJECT_EVENT, { detail: p.slug })),
      })),
      {
        id: "copy-email",
        group: "Contact",
        label: "Copy email address",
        hint: email,
        keywords: "mail clipboard",
        run: async () => {
          setNotice((await copyText(email)) ? `Copied ${email}` : "Couldn't copy here; use “Write an email” instead");
        },
      },
      { id: "email", group: "Contact", label: "Write an email", hint: email, keywords: "mail", run: () => void (window.location.href = `mailto:${email}`) },
      ...profiles.map((p) => ({
        id: `profile-${p.network}`,
        group: "Contact",
        label: `Open ${p.network}`,
        hint: p.url.replace(/^https?:\/\/(www\.)?/, ""),
        run: () => void window.open(p.url, "_blank", "noopener"),
      })),
    ],
    [projects, email, profiles, go],
  );

  const results = useMemo(() => {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.length) return items;
    return items.filter((it) => {
      const hay = `${it.group} ${it.label} ${it.hint ?? ""} ${it.keywords ?? ""}`.toLowerCase();
      return terms.every((t) => hay.includes(t));
    });
  }, [items, query]);

  // Global shortcuts and the open event.
  useEffect(() => {
    const show = () => {
      opener.current = document.activeElement as HTMLElement | null;
      setQuery("");
      setIndex(0);
      setNotice(null);
      setOpen(true);
    };
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && (e.target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName));
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (open) close();
        else show();
      } else if (e.key === "/" && !typing && !open) {
        e.preventDefault();
        show();
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_EVENT, show);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_EVENT, show);
    };
  }, [open, close]);

  // Freeze the page behind the menu and focus the search field.
  useEffect(() => {
    if (!open) return;
    lenis?.stop();
    document.documentElement.style.overflow = "hidden";
    input.current?.focus();
    return () => {
      lenis?.start();
      document.documentElement.style.overflow = "";
    };
  }, [open, lenis]);

  // Keep the highlighted row in view.
  useEffect(() => {
    document.getElementById(`${listId}-${index}`)?.scrollIntoView({ block: "nearest" });
  }, [index, listId]);

  if (!open) return null;

  const run = async (item: Item | undefined) => {
    if (!item) return;
    if (item.id === "copy-email") return item.run(); // stays open to show "Copied"
    // Close first: scrolling is frozen while the menu is open, so a jump must wait for it to unfreeze.
    close();
    requestAnimationFrame(() => requestAnimationFrame(() => void item.run()));
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIndex((i) => (results.length ? (i + 1) % results.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIndex((i) => (results.length ? (i - 1 + results.length) % results.length : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      run(results[index]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "Tab") {
      e.preventDefault(); // the field is the only stop; arrows move through results
    }
  };

  let lastGroup = "";
  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center px-4 pt-[12vh]" role="dialog" aria-modal="true" aria-label="Command menu">
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={close} />
      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-line bg-paper shadow-2xl shadow-black/20">
        <div className="flex items-center gap-3 border-b border-line px-4">
          <span aria-hidden="true" className="text-ink-3">
            ⌕
          </span>
          <input
            ref={input}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIndex(0);
              setNotice(null);
            }}
            onKeyDown={onKeyDown}
            placeholder="Jump to a section, open a project, copy my email…"
            className="h-14 flex-1 bg-transparent text-base outline-none placeholder:text-ink-3 focus-visible:outline-none"
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={results[index] ? `${listId}-${index}` : undefined}
            aria-autocomplete="list"
          />
          <kbd className="rounded border border-line px-1.5 py-0.5 font-mono text-[10px] text-ink-3">esc</kbd>
        </div>
        <ul id={listId} role="listbox" data-lenis-prevent className="max-h-[50vh] overflow-y-auto overscroll-contain p-2">
          {results.length === 0 && <li className="px-3 py-8 text-center text-sm text-ink-3">Nothing matches “{query}”.</li>}
          {results.map((item, i) => {
            const header = item.group !== lastGroup ? item.group : null;
            lastGroup = item.group;
            return (
              <li key={item.id} role="presentation">
                {header && <p className="px-3 pb-1 pt-3 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3">{header}</p>}
                <div
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={i === index}
                  onPointerMove={() => setIndex(i)}
                  onClick={() => run(item)}
                  className={`flex cursor-pointer items-baseline justify-between gap-4 rounded-lg px-3 py-2.5 text-sm ${i === index ? "bg-paper-2 text-ink" : "text-ink-2"}`}
                >
                  <span className="shrink-0">{item.label}</span>
                  {item.hint && <span className="truncate text-xs text-ink-3">{item.hint}</span>}
                </div>
              </li>
            );
          })}
        </ul>
        <div className="flex items-center justify-between border-t border-line px-4 py-2.5 font-mono text-[10px] text-ink-3" aria-live="polite">
          <span>{notice ?? "↑↓ to move · ↵ to choose"}</span>
          <span>{results.length === 1 ? "1 result" : `${results.length} results`}</span>
        </div>
      </div>
    </div>
  );
}
