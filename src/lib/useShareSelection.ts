import { useCallback, useMemo, useState } from "react";
import { LINK_KEYS, SHARE_KEYS, type Profile, type ShareKey } from "./types";

export function availableKeys(profile: Profile | null): ShareKey[] {
  if (!profile) return [];
  const keys: ShareKey[] = LINK_KEYS.filter((k) => !!profile.links?.[k]);
  if (profile.wallet) keys.push("wallet");
  return keys;
}

export type ShareSelection = {
  available: ShareKey[];
  selected: ShareKey[];
  isCustom: boolean;
  payload: ShareKey[] | null;
  toggle: (k: ShareKey, on: boolean) => void;
  reset: () => void;
};

export function useShareSelection(profile: Profile | null): ShareSelection {
  const links = profile?.links;
  const wallet = profile?.wallet;
  const hiddenKey = (profile?.share_hidden ?? []).join(",");
  const available = useMemo(
    () => availableKeys(profile),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [links, wallet],
  );
  const defaults = useMemo(() => {
    const hidden = new Set(hiddenKey ? hiddenKey.split(",") : []);
    return available.filter((k) => !hidden.has(k));
  }, [available, hiddenKey]);
  const [override, setOverride] = useState<ShareKey[] | null>(null);

  const selected = useMemo(() => {
    const base = override ?? defaults;
    const set = new Set(base);
    return SHARE_KEYS.filter((k) => set.has(k) && available.includes(k));
  }, [override, defaults, available]);

  const isCustom = useMemo(
    () => selected.length !== defaults.length || selected.some((k) => !defaults.includes(k)),
    [selected, defaults],
  );
  const payload = isCustom ? selected : null;

  const toggle = useCallback(
    (k: ShareKey, on: boolean) => {
      const cur = new Set(override ?? defaults);
      if (on) cur.add(k);
      else cur.delete(k);
      setOverride([...cur]);
    },
    [override, defaults],
  );
  const reset = useCallback(() => setOverride(null), []);

  return { available, selected, isCustom, payload, toggle, reset };
}
