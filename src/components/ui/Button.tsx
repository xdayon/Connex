import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Loader2 } from "lucide-react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const base =
  "inline-flex min-h-11 select-none items-center justify-center gap-2 rounded-full font-semibold transition duration-150 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-cyan text-ink hover:brightness-105",
  secondary: "border border-line bg-surface-2 text-text hover:border-muted/60",
  ghost: "text-text hover:bg-surface-2",
  danger: "border border-danger/40 bg-danger/10 text-danger hover:bg-danger/20",
};

const sizes: Record<ButtonSize, string> = {
  sm: "px-4 text-sm",
  md: "px-5 text-sm",
  lg: "min-h-13 px-6 text-base",
};

export function buttonClass({
  variant = "primary",
  size = "md",
  full = false,
  className = "",
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  full?: boolean;
  className?: string;
}) {
  return `${base} ${variants[variant]} ${sizes[size]} ${full ? "w-full" : ""} ${className}`;
}

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  full?: boolean;
  loading?: boolean;
  icon?: ReactNode;
};

export function Button({ variant, size, full, loading, icon, disabled, className, children, type = "button", ...rest }: Props) {
  return (
    <button type={type} disabled={disabled || loading} className={buttonClass({ variant, size, full, className })} {...rest}>
      {loading ? <Loader2 size={18} className="animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  );
}
