const INVALID_CHARS = /[<>:"/\\|?*\u0000-\u001f]/g;

export function sanitizeExportBaseName(title: string, fallback: string): string {
  const raw = title.trim() || fallback;
  const cleaned = raw.replace(INVALID_CHARS, "_").replace(/\s+/g, " ").trim();
  return cleaned.length > 0 ? cleaned.slice(0, 120) : fallback;
}

export function buildExportFileName(args: {
  base: string;
  scale: number;
  ext: "png" | "jpg" | "pdf" | "json";
}): string {
  const scaleLabel = Number.isInteger(args.scale)
    ? `${args.scale}x`
    : `${args.scale.toFixed(2)}x`;
  const safeBase = args.base.replace(/\s/g, "-");
  return `${safeBase}-${scaleLabel}.${args.ext}`;
}
