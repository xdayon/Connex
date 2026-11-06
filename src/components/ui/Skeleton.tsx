export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse ${className.includes("rounded") ? "" : "rounded-xl"} bg-surface-2 ${className}`} />;
}
