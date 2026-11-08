import { strings } from "../i18n/strings";
import { isHandleKey, linkDisplayValue, normalizeLink } from "./links";
import { LINK_KEYS, type LinkKey, type Links } from "./types";

export type LinkValues = Record<LinkKey, string>;

// Valores dos campos a partir do que está salvo: só o handle nas redes de usuário.
export function linkValuesFrom(links: Links | null | undefined): LinkValues {
  return Object.fromEntries(LINK_KEYS.map((k) => [k, linkDisplayValue(k, links?.[k])])) as LinkValues;
}

export function linkErrorText(key: LinkKey): string {
  return isHandleKey(key) ? strings.me.linkInvalidHandle(strings.me.linkLabels[key]) : strings.me.linkInvalid;
}

// Converte os campos em URLs canônicas; devolve os erros por rede.
export function normalizeAll(values: LinkValues): { out: Links; errors: Partial<Record<LinkKey, string>> } {
  const out: Links = {};
  const errors: Partial<Record<LinkKey, string>> = {};
  for (const k of LINK_KEYS) {
    const r = normalizeLink(k, values[k]);
    if (!r.ok) errors[k] = linkErrorText(k);
    else if (r.value) out[k] = r.value;
  }
  return { out, errors };
}
