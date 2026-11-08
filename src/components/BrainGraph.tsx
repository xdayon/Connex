import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { forceCollide, forceLink, forceManyBody, forceRadial, forceSimulation, type SimulationLinkDatum, type SimulationNodeDatum } from "d3-force";
import { LocateFixed, Maximize2, X } from "lucide-react";
import { strings } from "../i18n/strings";
import { normalize } from "../lib/brainSearch";
import { profileName, type ConnectionWithContact } from "../lib/types";
import { useAuth } from "../providers/AuthProvider";
import { initials } from "./ui/Avatar";

type NodeType = "me" | "event" | "person" | "skill";

type GraphNode = SimulationNodeDatum & {
  id: string;
  type: NodeType;
  r: number;
  label: string;
  avatar?: string | null;
  verified?: boolean;
  w?: number;
};

type GraphLink = SimulationLinkDatum<GraphNode> & {
  kind: "me-event" | "event-person" | "me-person" | "person-skill";
};

type Layout = {
  nodes: GraphNode[];
  links: { a: GraphNode; b: GraphNode; kind: GraphLink["kind"] }[];
  neighbors: Map<string, Set<string>>;
  people: number;
  events: number;
};

const MAX_SKILLS = 12;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 4;
const NAMES_ZOOM = 1.15;

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}

function buildLayout(connections: ConnectionWithContact[], me: { name: string; avatar: string | null }): Layout {
  const nodes: GraphNode[] = [
    {
      id: "me",
      type: "me",
      r: 26,
      label: me.name,
      avatar: me.avatar,
      fx: 0,
      fy: 0,
      x: 0,
      y: 0,
    },
  ];
  const links: GraphLink[] = [];
  const byId = new Map<string, GraphNode>([["me", nodes[0]]]);
  const add = (n: GraphNode) => {
    nodes.push(n);
    byId.set(n.id, n);
  };

  for (const c of connections) {
    if (c.event && !byId.has(`e:${c.event.id}`)) {
      const label = truncate(c.event.name, 18);
      add({
        id: `e:${c.event.id}`,
        type: "event",
        r: 14,
        label: c.event.name,
        w: label.length * 6.6 + 18,
      });
      links.push({ source: "me", target: `e:${c.event.id}`, kind: "me-event" });
    }
  }
  for (const c of connections) {
    add({
      id: `p:${c.id}`,
      type: "person",
      r: 15,
      label: profileName(c.contact),
      avatar: c.contact?.avatar_url,
      verified: c.verified,
    });
    links.push(
      c.event
        ? {
            source: `e:${c.event.id}`,
            target: `p:${c.id}`,
            kind: "event-person",
          }
        : { source: "me", target: `p:${c.id}`, kind: "me-person" },
    );
  }

  const skillMap = new Map<string, { label: string; people: string[] }>();
  for (const c of connections) {
    const seen = new Set<string>();
    for (const s of c.contact?.skills ?? []) {
      const key = normalize(s);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      const e = skillMap.get(key) ?? { label: s.trim(), people: [] };
      e.people.push(`p:${c.id}`);
      skillMap.set(key, e);
    }
  }
  const skills = [...skillMap.entries()]
    .filter(([, v]) => v.people.length >= 2)
    .sort((a, b) => b[1].people.length - a[1].people.length)
    .slice(0, MAX_SKILLS);
  for (const [key, v] of skills) {
    const label = truncate(v.label, 14);
    add({
      id: `s:${key}`,
      type: "skill",
      r: 5,
      label: v.label,
      w: label.length * 6,
    });
    for (const p of v.people) links.push({ source: `s:${key}`, target: p, kind: "person-skill" });
  }

  const sim = forceSimulation(nodes)
    .force(
      "link",
      forceLink<GraphNode, GraphLink>(links)
        .id((d) => d.id)
        .distance((l) => (l.kind === "me-event" ? 120 : l.kind === "event-person" ? 62 : l.kind === "me-person" ? 90 : 110))
        .strength((l) => (l.kind === "person-skill" ? 0.06 : 0.8)),
    )
    .force(
      "charge",
      forceManyBody<GraphNode>().strength((d) => (d.type === "event" ? -260 : d.type === "skill" ? -30 : -70)),
    )
    .force(
      "collide",
      forceCollide<GraphNode>().radius((d) => d.r + (d.type === "event" ? (d.w ?? 0) / 2 : 6)),
    )
    .force(
      "radial",
      forceRadial<GraphNode>(230, 0, 0).strength((d) => (d.type === "skill" ? 0.06 : 0)),
    )
    .stop();
  for (let i = 0; i < 300; i++) sim.tick();

  const neighbors = new Map<string, Set<string>>();
  const link = (a: string, b: string) => {
    if (!neighbors.has(a)) neighbors.set(a, new Set([a]));
    if (!neighbors.has(b)) neighbors.set(b, new Set([b]));
    neighbors.get(a)!.add(b);
    neighbors.get(b)!.add(a);
  };
  const resolved = links.map((l) => ({
    a: l.source as GraphNode,
    b: l.target as GraphNode,
    kind: l.kind,
  }));
  for (const l of resolved) link(l.a.id, l.b.id);

  return {
    nodes,
    links: resolved,
    neighbors,
    people: connections.length,
    events: nodes.filter((n) => n.type === "event").length,
  };
}

type View = { x: number; y: number; k: number };

const btnClass =
  "inline-flex size-11 items-center justify-center rounded-full border border-line bg-surface-2/90 text-text backdrop-blur transition active:scale-95";

type Props = {
  connections: ConnectionWithContact[];
  highlightIds?: string[] | null;
};

export function BrainGraph({ connections, highlightIds = null }: Props) {
  const t = strings.brain;
  const navigate = useNavigate();
  const { profile } = useAuth();
  const clipId = useId();
  const meName = profile ? profileName(profile) : t.me;
  const meAvatar = profile?.avatar_url ?? null;

  const layout = useMemo(() => buildLayout(connections, { name: meName, avatar: meAvatar }), [connections, meName, meAvatar]);

  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);
  const view = useRef<View>({ x: 0, y: 0, k: 1 });
  const raf = useRef(0);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [focus, setFocus] = useState<string | null>(null);
  const [names, setNames] = useState(false);
  const [full, setFull] = useState(false);
  const fitK = useRef(1);
  const namesOn = useRef(false);
  const nativeFull = useRef(false);

  // só vira estado React ao cruzar o limiar de zoom; o pan/zoom segue via setAttribute
  const syncNames = useCallback(() => {
    const on = view.current.k >= fitK.current * NAMES_ZOOM;
    if (on !== namesOn.current) {
      namesOn.current = on;
      setNames(on);
    }
  }, []);

  const paint = useCallback(() => {
    if (raf.current) return;
    raf.current = requestAnimationFrame(() => {
      raf.current = 0;
      const { x, y, k } = view.current;
      gRef.current?.setAttribute("transform", `translate(${x} ${y}) scale(${k})`);
      syncNames();
    });
  }, [syncNames]);

  const fit = useCallback(() => {
    if (!size.w || !size.h) return;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const n of layout.nodes) {
      const hw = Math.max(n.r, (n.w ?? 0) / 2) + 6;
      minX = Math.min(minX, (n.x ?? 0) - hw);
      maxX = Math.max(maxX, (n.x ?? 0) + hw);
      minY = Math.min(minY, (n.y ?? 0) - n.r - 6);
      maxY = Math.max(maxY, (n.y ?? 0) + n.r + 6);
    }
    const k = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.min(size.w / (maxX - minX), size.h / (maxY - minY)) * 0.92));
    fitK.current = k;
    view.current = {
      k,
      x: size.w / 2 - ((minX + maxX) / 2) * k,
      y: size.h / 2 - ((minY + maxY) / 2) * k,
    };
    paint();
  }, [layout, size, paint]);

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useLayoutEffect(() => {
    fit();
    if (gRef.current) {
      const { x, y, k } = view.current;
      gRef.current.setAttribute("transform", `translate(${x} ${y}) scale(${k})`);
    }
  }, [fit]);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const closeFull = useCallback(() => {
    if (window.history.state?.brainFull) window.history.back();
    else setFull(false);
  }, []);

  useEffect(() => {
    if (!full) return;
    const root = wrapRef.current;
    window.history.pushState({ ...window.history.state, brainFull: true }, "");
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    try {
      const p = root?.requestFullscreen?.();
      if (p) {
        nativeFull.current = true;
        p.catch(() => {
          nativeFull.current = false;
        });
      }
    } catch {
      nativeFull.current = false;
    }
    const onPop = () => setFull(false);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeFull();
    };
    const onFsChange = () => {
      if (!document.fullscreenElement && nativeFull.current) {
        nativeFull.current = false;
        closeFull();
      }
    };
    window.addEventListener("popstate", onPop);
    window.addEventListener("keydown", onKey);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => {
      window.removeEventListener("popstate", onPop);
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("fullscreenchange", onFsChange);
      document.body.style.overflow = prevOverflow;
      if (nativeFull.current && document.fullscreenElement) {
        nativeFull.current = false;
        document.exitFullscreen?.().catch(() => {});
      }
    };
  }, [full, closeFull]);

  const zoomAt = useCallback(
    (px: number, py: number, factor: number) => {
      const v = view.current;
      const k = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, v.k * factor));
      const f = k / v.k;
      view.current = { k, x: px - (px - v.x) * f, y: py - (py - v.y) * f };
      paint();
    },
    [paint],
  );

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = svg.getBoundingClientRect();
      zoomAt(e.clientX - r.left, e.clientY - r.top, Math.exp(-e.deltaY * 0.0015));
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, [zoomAt]);

  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef({ moved: false, dist: 0, startX: 0, startY: 0 });

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 1)
      gesture.current = {
        moved: false,
        dist: 0,
        startX: e.clientX,
        startY: e.clientY,
      };
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      gesture.current.dist = Math.hypot(a.x - b.x, a.y - b.y);
      gesture.current.moved = true;
    }
  };

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    const next = { x: e.clientX, y: e.clientY };
    const rect = e.currentTarget.getBoundingClientRect();
    if (pointers.current.size === 1) {
      if (!gesture.current.moved && Math.hypot(next.x - gesture.current.startX, next.y - gesture.current.startY) < 5) return;
      if (!gesture.current.moved) e.currentTarget.setPointerCapture(e.pointerId);
      gesture.current.moved = true;
      view.current = {
        ...view.current,
        x: view.current.x + next.x - prev.x,
        y: view.current.y + next.y - prev.y,
      };
      paint();
    } else if (pointers.current.size === 2) {
      pointers.current.set(e.pointerId, next);
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (gesture.current.dist > 0 && dist > 0) zoomAt((a.x + b.x) / 2 - rect.left, (a.y + b.y) / 2 - rect.top, dist / gesture.current.dist);
      gesture.current.dist = dist;
      return;
    }
    pointers.current.set(e.pointerId, next);
  };

  const onPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    pointers.current.delete(e.pointerId);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    if (pointers.current.size === 1) {
      const [p] = [...pointers.current.values()];
      gesture.current.startX = p.x;
      gesture.current.startY = p.y;
    }
  };

  const tapNode = (n: GraphNode) => {
    if (gesture.current.moved) return;
    if (n.type === "person") navigate(`/connections/${n.id.slice(2)}`);
    else if (n.type === "event" || n.type === "skill") setFocus((f) => (f === n.id ? null : n.id));
  };

  const focusNode = focus ? layout.nodes.find((n) => n.id === focus) : null;
  const searchSet = useMemo(() => {
    if (!highlightIds) return null;
    const s = new Set<string>(["me"]);
    for (const id of highlightIds) s.add(`p:${id}`);
    return s;
  }, [highlightIds]);
  const active = focusNode ? (layout.neighbors.get(focusNode.id) ?? new Set([focusNode.id])) : searchSet;
  const dim = (id: string) => (active && !active.has(id) ? 0.15 : 1);

  const focusPeople = focusNode ? [...(layout.neighbors.get(focusNode.id) ?? [])].filter((id) => id.startsWith("p:")).length : 0;
  const chip = focusNode ? t.showing(focusNode.label, focusPeople) : searchSet ? t.showingMatches(searchSet.size - 1) : null;

  return (
    <div className="h-[60vh] min-h-80">
      <div
        ref={wrapRef}
        className={
          full
            ? "anim-brain-full fixed inset-0 z-50 overflow-hidden bg-ink"
            : "relative h-full overflow-hidden rounded-card border border-line bg-surface"
        }
      >
        <svg
          ref={svgRef}
          role="img"
          aria-label={t.graphSummary(layout.people, layout.events)}
          width={size.w}
          height={size.h}
          className="block cursor-grab touch-none select-none active:cursor-grabbing"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <defs>
            <clipPath id={clipId} clipPathUnits="objectBoundingBox">
              <circle cx={0.5} cy={0.5} r={0.5} />
            </clipPath>
          </defs>
          <g ref={gRef}>
            <g style={{ stroke: "var(--color-muted)" }} fill="none">
              {layout.links.map((l, i) => {
                const faint = l.kind === "person-skill";
                const on = !active || (active.has(l.a.id) && active.has(l.b.id));
                return (
                  <line
                    key={i}
                    x1={l.a.x}
                    y1={l.a.y}
                    x2={l.b.x}
                    y2={l.b.y}
                    strokeWidth={faint ? 0.75 : 1.25}
                    strokeOpacity={on ? (faint ? 0.3 : 0.55) : 0.06}
                  />
                );
              })}
            </g>
            {layout.nodes.map((n) => {
              const x = n.x ?? 0;
              const y = n.y ?? 0;
              const common = {
                opacity: dim(n.id),
                className: "motion-safe:transition-opacity",
              };
              if (n.type === "event") {
                const w = n.w ?? 60;
                const on = focus === n.id;
                return (
                  <g
                    key={n.id}
                    {...common}
                    transform={`translate(${x} ${y})`}
                    onClick={() => tapNode(n)}
                    className={`${common.className} cursor-pointer`}
                  >
                    <rect
                      x={-w / 2}
                      y={-n.r}
                      width={w}
                      height={n.r * 2}
                      rx={n.r}
                      style={{
                        fill: on ? "var(--color-cyan)" : "var(--color-surface-2)",
                        stroke: on ? "var(--color-cyan)" : "var(--color-lilac)",
                      }}
                      strokeWidth={1.5}
                    />
                    <text
                      textAnchor="middle"
                      dy="0.35em"
                      fontSize={11}
                      className="font-mono"
                      style={{
                        fill: on ? "var(--color-ink)" : "var(--color-text)",
                      }}
                    >
                      {truncate(n.label, 18)}
                    </text>
                  </g>
                );
              }
              if (n.type === "skill") {
                const on = focus === n.id;
                return (
                  <g
                    key={n.id}
                    {...common}
                    transform={`translate(${x} ${y})`}
                    onClick={() => tapNode(n)}
                    className={`${common.className} cursor-pointer`}
                  >
                    <circle r={14} fill="transparent" />
                    <circle
                      r={n.r}
                      style={{
                        fill: on ? "var(--color-cyan)" : "var(--color-lilac)",
                      }}
                    />
                    <text y={-10} textAnchor="middle" fontSize={10} className="font-mono" style={{ fill: "var(--color-muted)" }}>
                      {truncate(n.label, 14)}
                    </text>
                  </g>
                );
              }
              const isMe = n.type === "me";
              return (
                <g
                  key={n.id}
                  {...common}
                  transform={`translate(${x} ${y})`}
                  onClick={() => tapNode(n)}
                  className={`${common.className} ${isMe ? "" : "cursor-pointer"}`}
                >
                  {!isMe && <title>{n.label}</title>}
                  <circle
                    r={n.r + 2}
                    style={{
                      fill: "var(--color-surface-2)",
                      stroke: isMe || n.verified ? "var(--color-cyan)" : "var(--color-line)",
                    }}
                    strokeWidth={2}
                  />
                  {n.avatar ? (
                    <image
                      href={n.avatar}
                      x={-n.r}
                      y={-n.r}
                      width={n.r * 2}
                      height={n.r * 2}
                      clipPath={`url(#${clipId})`}
                      preserveAspectRatio="xMidYMid slice"
                    />
                  ) : (
                    <text
                      textAnchor="middle"
                      dy="0.35em"
                      fontSize={n.r * 0.75}
                      className="font-display font-bold"
                      style={{ fill: "var(--color-text)" }}
                    >
                      {initials(n.label)}
                    </text>
                  )}
                  {!isMe && (
                    <text
                      y={n.r + 14}
                      textAnchor="middle"
                      fontSize={10}
                      className="pointer-events-none font-mono"
                      aria-hidden
                      paintOrder="stroke"
                      strokeWidth={3}
                      strokeLinejoin="round"
                      style={{
                        fill: "var(--color-text)",
                        stroke: "var(--color-ink)",
                        opacity: names || (active && active.has(n.id)) ? 1 : 0,
                        transition: "opacity 180ms ease-out",
                      }}
                    >
                      {truncate(n.label, 16)}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        </svg>

        <div className="absolute right-[max(0.75rem,env(safe-area-inset-right))] top-[max(0.75rem,env(safe-area-inset-top))] flex gap-2">
          <button type="button" onClick={fit} aria-label={t.fit} title={t.fit} className={btnClass}>
            <LocateFixed size={18} aria-hidden />
          </button>
          {!full && (
            <button type="button" onClick={() => setFull(true)} aria-label={t.fullscreen} title={t.fullscreen} className={btnClass}>
              <Maximize2 size={18} aria-hidden />
            </button>
          )}
        </div>

        {full && (
          <button
            type="button"
            onClick={closeFull}
            aria-label={t.closeFullscreen}
            title={t.closeFullscreen}
            className={`${btnClass} absolute left-[max(0.75rem,env(safe-area-inset-left))] top-[max(0.75rem,env(safe-area-inset-top))]`}
          >
            <X size={20} aria-hidden />
          </button>
        )}

        {chip && (
          <div className="absolute inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] flex">
            <span className="inline-flex min-h-9 max-w-full items-center gap-1 rounded-full border border-cyan bg-surface-2/95 py-1 pl-3 pr-1 text-sm text-text backdrop-blur">
              <span className="truncate">{chip}</span>
              {focusNode && (
                <button
                  type="button"
                  onClick={() => setFocus(null)}
                  aria-label={t.clearFocus}
                  className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-muted hover:text-text"
                >
                  <X size={14} aria-hidden />
                </button>
              )}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
