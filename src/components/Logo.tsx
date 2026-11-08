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

// Símbolo animado. "loop": as flechas se encontram e somem, repetindo (carregamento).
// "once": se encontram uma vez e ficam (momento da conexão).
export function LogoMotion({ size = 56, mode = "loop", className = "" }: { size?: number; mode?: "loop" | "once"; className?: string }) {
  return (
    <svg
      viewBox="88 106 336 300"
      width={size}
      height={(size * 300) / 336}
      className={`${mode === "loop" ? "lm-loop" : "lm-once"} overflow-visible ${className}`}
      aria-hidden
    >
      <path className="lm-l" d="M128 146 L194 256 L128 366" fill="none" stroke="#C77DFF" strokeWidth="60" strokeLinecap="round" strokeLinejoin="round" />
      <path className="lm-r" d="M384 146 L318 256 L384 366" fill="none" stroke="#00F0FF" strokeWidth="60" strokeLinecap="round" strokeLinejoin="round" />
      <circle className="lm-dot" cx="256" cy="256" r="18" fill="#E9ECF5" />
    </svg>
  );
}

// Carregamento de tela: símbolo animado no centro, só aparece se a espera passar de 150 ms.
export function PageLoader() {
  return (
    <div role="status" aria-label={strings.app.loading} className="lm-delayed flex min-h-[50dvh] items-center justify-center">
      <LogoMotion size={48} />
    </div>
  );
}

// Nome escrito, sem o símbolo: os dois nunca aparecem juntos (o símbolo já é um X).
// Geist 600 com o X maior, em ciano, centralizado na altura das minúsculas.
export function Wordmark({ textClassName = "text-[22px]" }: { textClassName?: string }) {
  return (
    <span
      role="img"
      aria-label={strings.app.name}
      className={`inline-flex items-center font-sans font-semibold leading-none tracking-[-0.03em] text-text ${textClassName}`}
    >
      <span aria-hidden className="[text-box:trim-both_ex_alphabetic]">
        conne
      </span>
      <span
        aria-hidden
        className="ml-[0.01em] inline-block text-[1.35em] leading-none text-cyan [text-box:trim-both_cap_alphabetic] [text-shadow:0_0_0.22em_color-mix(in_srgb,var(--color-cyan)_75%,transparent)]"
      >
        X
      </span>
    </span>
  );
}
