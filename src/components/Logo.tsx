import { strings } from "../i18n/strings";

type LogoProps = { size?: number; withBackground?: boolean; className?: string };

export function Logo({ size = 32, withBackground = false, className }: LogoProps) {
  const viewBox = withBackground ? "0 0 512 512" : "88 106 336 300";
  const height = withBackground ? size : (size * 300) / 336;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={viewBox}
      width={size}
      height={height}
      className={className}
      role="img"
      aria-label={strings.app.name}
    >
      {withBackground && <rect width="512" height="512" fill="#0A0D16" />}
      <path d="M128 146 L194 256 L128 366" fill="none" stroke="#C77DFF" strokeWidth="60" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M384 146 L318 256 L384 366" fill="none" stroke="#00F0FF" strokeWidth="60" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="256" cy="256" r="18" fill="#E9ECF5" />
    </svg>
  );
}

export function Wordmark({
  size = 28,
  textClassName = "text-[22px]",
  showLogo = true,
}: {
  size?: number;
  textClassName?: string;
  showLogo?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-2">
      {showLogo && <Logo size={size} />}
      {/* Geist com o X maior e centralizado na altura das minúsculas (text-box corta as sobras da fonte). */}
      <span className={`inline-flex items-center font-sans font-semibold leading-none tracking-[-0.03em] text-text ${textClassName}`}>
        <span className="[text-box:trim-both_ex_alphabetic]">conne</span>
        <span className="ml-[0.01em] inline-block text-[1.35em] leading-none text-cyan [text-box:trim-both_cap_alphabetic] [text-shadow:0_0_0.22em_color-mix(in_srgb,var(--color-cyan)_75%,transparent)]">
          X
        </span>
      </span>
    </span>
  );
}
