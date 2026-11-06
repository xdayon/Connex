import { Logo } from "./Logo";

export function Splash() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <Logo size={64} className="animate-pulse" />
    </div>
  );
}
