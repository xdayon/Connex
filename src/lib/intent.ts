const KEY = "connex.intent";

export type Intent = { path: string };

export function saveIntent(intent: Intent): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(intent));
  } catch {
    // ignore
  }
}

export function peekIntent(): Intent | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as Intent) : null;
    return parsed && typeof parsed.path === "string" && parsed.path.startsWith("/") && !parsed.path.startsWith("//") ? parsed : null;
  } catch {
    return null;
  }
}

export function takeIntent(): Intent | null {
  const intent = peekIntent();
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // ignore
  }
  return intent;
}
