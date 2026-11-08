import { LogoMotion } from "./Logo";
import { strings } from "../i18n/strings";

export function Splash() {
  return (
    <div role="status" aria-label={strings.app.loading} className="flex min-h-dvh items-center justify-center">
      <LogoMotion size={64} />
    </div>
  );
}
