export function normalizeArtworkUrl(url: unknown, size = 512) {
  const raw = String(url || "").trim();
  if (!raw) {
    return "";
  }

  // Apple artwork URLs usually end with /100x100bb.jpg. Keep format and only upscale dimensions.
  return raw.replace(/\/\d+x\d+bb\.(jpg|jpeg|png)(\?.*)?$/i, `/${size}x${size}bb.$1$2`);
}
