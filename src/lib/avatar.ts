const MAX_BYTES = 2 * 1024 * 1024;
const OUTPUT = 400;

export type PreparedAvatar = { blob: Blob; ext: "webp" | "jpg"; type: string };

// Retângulo de recorte em pixels da imagem original (sempre quadrado).
export type AvatarCrop = { x: number; y: number; size: number };

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

// Decodifica já na orientação certa (EXIF). Falha com formatos que o navegador não lê, como HEIC.
export async function decodeAvatar(file: File): Promise<ImageBitmap> {
  if (!file.type.startsWith("image/")) throw new Error("not an image");
  return createImageBitmap(file, { imageOrientation: "from-image" });
}

export async function renderAvatar(bitmap: ImageBitmap, crop: AvatarCrop): Promise<PreparedAvatar> {
  const canvas = document.createElement("canvas");
  canvas.width = OUTPUT;
  canvas.height = OUTPUT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas unavailable");
  ctx.fillStyle = "#12141e";
  ctx.fillRect(0, 0, OUTPUT, OUTPUT);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, crop.x, crop.y, crop.size, crop.size, 0, 0, OUTPUT, OUTPUT);

  for (const [type, ext] of [
    ["image/webp", "webp"],
    ["image/jpeg", "jpg"],
  ] as const) {
    for (const q of [0.82, 0.7, 0.55, 0.4]) {
      const blob = await toBlob(canvas, type, q);
      if (blob && blob.type === type && blob.size < MAX_BYTES) return { blob, ext, type };
    }
  }
  throw new Error("could not encode image");
}
