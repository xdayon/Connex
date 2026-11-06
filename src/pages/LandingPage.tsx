import { Link } from "react-router";
import { ArrowRight } from "lucide-react";
import { Logo } from "../components/Logo";
import { Button } from "../components/ui/Button";
import { strings } from "../i18n/strings";
import { useAuth } from "../providers/AuthProvider";

export function LandingPage() {
  const { signIn } = useAuth();
  const t = strings.landing;
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-120 flex-col px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-[calc(2rem+env(safe-area-inset-top))]">
      <section className="flex flex-1 flex-col items-center gap-6 pt-6 text-center">
        <Logo size={112} />
        <h1 className="font-display text-4xl font-bold leading-[1.05] tracking-[-0.03em]">{t.headline}</h1>
        <p className="max-w-80 text-base text-muted">{t.subline}</p>
        <Button size="lg" full onClick={signIn} className="mt-2 max-w-80" icon={<ArrowRight size={18} aria-hidden />}>
          {strings.auth.signIn}
        </Button>
      </section>
      <section className="mt-12" aria-labelledby="how">
        <h2 id="how" className="mb-4 font-display text-sm font-semibold uppercase tracking-widest text-muted">
          {t.howTitle}
        </h2>
        <ol className="flex flex-col gap-3">
          {t.steps.map((s, i) => (
            <li key={s.title} className="flex gap-4 rounded-card border border-line bg-surface p-4">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-volt/15 font-mono text-sm font-semibold text-volt">
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
