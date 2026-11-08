import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { forceCollide, forceLink, forceManyBody, forceRadial, forceSimulation, type SimulationLinkDatum, type SimulationNodeDatum } from "d3-force";
import { ChevronRight, LocateFixed, Maximize2, X } from "lucide-react";
import { strings } from "../i18n/strings";
import { normalize } from "../lib/brainSearch";
import { profileName, type ConnectionWithContact } from "../lib/types";
import { useAuth } from "../providers/AuthProvider";
import { Avatar, initials } from "./ui/Avatar";
import { SealedBadge } from "./ui/SealedBadge";
import { VerifiedBadge } from "./ui/VerifiedBadge";
import { relativeDate } from "../lib/format";

type NodeType = "me" | "event" | "person" | "skill" | "stranger";

type GraphNode = SimulationNodeDatum & {
  id: string;
  type: NodeType;
  r: number;
  label: string;
  avatar?: string | null;
  verified?: boolean;
  // Pessoa: id do contato (para saber se o selo fechou).
  contactId?: string;
  w?: number;
};

// Pessoa presente (num evento) que ainda não está na sua rede: aparece solta, num anel de fora.
export type Stranger = { id: string; name: string; avatar: string | null };

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
// Nomes: tamanho fixo na tela (não crescem com o zoom). Um nome só aparece se não encostar em
// outro nome nem em outra bolha; quem tem prioridade ganha a vaga. Com o zoom, sobra espaço e
// aparecem mais nomes. Abaixo deste tamanho de bolha na tela, nenhum nome aparece.
const LABEL_FONT = 11;
const LABEL_CHAR_W = 6.7;
const LABEL_H = 15;
const LABEL_MIN_NODE_PX = 7;
const LABEL_CHARS = 16;

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}

function buildLayout(connections: ConnectionWithContact[], me: { name: string; avatar: string | null }, strangers: Stranger[]): Layout {
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
      contactId: c.contact_id,
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

  for (const st of strangers) {
    add({ id: `x:${st.id}`, type: "stranger", r: 13, label: st.name, avatar: st.avatar });
  }
  // Anel de quem você ainda não conhece: logo depois do miolo (você, eventos e conexões) e largo
  // o bastante para as bolhas caberem lado a lado. Anel grande demais encolhe o grafo inteiro.
  const hasEvents = nodes.some((n) => n.type === "event");
  const inner = connections.length === 0 ? 40 : hasEvents ? 200 : 110;
  const strangerRing = Math.max(inner + 80, (strangers.length * 38) / (2 * Math.PI));

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
      forceManyBody<GraphNode>().strength((d) => (d.type === "event" ? -260 : d.type === "skill" ? -30 : d.type === "stranger" ? -45 : -70)),
    )
    .force(
      "collide",
      forceCollide<GraphNode>().radius((d) => d.r + (d.type === "event" ? (d.w ?? 0) / 2 : 6)),
    )
    .force(
      "radial",
      forceRadial<GraphNode>((d) => (d.type === "stranger" ? strangerRing : 230), 0, 0).strength((d) =>
        d.type === "skill" ? 0.06 : d.type === "stranger" ? 0.18 : 0,
      ),
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

type Box = [number, number, number, number];
const overlaps = (a: Box, b: Box) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];

// Escolhe quais nomes cabem na tela neste zoom (k). Tudo em pixels de tela, sem o deslocamento
// (que não muda quem encosta em quem). `order` já vem do mais importante para o menos.
function placeLabels(layout: Layout, k: number, order: GraphNode[]): Set<string> {
  const shown = new Set<string>();
  const obstacles: { id: string; box: Box }[] = [];
  for (const n of layout.nodes) {
    const x = (n.x ?? 0) * k;
    const y = (n.y ?? 0) * k;
    if (n.type === "event") {
      const hw = ((n.w ?? 60) / 2) * k;
      obstacles.push({ id: n.id, box: [x - hw, y - n.r * k, x + hw, y + n.r * k] });
    } else if (n.type === "skill") {
      // O nome da habilidade cresce com o zoom (fica dentro do grupo escalado).
      const hw = (truncate(n.label, 14).length * 3 + 2) * k;
      obstacles.push({ id: n.id, box: [x - hw, y - 20 * k, x + hw, y + n.r * k] });
    } else {
      const r = (n.r + 2) * k;
      obstacles.push({ id: n.id, box: [x - r, y - r, x + r, y + r] });
    }
  }
  const placed: Box[] = [];
  for (const n of order) {
    if (n.r * k < LABEL_MIN_NODE_PX) continue;
    const x = (n.x ?? 0) * k;
    const top = (n.y ?? 0) * k + (n.r + 2) * k + 1;
    const hw = (truncate(n.label, LABEL_CHARS).length * LABEL_CHAR_W) / 2 + 2;
    const box: Box = [x - hw, top, x + hw, top + LABEL_H];
    if (placed.some((b) => overlaps(b, box))) continue;
    if (obstacles.some((o) => o.id !== n.id && overlaps(o.box, box))) continue;
    placed.push(box);
    shown.add(n.id);
  }
  return shown;
}

const btnClass =
  "inline-flex size-11 items-center justify-center rounded-full border border-line bg-surface-2/90 text-text backdrop-blur transition active:scale-95";

type Props = {
  connections: ConnectionWithContact[];
  highlightIds?: string[] | null;
  // Ids dos contatos com selo de encontro confirmado dos dois lados.
  sealed?: Set<string>;
  // Brain do evento: quem está lá e você ainda não conhece; tocar chama onStranger.
  strangers?: Stranger[];
  onStranger?: (id: string) => void;
};

const NO_STRANGERS: Stranger[] = [];

export function BrainGraph({ connections, highlightIds = null, sealed, strangers = NO_STRANGERS, onStranger }: Props) {
  const t = strings.brain;
  const navigate = useNavigate();
  const { profile } = useAuth();
  const clipId = useId();
  const meName = profile ? profileName(profile) : t.me;
  const meAvatar = profile?.avatar_url ?? null;

  const layout = useMemo(() => buildLayout(connections, { name: meName, avatar: meAvatar }, strangers), [connections, meName, meAvatar, strangers]);

  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);
  const view = useRef<View>({ x: 0, y: 0, k: 1 });
  const raf = useRef(0);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [focus, setFocus] = useState<string | null>(null);
  // Pessoa tocada no grafo: mostra o cartão resumido antes de abrir o perfil completo.
  const [peek, setPeek] = useState<string | null>(null);
  const [full, setFull] = useState(false);
  // Nomes visíveis agora; recalculados quando o zoom muda (o arrastar não muda nada).
  const [labels, setLabels] = useState<Set<string>>(() => new Set());
  const labelK = useRef(0);
  const labelOrder = useRef<GraphNode[]>([]);
  const nativeFull = useRef(false);
  // Toque numa pessoa em tela cheia: fecha primeiro (desfaz a entrada no histórico) e só depois navega.
  const pendingNav = useRef<string | null>(null);

  // O pan/zoom segue via setAttribute; os nomes só viram estado React quando o conjunto muda.
  const syncLabels = useCallback(
    (force = false) => {
      const k = view.current.k;
      if (!force && labelK.current && Math.abs(k / labelK.current - 1) < 0.04) return;
      labelK.current = k;
      const next = placeLabels(layout, k, labelOrder.current);
      setLabels((prev) => (prev.size === next.size && [...next].every((id) => prev.has(id)) ? prev : next));
    },
    [layout],
  );

  const paint = useCallback(() => {
    if (raf.current) return;
    raf.current = requestAnimationFrame(() => {
      raf.current = 0;
      const { x, y, k } = view.current;
      gRef.current?.setAttribute("transform", `translate(${x} ${y}) scale(${k})`);
      // Os nomes desfazem a escala do grupo para manter o tamanho na tela.
      gRef.current?.style.setProperty("--ik", String(1 / k));
      syncLabels();
    });
  }, [syncLabels]);

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
    // Margem em pixels de tela para os nomes (tamanho fixo) não serem cortados nas bordas:
    // meia largura de um nome dos lados e a altura de um nome embaixo.
    const padX = Math.min(60, size.w * 0.15);
    const padTop = 12;
    const padBottom = LABEL_H + 12;
    const availW = Math.max(40, size.w - 2 * padX);
    const availH = Math.max(40, size.h - padTop - padBottom);
    const k = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.min(availW / (maxX - minX), availH / (maxY - minY))));
    view.current = {
      k,
      x: padX + availW / 2 - ((minX + maxX) / 2) * k,
      y: padTop + availH / 2 - ((minY + maxY) / 2) * k,
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
      gRef.current.style.setProperty("--ik", String(1 / k));
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
      // Na WebView do APK a tela cheia nativa depende de onShowCustomView, que o shell não implementa.
      const p = /; wv\)/.test(navigator.userAgent) ? undefined : root?.requestFullscreen?.();
      if (p) {
        nativeFull.current = true;
        p.catch(() => {
          nativeFull.current = false;
        });
      }
    } catch {
      nativeFull.current = false;
    }
    const onPop = () => {
      setFull(false);
      const to = pendingNav.current;
      pendingNav.current = null;
      if (to) navigate(to);
    };
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
  }, [full, closeFull, navigate]);

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

  const openProfile = (connectionId: string) => {
    const to = `/connections/${connectionId}`;
    if (full && window.history.state?.brainFull) {
      pendingNav.current = to;
      window.history.back();
    } else navigate(to);
  };

  const closePeek = () => {
    setPeek(null);
    setFocus(null);
  };

  const tapNode = (n: GraphNode) => {
    if (gesture.current.moved) return;
    if (n.type === "person") {
      const id = n.id.slice(2);
      // Segundo toque na mesma pessoa abre o perfil; o primeiro só mostra o resumo.
      if (peek === id) openProfile(id);
      else {
        setPeek(id);
        setFocus(n.id);
      }
    } else if (n.type === "stranger") {
      onStranger?.(n.id.slice(2));
    } else if (n.type === "event" || n.type === "skill") {
      setPeek(null);
      setFocus((f) => (f === n.id ? null : n.id));
    }
  };

  const peekConn = peek ? connections.find((c) => c.id === peek) : null;

  const focusNode = focus ? layout.nodes.find((n) => n.id === focus) : null;
  const searchSet = useMemo(() => {
    if (!highlightIds) return null;
    const s = new Set<string>(["me"]);
    for (const id of highlightIds) s.add(`p:${id}`);
    return s;
  }, [highlightIds]);
  const active = focusNode ? (layout.neighbors.get(focusNode.id) ?? new Set([focusNode.id])) : searchSet;
  const dim = (id: string) => (active && !active.has(id) ? 0.15 : 1);

  // Quem ganha a vaga do nome primeiro: a pessoa aberta no resumo, quem selou, quem foi
  // verificado, conexões antes de desconhecidos, e quem tem mais ligações. Com foco ou busca,
  // só os destacados disputam.
  const labelPriority = useMemo(() => {
    const score = (n: GraphNode) =>
      (peek && n.id === `p:${peek}` ? 1000 : 0) +
      (n.contactId && sealed?.has(n.contactId) ? 100 : 0) +
      (n.verified ? 50 : 0) +
      (n.type === "person" ? 20 : 0) +
      (layout.neighbors.get(n.id)?.size ?? 0);
    return layout.nodes
      .filter((n) => (n.type === "person" || n.type === "stranger") && (!active || active.has(n.id)))
      .sort((a, b) => score(b) - score(a) || a.label.localeCompare(b.label));
  }, [layout, active, peek, sealed]);

  useLayoutEffect(() => {
    labelOrder.current = labelPriority;
    syncLabels(true);
  }, [labelPriority, syncLabels]);

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
              const stranger = n.type === "stranger";
              return (
                <g
                  key={n.id}
                  {...common}
                  transform={`translate(${x} ${y})`}
                  onClick={() => tapNode(n)}
                  className={`${common.className} ${isMe ? "" : "cursor-pointer"}`}
                  opacity={stranger ? common.opacity * 0.7 : common.opacity}
                >
                  {!isMe && <title>{n.label}</title>}
                  <circle
                    r={n.r + 2}
                    style={{
                      fill: "var(--color-surface-2)",
                      stroke: isMe || n.verified ? "var(--color-cyan)" : stranger ? "var(--color-muted)" : "var(--color-line)",
                    }}
                    strokeWidth={2}
                    strokeDasharray={stranger ? "3 3" : undefined}
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
                    // Nome logo abaixo da bolha, com tamanho fixo na tela (desfaz a escala do zoom).
                    <g
                      transform={`translate(0 ${n.r + 2})`}
                      className="pointer-events-none"
                      aria-hidden
                      style={{ opacity: labels.has(n.id) ? 1 : 0, transition: "opacity 180ms ease-out" }}
                    >
                      <g style={{ transform: "scale(var(--ik, 1))" }}>
                        <text
                          y={12}
                          textAnchor="middle"
                          fontSize={LABEL_FONT}
                          className="font-mono"
                          paintOrder="stroke"
                          strokeWidth={3}
                          strokeLinejoin="round"
                          style={{ fill: stranger ? "var(--color-muted)" : "var(--color-text)", stroke: "var(--color-ink)" }}
                        >
                          {truncate(n.label, LABEL_CHARS)}
                        </text>
                      </g>
                    </g>
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

        {peekConn && (
          <div className="absolute inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] mx-auto max-w-md">
            <PeekCard c={peekConn} sealed={!!sealed?.has(peekConn.contact_id)} onOpen={() => openProfile(peekConn.id)} onClose={closePeek} />
          </div>
        )}

        {chip && !peekConn && (
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

function PeekCard({ c, sealed, onOpen, onClose }: { c: ConnectionWithContact; sealed: boolean; onOpen: () => void; onClose: () => void }) {
  const t = strings.brain;
  const name = profileName(c.contact);
  const sub = [c.contact?.headline, c.contact?.company].filter(Boolean).join(" · ");
  const chips = [...c.tags, ...(c.contact?.skills ?? [])].slice(0, 4);
  return (
    <div role="dialog" aria-label={name} className="anim-toast rounded-card border border-line bg-surface-2/95 p-3 shadow-lg backdrop-blur">
      <div className="flex items-start gap-3">
        <Avatar src={c.contact?.avatar_url} name={name} size="md" />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1 font-semibold text-text">
            <span className="truncate">{name}</span>
            {c.verified && <VerifiedBadge />}
            {sealed && <SealedBadge />}
          </p>
          {sub && <p className="truncate text-sm text-muted">{sub}</p>}
          <p className="truncate text-xs text-muted">
            {c.event ? `${t.metAt} ${c.event.name}` : t.met} · {relativeDate(c.met_at)}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t.closePeek}
          className="-mr-1 -mt-1 inline-flex size-9 shrink-0 items-center justify-center rounded-full text-muted hover:text-text"
        >
          <X size={16} aria-hidden />
        </button>
      </div>
      {c.note && <p className="mt-2 line-clamp-2 text-sm text-text/90">{c.note}</p>}
      {chips.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {chips.map((s) => (
            <span key={s} className="rounded-full border border-line px-2 py-0.5 text-xs text-muted">
              {s}
            </span>
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={onOpen}
        className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-1 rounded-full bg-cyan px-4 text-sm font-semibold text-ink transition active:scale-[0.98]"
      >
        {t.openProfile}
        <ChevronRight size={16} aria-hidden />
      </button>
    </div>
  );
}
