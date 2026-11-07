import { Link } from "react-router";
import { strings } from "../i18n/strings";

export function NotFoundPage() {
  const s = strings.notFound;
  return (
    <section className="pt-10 text-center">
      <p className="font-mono text-6xl font-bold text-lilac">404</p>
      <h1 className="mt-4 font-display text-3xl font-bold tracking-[-0.02em]">{s.title}</h1>
      <p className="mt-1 text-muted">{s.description}</p>
      <Link to="/" className="mt-6 inline-flex h-10 items-center rounded-full bg-cyan px-5 text-sm font-semibold text-ink">
        {s.back}
      </Link>
    </section>
  );
}
