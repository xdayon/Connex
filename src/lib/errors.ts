import { strings } from "../i18n/strings";

type ErrLike = { message?: string; code?: string; name?: string; status?: number };

export function errorCode(err: unknown): string {
  return typeof err === "object" && err && "code" in err ? String((err as ErrLike).code ?? "") : "";
}

export function friendlyError(err: unknown): string {
  const e = (typeof err === "object" && err ? err : {}) as ErrLike;
  const msg = (e.message ?? (typeof err === "string" ? err : "")).toLowerCase();
  const m = strings.errors;
  if (msg.includes("profile required")) return m.profileRequired;
  if (msg.includes("profile not found")) return m.profileNotFound;
  if (msg.includes("yourself")) return m.self;
  if (msg.includes("qr expired")) return m.qrExpired;
  if (msg.includes("invalid qr")) return m.invalidQr;
  if (msg.includes("too many events")) return m.tooManyEvents;
  if (msg.includes("event not found")) return m.eventNotFound;
  if (msg.includes("not authenticated") || msg.includes("jwt")) return m.notSignedIn;
  if (e.code === "PGRST202" || e.code === "42883" || msg.includes("could not find the function")) return m.unavailable;
  if (msg.includes("failed to fetch") || msg.includes("networkerror") || msg.includes("load failed") || e.name === "AuthRetryableFetchError") {
    return m.offline;
  }
  return m.generic;
}

export function isMessage(err: unknown, text: string): boolean {
  const msg = typeof err === "object" && err && "message" in err ? String((err as ErrLike).message ?? "") : "";
  return msg.toLowerCase().includes(text);
}
