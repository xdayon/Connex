import { strings } from "../i18n/strings";
import { cluster } from "./config";
import { ProofError } from "./proofs";

// Texto amigável para cada código de erro das provas.
export function proofErrorText(e: unknown, notAllowed: string = strings.seal.notAllowed): string {
  const text = friendly(e, notAllowed);
  // Na versão de teste, mostra o motivo técnico junto, para diagnóstico.
  if (cluster === "devnet" && e instanceof Error && e.message && e.message !== text) return `${text} (${e.message.slice(0, 120)})`;
  return text;
}

function friendly(e: unknown, notAllowed: string): string {
  const s = strings.seal;
  if (!(e instanceof ProofError)) return s.failed;
  switch (e.code) {
    case "cancelled":
      return s.cancelled;
    case "login":
      return s.login;
    case "not_configured":
      return s.notConfigured;
    case "not_allowed":
      return notAllowed;
    case "expired":
      return strings.presence.expired;
    default:
      return s.failed;
  }
}
