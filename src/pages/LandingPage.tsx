import { Link } from "react-router";
import { ArrowRight, NotebookPen, ScanLine, Search, Waypoints } from "lucide-react";
import { Logo, Wordmark } from "../components/Logo";
import { Button } from "../components/ui/Button";
import { strings } from "../i18n/strings";
import { useAuth } from "../providers/AuthProvider";

const featureIcons = [ScanLine, NotebookPen, Search, Waypoints];

export function LandingPage() {
  const { signIn } = useAuth();
  const t = strings.landing;
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-120 flex-col px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-[calc(2rem+env(safe-area-inset-top))]">
      <section className="flex flex-1 flex-col items-center pt-4 text-center">
        <Logo size={96} />
        <h1 className="mt-4">
          <span className="sr-only">{strings.app.name}</span>
          <span aria-hidden>
            <Wordmark showLogo={false} textClassName="text-5xl" />
          </span>
        </h1>
        <p className="mt-6 font-display text-3xl font-bold leading-[1.1] tracking-[-0.03em]">{t.headline}</p>
        <p className="mt-4 max-w-84 text-base text-muted">{t.subline}</p>
        <div
          aria-hidden
          className="mt-6 flex w-full max-w-84 items-center gap-3 rounded-full border border-line bg-surface px-4 py-3 text-left text-sm text-muted"
        >
          <Search size={18} className="shrink-0 text-cyan" />
          <span className="truncate">{t.searchDemo}</span>
        </div>
        <Button size="lg" full onClick={signIn} className="mt-6 max-w-84" icon={<ArrowRight size={18} aria-hidden />}>
          {strings.auth.signIn}
        </Button>
        <p className="mt-3 text-xs text-muted">{t.signInNote}</p>
      </section>

      <section className="mt-12" aria-labelledby="features">
        <h2 id="features" className="mb-4 font-display text-sm font-semibold uppercase tracking-widest text-muted">
          {t.featuresTitle}
        </h2>
        <ul className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-2">
          {t.features.map((f, i) => {
            const Icon = featureIcons[i];
            return (
              <li key={f.title} className="rounded-card border border-line bg-surface p-4">
                <Icon size={22} aria-hidden className={i % 2 ? "text-lilac" : "text-cyan"} />
                <p className="mt-3 font-display font-semibold">{f.title}</p>
                <p className="mt-1 text-sm text-muted">{f.body}</p>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mt-10" aria-labelledby="how">
        <h2 id="how" className="mb-4 font-display text-sm font-semibold uppercase tracking-widest text-muted">
          {t.howTitle}
        </h2>
        <ol className="flex flex-col gap-3">
          {t.steps.map((s, i) => (
            <li key={s.title} className="flex gap-4 rounded-card border border-line bg-surface p-4">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-cyan/15 font-mono text-sm font-semibold text-cyan">
                {i + 1}
              </span>
              <div>
                <p className="font-display font-semibold">{s.title}</p>
                <p className="mt-0.5 text-sm text-muted">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <footer className="mt-10 flex justify-center gap-6 text-sm text-muted">
        <Link to="/legal/terms" className="inline-flex min-h-11 items-center underline-offset-4 hover:underline">
          {t.terms}
        </Link>
        <Link to="/legal/privacy" className="inline-flex min-h-11 items-center underline-offset-4 hover:underline">
          {t.privacy}
        </Link>
      </footer>
    </div>
  );
}
