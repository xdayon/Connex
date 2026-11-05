import { strings } from "../i18n/strings";

export function LegalPage({ kind }: { kind: "terms" | "privacy" }) {
  return (
    <section>
      <h1 className="font-display text-3xl font-bold tracking-[-0.02em]">{strings.legal[kind]}</h1>
      <p className="mt-1 text-muted">{strings.legal.placeholder}</p>
    </section>
  );
}
