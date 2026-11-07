import { useState } from "react";

export type AvatarSize = "sm" | "md" | "lg" | "xl";

const dims: Record<AvatarSize, string> = {
  sm: "size-8 text-xs",
  md: "size-11 text-sm",
  lg: "size-16 text-xl",
  xl: "size-24 text-3xl",
};

export function initials(name: string): string {
  const parts = name.trim().replace(/^@/, "").split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = Array.from(parts[0])[0] ?? "?";
  const second = parts.length > 1 ? (Array.from(parts[parts.length - 1])[0] ?? "") : "";
  return (first + second).toUpperCase();
}

type Props = { src?: string | null; name: string; size?: AvatarSize; className?: string };

export function Avatar({ src, name, size = "md", className = "" }: Props) {
  const [failed, setFailed] = useState<string | null>(null);
  const showImage = src && failed !== src;
  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-linear-to-br from-lilac to-cyan font-display font-bold text-ink ${dims[size]} ${className}`}
    >
      {showImage ? (
        <img src={src} alt="" loading="lazy" onError={() => setFailed(src)} className="size-full object-cover" />
      ) : (
        <span aria-hidden>{initials(name)}</span>
      )}
    </span>
  );
}
