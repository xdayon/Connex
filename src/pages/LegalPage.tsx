import { useEffect } from "react";
import { strings } from "../i18n/strings";

export function LegalPage({ kind }: { kind: "terms" | "privacy" }) {
  const t = strings.legal;
  const sections = kind === "terms" ? t.termsSections : t.privacySections;
  useEffect(() => {
    document.title = `${t[kind]} · Connex`;
    return () => {
      document.title = "Connex";
    };
  }, [kind, t]);
  return (
    <article>
      <h1 className="font-display text-3xl font-bold tracking-[-0.02em]">{t[kind]}</h1>
      <p className="mt-1 text-sm text-muted">{t.updated}</p>
      <p className="mt-4">{t.intro[kind]}</p>
      {sections.map((s) => (
        <section key={s.title} className="mt-6">
          <h2 className="font-display text-lg font-semibold">{s.title}</h2>
          {s.body.length > 1 ? (
            <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-text/90">
              {s.body.map((b) => (
                <li key={b}>{b.replace("{email}", t.contactEmail)}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-text/90">{s.body[0].replace("{email}", t.contactEmail)}</p>
          )}
        </section>
      ))}
    </article>
  );
}
