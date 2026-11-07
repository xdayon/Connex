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
      {withBackground && <rect width="512" height="512" fill="#12141E" />}
      <path d="M128 146 L194 256 L128 366" fill="none" stroke="#B99CFF" strokeWidth="60" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M384 146 L318 256 L384 366" fill="none" stroke="#3DE0F5" strokeWidth="60" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="256" cy="256" r="18" fill="#E9ECF5" />
    </svg>
  );
}

export function Wordmark({ size = 28 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2">
      <Logo size={size} />
      <span className="font-mono text-lg font-semibold tracking-[-0.04em] text-text">
        conne<span className="text-cyan">x</span>
      </span>
    </span>
  );
}
