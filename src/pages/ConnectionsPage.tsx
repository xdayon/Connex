import { useMemo, useState } from "react";
import { Link } from "react-router";
import { Search, Users, ScanLine } from "lucide-react";
import { Avatar } from "../components/ui/Avatar";
import { Button, buttonClass } from "../components/ui/Button";
import { Chip } from "../components/ui/Chip";
import { EmptyState } from "../components/ui/EmptyState";
import { Skeleton } from "../components/ui/Skeleton";
import { VerifiedBadge } from "../components/ui/VerifiedBadge";
import { strings } from "../i18n/strings";
import { friendlyError } from "../lib/errors";
import { relativeDate } from "../lib/format";
import { supabase } from "../lib/supabase";
import { CONNECTION_SELECT, profileName, type ConnectionWithContact } from "../lib/types";
import { useAsync } from "../lib/useAsync";

function haystack(c: ConnectionWithContact): string {
  const p = c.contact;
  return [
    p?.display_name,
    p?.handle,
    p?.headline,
    p?.company,
    ...(p?.skills ?? []),
    ...(p?.offering ?? []),
    ...(p?.looking_for ?? []),
    c.note,
    ...c.tags,
    c.event?.name,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function ConnectionsPage() {
  const t = strings.connections;
  const { data, loading, error, reload } = useAsync(async () => {
    const { data: rows, error: err } = await supabase.from("connections").select(CONNECTION_SELECT).order("met_at", { ascending: false });
    if (err) throw err;
    return rows as ConnectionWithContact[];
  }, []);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<string>("all");

  const events = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of data ?? []) if (c.event) map.set(c.event.id, c.event.name);
    return [...map.entries()];
  }, [data]);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = (data ?? []).filter((c) => {
      if (filter === "verified" && !c.verified) return false;
      if (filter !== "all" && filter !== "verified" && c.event_id !== filter) return false;
      return !q || haystack(c).includes(q);
    });
    const map = new Map<string, { name: string; items: ConnectionWithContact[] }>();
    for (const c of filtered) {
      const key = c.event?.id ?? "none";
      const g = map.get(key) ?? { name: c.event?.name ?? strings.ui.noEvent, items: [] };
      g.items.push(c);
      map.set(key, g);
    }
    return [...map.entries()].sort(([ka, a], [kb, b]) => {
      if (ka === "none") return 1;
      if (kb === "none") return -1;
      return new Date(b.items[0].met_at).getTime() - new Date(a.items[0].met_at).getTime();
    });
  }, [data, query, filter]);

  return (
    <section className="flex flex-col gap-4">
      <h1 className="font-display text-3xl font-bold tracking-[-0.02em]">{t.title}</h1>

      {loading && !data ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-12 w-full rounded-2xl" />
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : error ? (
        <EmptyState icon={Users} title={t.errorTitle} hint={friendlyError(error)} action={<Button onClick={reload}>{strings.common.retry}</Button>} />
      ) : (data ?? []).length === 0 ? (
        <EmptyState
          icon={Users}
          title={t.empty}
          hint={t.emptyHint}
          action={
            <Link to="/scan" className={buttonClass({})}>
              <ScanLine size={18} aria-hidden />
              {t.emptyCta}
            </Link>
          }
        />
      ) : (
        <>
          <div className="relative">
            <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.search}
              aria-label={t.search}
              className="min-h-12 w-full rounded-2xl border border-line bg-surface-2 pl-11 pr-4 text-base placeholder:text-muted/70 focus:border-volt focus:outline-none"
            />
          </div>
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" role="group" aria-label="Filters">
            <Chip selected={filter === "all"} onClick={() => setFilter("all")}>
              {t.all}
            </Chip>
            <Chip selected={filter === "verified"} onClick={() => setFilter("verified")}>
              {t.verified}
            </Chip>
            {events.map(([id, name]) => (
              <Chip key={id} selected={filter === id} onClick={() => setFilter(id)} className="max-w-48 shrink-0">
                <span className="truncate">{name}</span>
              </Chip>
            ))}
          </div>

          {groups.length === 0 ? (
            <EmptyState icon={Search} title={t.noResults} hint={t.noResultsHint} />
          ) : (
            groups.map(([key, g]) => (
              <div key={key}>
                <h2 className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-widest text-muted">
                  <span className="truncate">{g.name}</span>
                  <span className="ml-2 shrink-0 font-mono normal-case tracking-normal">{t.count(g.items.length)}</span>
                </h2>
                <ul className="flex flex-col gap-2">
                  {g.items.map((c) => (
                    <li key={c.id}>
                      <Link
                        to={`/connections/${c.id}`}
                        className="flex min-h-16 items-center gap-3 rounded-2xl border border-line bg-surface p-3 transition active:scale-[0.99]"
                      >
                        <Avatar src={c.contact?.avatar_url} name={profileName(c.contact)} />
                        <div className="min-w-0 flex-1">
                          <p className="flex items-center gap-1.5 font-medium">
                            <span className="truncate">{profileName(c.contact)}</span>
                            {c.verified && <VerifiedBadge />}
                          </p>
                          <p className="truncate text-sm text-muted">{c.contact?.headline || (c.contact?.handle ? `@${c.contact.handle}` : "")}</p>
                        </div>
                        <span className="shrink-0 text-xs text-muted">{relativeDate(c.met_at)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </>
      )}
    </section>
  );
}
