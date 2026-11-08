import { renderAvatar, type PreparedAvatar } from "./avatar";

// Biblioteca de avatares prontos, no clima tech do app: robôs com visor (DiceBear "bottts-neutral")
// e glifos geométricos ("shapes" e "identicon"), todos nas cores da marca. Licença CC0. A escolha
// é baixada uma vez e salva no nosso armazenamento como uma foto qualquer, então o perfil não
// depende do DiceBear para aparecer.
export type LibraryAvatar = { style: string; seed: string; params: string };

const SHAPES = "backgroundColor=0a0d16&shape1Color=00f0ff,c77dff&shape2Color=c77dff,00f0ff&shape3Color=e9ecf5";
const IDENT = "backgroundColor=111522&rowColor=00f0ff,c77dff";
const bot = (seed: string, bg: string): LibraryAvatar => ({ style: "bottts-neutral", seed, params: `backgroundColor=${bg}` });

export const AVATAR_LIBRARY: LibraryAvatar[] = [
  bot("bot02", "2a1f3d"),
  bot("bot07", "00f0ff"),
  bot("bot14", "2a1f3d"),
  bot("bot08", "c77dff"),
  bot("bot13", "1b2236"),
  bot("bot15", "00f0ff"),
  bot("bot05", "1b2236"),
  bot("bot20", "c77dff"),
  { style: "shapes", seed: "g1", params: SHAPES },
  { style: "identicon", seed: "g4", params: IDENT },
  { style: "shapes", seed: "g2", params: SHAPES },
  { style: "identicon", seed: "g6", params: IDENT },
];

const BASE = "https://api.dicebear.com/9.x";
const url = (a: LibraryAvatar, format: "svg" | "png", extra = "") =>
  `${BASE}/${a.style}/${format}?seed=${encodeURIComponent(a.seed)}&${a.params}${extra}`;

// Miniatura em SVG (leve e com limite de uso maior no DiceBear).
export function libraryPreviewUrl(a: LibraryAvatar): string {
  return url(a, "svg");
}

// Baixa a versão em PNG e passa pelo mesmo tratamento das fotos (400 px, WebP).
export async function prepareLibraryAvatar(a: LibraryAvatar): Promise<PreparedAvatar> {
  const res = await fetch(url(a, "png", "&size=400"));
  if (!res.ok) throw new Error(`avatar ${res.status}`);
  const bitmap = await createImageBitmap(await res.blob());
  try {
    const size = Math.min(bitmap.width, bitmap.height);
    return await renderAvatar(bitmap, { x: (bitmap.width - size) / 2, y: (bitmap.height - size) / 2, size });
  } finally {
    bitmap.close();
  }
}
