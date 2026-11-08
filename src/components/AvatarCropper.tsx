import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { strings } from "../i18n/strings";
import type { AvatarCrop } from "../lib/avatar";

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;

// cx/cy: ponto da imagem (em pixels) que fica no centro do círculo.
type View = { zoom: number; cx: number; cy: number };

type Props = { bitmap: ImageBitmap; onChange: (crop: AvatarCrop) => void };

export function AvatarCropper({ bitmap, onChange }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [side, setSide] = useState(280);
  const w = bitmap.width;
  const h = bitmap.height;
  const min = Math.min(w, h);

  // Garante que a imagem sempre cubra o círculo.
  const clamp = useCallback(
    (v: View): View => {
      const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, v.zoom));
      const half = min / zoom / 2;
      return { zoom, cx: Math.min(w - half, Math.max(half, v.cx)), cy: Math.min(h - half, Math.max(half, v.cy)) };
    },
    [w, h, min],
  );

  const [view, setView] = useState<View>({ zoom: 1, cx: w / 2, cy: h / 2 });
  const viewRef = useRef(view);
  viewRef.current = view;
  const update = useCallback(
    (fn: (v: View) => View) => {
      const next = clamp(fn(viewRef.current));
      viewRef.current = next;
      setView(next);
    },
    [clamp],
  );

  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const measure = () => setSide(Math.round(el.clientWidth) || 280);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const size = min / view.zoom;
    const crop = { x: view.cx - size / 2, y: view.cy - size / 2, size };
    onChange(crop);
    const c = canvas.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    const px = Math.round(side * (window.devicePixelRatio || 1));
    if (c.width !== px) {
      c.width = px;
      c.height = px;
    }
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, crop.x, crop.y, crop.size, crop.size, 0, 0, px, px);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, side, bitmap]);

  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef(0);

  const dist = () => {
    const [a, b] = [...pointers.current.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  };

  const onDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) pinch.current = dist();
  };

  const onMove = (e: React.PointerEvent) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    const cur = { x: e.clientX, y: e.clientY };
    pointers.current.set(e.pointerId, cur);
    if (pointers.current.size >= 2) {
      const d = dist();
      if (pinch.current > 0 && d > 0) {
        const ratio = d / pinch.current;
        update((v) => ({ ...v, zoom: v.zoom * ratio }));
      }
      pinch.current = d;
      return;
    }
    update((v) => {
      const scale = (side / min) * v.zoom;
      return { ...v, cx: v.cx - (cur.x - prev.x) / scale, cy: v.cy - (cur.y - prev.y) / scale };
    });
  };

  const onUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    pinch.current = pointers.current.size === 2 ? dist() : 0;
  };

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      update((v) => ({ ...v, zoom: v.zoom * Math.exp(-e.deltaY * 0.0015) }));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [update]);

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        ref={box}
        role="img"
        aria-label={strings.me.cropArea}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        className="relative aspect-square w-full max-w-70 cursor-grab touch-none select-none overflow-hidden rounded-2xl bg-ink active:cursor-grabbing"
        style={{ touchAction: "none" }}
      >
        <canvas ref={canvas} className="absolute inset-0 size-full" />
        <div
          className="pointer-events-none absolute inset-0 rounded-full border-2 border-cyan/80"
          style={{ boxShadow: "0 0 0 999px rgb(0 0 0 / 0.6)" }}
        />
      </div>
      <label className="flex w-full max-w-70 items-center gap-3 text-sm text-muted">
        <span className="shrink-0">{strings.me.cropZoom}</span>
        <input
          type="range"
          min={MIN_ZOOM}
          max={MAX_ZOOM}
          step={0.01}
          value={view.zoom}
          onChange={(e) => update((v) => ({ ...v, zoom: Number(e.target.value) }))}
          className="h-11 min-w-0 flex-1 accent-cyan"
        />
      </label>
    </div>
  );
}
