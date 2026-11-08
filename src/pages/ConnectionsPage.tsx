import { Fragment, lazy, Suspense, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router";
import { Network, List, Search, Users, ScanLine } from "lucide-react";
import { Avatar } from "../components/ui/Avatar";
import { Button, buttonClass } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Chip } from "../components/ui/Chip";
import { PageLoader } from "../components/Logo";
import { EmptyState } from "../components/ui/EmptyState";
import { SealedBadge } from "../components/ui/SealedBadge";
import { VerifiedBadge } from "../components/ui/VerifiedBadge";
import { strings } from "../i18n/strings";
import { parseQuery, searchConnections, topSkills, type Reason } from "../lib/brainSearch";
import { friendlyError } from "../lib/errors";
import { relativeDate } from "../lib/format";
import { loadSeals, type SealState } from "../lib/proofs";
import { supabase } from "../lib/supabase";
import { CONNECTION_SELECT, profileName, type ConnectionWithContact } from "../lib/types";
import { useAsync } from "../lib/useAsync";
import { useAuth } from "../providers/AuthProvider";

const BrainGraph = lazy(() => import("../components/BrainGraph").then((m) => ({ default: m.BrainGraph })));

type ViewMode = "list" | "graph";
// v2: o padrão passou a ser o grafo; a chave nova faz todo mundo começar por ele.
const VIEW_KEY = "connex.brain.view.v2";

function readView(): ViewMode {
  try {
    return localStorage.getItem(VIEW_KEY) === "list" ? "list" : "graph";
  } catch {
    return "graph";
  }
}

function emphasize(text: string, tokens: string[]): ReactNode {
  const escaped = tokens.filter((t) => t.length > 0).map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (escaped.length === 0) return text;
  const parts = text.split(new RegExp(`(${escaped.join("|")})`, "gi"));
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <mark key={i} className="rounded-sm bg-cyan/25 px-0.5 text-text">
        {part}
      </mark>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  );
}

function reasonText(r: Reason): { prefix?: string; text: string } {
  const t = strings.brain;
  switch (r.kind) {
    case "name":
      return { text: t.reasonName };
    case "headline":
      return { text: t.reasonHeadline };
    case "location":
      return { text: t.reasonLocation };
    case "tag":
      return { prefix: t.reasonTag, text: r.label ?? "" };
    case "offering":
      return { prefix: t.reasonOffering, text: r.label ?? "" };
    case "looking_for":
      return { prefix: t.reasonLooking, text: r.label ?? "" };
    default:
      return { text: r.label ?? "" };
  }
}

function PersonRow({ c, reasons, tokens, seal }: { c: ConnectionWithContact; reasons?: Reason[]; tokens?: string[]; seal?: SealState }) {
  const t = strings.brain;
  return (
    <Link
      to={`/connections/${c.id}`}
      className="flex min-h-16 items-start gap-3 rounded-2xl border border-line bg-surface p-3 transition active:scale-[0.99]"
    >
      <Avatar src={c.contact?.avatar_url} name={profileName(c.contact)} />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 font-medium">
          <span className="truncate">{profileName(c.contact)}</span>
          {c.verified && <VerifiedBadge />}
          {seal === "sealed" && <SealedBadge />}
        </p>
        <p className="truncate text-sm text-muted">{c.contact?.headline || (c.contact?.handle ? `@${c.contact.handle}` : "")}</p>
        {/* A pessoa já assinou a metade dela do selo: falta a minha. */}
        {seal === "theirs" && <SealedBadge label text={strings.seal.signHalf} className="mt-1.5" />}
        {reasons && reasons.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {reasons.map((r, i) => {
              const { prefix, text } = reasonText(r);
              return (
                <li key={i} className="max-w-full truncate rounded-full border border-line bg-surface-2 px-2.5 py-0.5 font-mono text-xs text-muted">
                  {prefix && <span>{prefix}: </span>}
                  {emphasize(text, tokens ?? [])}
                </li>
              );
            })}
          </ul>
        )}
        {reasons && (
          <p className="mt-1.5 truncate text-xs text-muted">
            {c.event ? `${t.metAt} ${c.event.name}` : t.met} · {relativeDate(c.met_at)}
          </p>
        )}
      </div>
      {!reasons && <span className="shrink-0 text-xs text-muted">{relativeDate(c.met_at)}</span>}
    </Link>
  );
}

export function ConnectionsPage() {
  const t = strings.connections;
  const b = strings.brain;
  const { data, loading, error, reload } = useAsync(async () => {
    const { data: rows, error: err } = await supabase.from("connections").select(CONNECTION_SELECT).order("met_at", { ascending: false });
    if (err) throw err;
    return rows as ConnectionWithContact[];
  }, []);
  const { user } = useAuth();
  // Selos de encontro por contato: fechados dos dois lados ou esperando a minha metade.
  const [seals, setSeals] = useState<Record<string, SealState>>({});
  const [raw, setRaw] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [view, setView] = useState<ViewMode>(readView);
  const [phIndex, setPhIndex] = useState(0);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    void loadSeals(user.id).then((m) => {
      if (alive) setSeals(m);
    });
    return () => {
      alive = false;
    };
  }, [user]);

  useEffect(() => {
    const id = setTimeout(() => setQuery(raw.trim()), 120);
    return () => clearTimeout(id);
  }, [raw]);

  useEffect(() => {
    const id = setInterval(() => setPhIndex((i) => (i + 1) % b.placeholders.length), 3500);
    return () => clearInterval(id);
  }, [b.placeholders.length]);

  const chooseView = (v: ViewMode) => {
    setView(v);
    try {
      localStorage.setItem(VIEW_KEY, v);
    } catch {
      /* storage unavailable */
    }
  };

  const all = data ?? [];
  const events = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of all) if (c.event) map.set(c.event.id, c.event.name);
    return [...map.entries()];
  }, [all]);
  const skills = useMemo(() => topSkills(all, 8), [all]);
  const verifiedCount = useMemo(() => all.filter((c) => c.verified).length, [all]);

  const results = useMemo(() => (query ? searchConnections(all, query) : null), [all, query]);
  const tokens = useMemo(() => (query ? parseQuery(query).tokens : []), [query]);
  const highlightIds = useMemo(() => (results ? results.map((r) => r.connection.id) : null), [results]);
  const sealedIds = useMemo(() => new Set(Object.keys(seals).filter((k) => seals[k] === "sealed")), [seals]);

  const groups = useMemo(() => {
    const filtered = all.filter((c) => {
      if (filter === "verified" && !c.verified) return false;
      return filter === "all" || filter === "verified" || c.event_id === filter;
    });
    const map = new Map<string, { name: string; items: ConnectionWithContact[] }>();
    for (const c of filtered) {
      const key = c.event?.id ?? "none";
      const g = map.get(key) ?? { name: c.event?.name ?? strings.ui.noEvent, items: [] };
      g.items.push(c);
      map.set(key, g);
    }
    return [...map.entries()].sort(([ka, a], [kb, bb]) => {
      if (ka === "none") return 1;
      if (kb === "none") return -1;
      return new Date(bb.items[0].met_at).getTime() - new Date(a.items[0].met_at).getTime();
    });
  }, [all, filter]);

  const hasData = !loading || data;

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-3xl font-bold tracking-[-0.02em]">{b.title}</h1>
          <p className="text-sm text-muted">{b.subtitle}</p>
        </div>
        {hasData && !error && all.length > 0 && (
          <div role="group" aria-label={b.viewLabel} className="flex shrink-0 rounded-full border border-line bg-surface-2 p-0.5">
            {(["graph", "list"] as const).map((v) => (
              <button
                key={v}
                type="button"
                aria-pressed={view === v}
                onClick={() => chooseView(v)}
                className={`inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-sm font-medium transition ${view === v ? "bg-cyan text-ink" : "text-muted"}`}
              >
                {v === "list" ? <List size={16} aria-hidden /> : <Network size={16} aria-hidden />}
                {v === "list" ? b.viewList : b.viewGraph}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading && !data ? (
        <PageLoader />
      ) : error ? (
        <EmptyState icon={Users} title={t.errorTitle} hint={friendlyError(error)} action={<Button onClick={reload}>{strings.common.retry}</Button>} />
      ) : all.length === 0 ? (
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
            <Search size={20} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-cyan" aria-hidden />
            <input
              type="search"
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              placeholder={b.placeholders[phIndex]}
              aria-label={b.askLabel}
              className="min-h-14 w-full rounded-2xl border border-line bg-surface-2 pl-12 pr-4 text-lg placeholder:text-muted/70 focus:border-cyan focus:outline-none"
            />
          </div>

          {view === "graph" ? (
            <Suspense fallback={<PageLoader />}>
              <BrainGraph connections={all} highlightIds={highlightIds} sealed={sealedIds} />
            </Suspense>
          ) : results ? (
            results.length === 0 ? (
              <EmptyState icon={Search} title={b.noMatch} hint={b.noMatchHint} />
            ) : (
              <>
                <p className="font-mono text-xs text-muted">{b.resultCount(results.length)}</p>
                <ul className="flex flex-col gap-2">
                  {results.map((r) => (
                    <li key={r.connection.id}>
                      <PersonRow c={r.connection} reasons={r.reasons} tokens={tokens} seal={seals[r.connection.contact_id]} />
                    </li>
                  ))}
                </ul>
              </>
            )
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2">
                {[
                  [b.statPeople, all.length],
                  [b.statEvents, events.length],
                  [b.statInPerson, verifiedCount],
                ].map(([label, n]) => (
                  <Card key={label} className="p-3">
                    <p className="font-display text-2xl font-bold">{n}</p>
                    <p className="text-xs text-muted">{label}</p>
                  </Card>
                ))}
              </div>

              {skills.length > 0 && (
                <div>
                  <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted">{b.topSkills}</h2>
                  <div className="flex flex-wrap gap-2">
                    {skills.map((s) => (
                      <Chip
                        key={s.skill}
                        onClick={() => {
                          setRaw(s.skill);
                          setQuery(s.skill);
                        }}
                      >
                        {s.skill}
                        <span className="font-mono text-xs text-muted">{s.count}</span>
                      </Chip>
                    ))}
                  </div>
                </div>
              )}

              <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" role="group" aria-label="Filters">
                <Chip selected={filter === "all"} onClick={() => setFilter("all")}>
                  {t.all}
                </Chip>
                <Chip selected={filter === "verified"} onClick={() => setFilter("verified")}>
                  {strings.brain.statInPerson}
                </Chip>
                {events.map(([id, name]) => (
                  <Chip key={id} selected={filter === id} onClick={() => setFilter(id)} className="max-w-48 shrink-0">
                    <span className="truncate">{name}</span>
                  </Chip>
                ))}
              </div>

              {groups.map(([key, g]) => (
                <div key={key}>
                  <h2 className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-widest text-muted">
                    <span className="truncate">{g.name}</span>
                    <span className="ml-2 shrink-0 font-mono normal-case tracking-normal">{t.count(g.items.length)}</span>
                  </h2>
                  <ul className="flex flex-col gap-2">
                    {g.items.map((c) => (
                      <li key={c.id}>
                        <PersonRow c={c} seal={seals[c.contact_id]} />
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </>
          )}
        </>
      )}
    </section>
  );
}
