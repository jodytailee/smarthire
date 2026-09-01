// Comprime una imagen en el navegador antes de subirla a Storage.
// Redimensiona al lado máximo indicado y la re-exporta como JPEG.
// Solo toca imágenes rasterizadas; PDFs, GIF, SVG y no-imágenes se devuelven tal cual.
// Si por cualquier motivo falla o no mejora el tamaño, devuelve el archivo original.
export async function comprimirImagen(
  file: File,
  maxDim = 1600,
  quality = 0.7,
): Promise<File> {
  if (!file || !file.type?.startsWith("image/")) return file;
  if (file.type === "image/gif" || file.type === "image/svg+xml") return file;
  if (file.size < 400 * 1024) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const escala = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * escala));
    const height = Math.max(1, Math.round(bitmap.height * escala));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) { bitmap.close?.(); return file; }
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();

    const blob: Blob | null = await new Promise((res) =>
      canvas.toBlob(res, "image/jpeg", quality)
    );
    if (!blob || blob.size >= file.size) return file;

    const nombre = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], nombre, { type: "image/jpeg", lastModified: file.lastModified });
  } catch {
    return file;
  }
}
