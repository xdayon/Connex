import { CalendarDays, Globe } from "lucide-react";
import { BRAND_GLYPHS } from "../lib/brandGlyphs";
import type { ShareKey } from "../lib/types";

const MONO = new Set(["#000000", "#181717", "#FFFFFF"]);

type Props = { k: ShareKey; size?: number; className?: string };

export function BrandIcon({ k, size = 18, className }: Props) {
  if (k === "website") return <Globe size={size} className={className} aria-hidden />;
  if (k === "calendar") return <CalendarDays size={size} className={className} aria-hidden />;
  const glyph = BRAND_GLYPHS[k];
  if (!glyph) return null;
  const fill = MONO.has(glyph.color.toUpperCase()) ? "currentColor" : glyph.color;
  return (
    <svg viewBox={glyph.viewBox} width={size} height={size} className={`shrink-0 ${className ?? ""}`} aria-hidden focusable="false">
      <path d={glyph.d} fill={fill} />
    </svg>
  );
}
