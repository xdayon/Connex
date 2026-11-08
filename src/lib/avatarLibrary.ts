import { renderAvatar, type PreparedAvatar } from "./avatar";

// Biblioteca de avatares prontos: DiceBear "notionists" (licença CC0), o mesmo traço das
// ilustrações do app. A escolha é baixada uma vez e salva no nosso armazenamento como uma foto
// qualquer, então o perfil não depende do DiceBear para aparecer.
export type LibraryAvatar = { seed: string; bg: string };

export const AVATAR_LIBRARY: LibraryAvatar[] = [
  { seed: "conneX-03", bg: "d1d4f9" },
  { seed: "conneX-04", bg: "ffd5dc" },
  { seed: "conneX-05", bg: "ffdfbf" },
  { seed: "conneX-06", bg: "c1f4e8" },
  { seed: "conneX-07", bg: "b6e3f4" },
  { seed: "conneX-09", bg: "c0aede" },
  { seed: "conneX-10", bg: "ffd5dc" },
  { seed: "conneX-11", bg: "ffdfbf" },
  { seed: "conneX-12", bg: "c1f4e8" },
  { seed: "conneX-14", bg: "c0aede" },
  { seed: "conneX-15", bg: "b6e3f4" },
  { seed: "conneX-16", bg: "d1d4f9" },
];

const BASE = "https://api.dicebear.com/9.x/notionists";

// Miniatura em SVG (leve e com limite de uso maior no DiceBear).
export function libraryPreviewUrl(a: LibraryAvatar): string {
  return `${BASE}/svg?seed=${encodeURIComponent(a.seed)}&backgroundColor=${a.bg}`;
}

// Baixa a versão em PNG e passa pelo mesmo tratamento das fotos (400 px, WebP).
export async function prepareLibraryAvatar(a: LibraryAvatar): Promise<PreparedAvatar> {
  const res = await fetch(`${BASE}/png?seed=${encodeURIComponent(a.seed)}&size=400&backgroundColor=${a.bg}`);
  if (!res.ok) throw new Error(`avatar ${res.status}`);
  const bitmap = await createImageBitmap(await res.blob());
  try {
    const size = Math.min(bitmap.width, bitmap.height);
    return await renderAvatar(bitmap, { x: (bitmap.width - size) / 2, y: (bitmap.height - size) / 2, size });
  } finally {
    bitmap.close();
  }
}
