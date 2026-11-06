import { useSyncExternalStore } from "react";

const KEY = "connex.currentEventId";
const EVENT = "connex:current-event";

export function getCurrentEventId(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function setCurrentEventId(id: string | null): void {
  try {
    if (id) localStorage.setItem(KEY, id);
    else localStorage.removeItem(KEY);
  } catch {
    // storage unavailable: the choice just won't persist
  }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

export function useCurrentEventId(): string | null {
  return useSyncExternalStore(subscribe, getCurrentEventId, () => null);
}
