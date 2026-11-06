const MAX_BYTES = 2 * 1024 * 1024;

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

export async function prepareAvatar(file: File): Promise<{ blob: Blob; ext: "webp" | "jpg"; type: string }> {
  if (!file.type.startsWith("image/")) throw new Error("not an image");
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas unavailable");
  ctx.fillStyle = "#07090f";
  ctx.fillRect(0, 0, 512, 512);
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, 512, 512);
  bitmap.close();

  for (const [type, ext] of [
    ["image/webp", "webp"],
    ["image/jpeg", "jpg"],
  ] as const) {
    for (const q of [0.9, 0.8, 0.65, 0.5]) {
      const blob = await toBlob(canvas, type, q);
      if (blob && blob.type === type && blob.size < MAX_BYTES) return { blob, ext, type };
    }
  }
  throw new Error("could not encode image");
}
