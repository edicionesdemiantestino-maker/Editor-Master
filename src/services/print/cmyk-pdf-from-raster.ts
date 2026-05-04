/**
 * Construcción de PDF de prensa con raster en CMYK (Node / sharp + pdfkit).
 * Flujo base: RGB raster → sharp (`flatten` + `toColorspace('cmyk')`) → JPEG CMYK → `pdfkit`.
 *
 * Si `cmykOutputIccPath` apunta a un ICC legible en el host (p. ej. ISO Coated v2),
 * sharp usa `withIccProfile()` para transformar e incrustar ese perfil en el JPEG.
 * Los archivos `.icc` con copyright no se versionan; configurá rutas vía env en el servidor.
 * Ver `docs/COLOR_PIPELINE.md`.
 */

import PDFDocument from "pdfkit";
import sharp from "sharp";

export type BuildCmykPrintPdfArgs = {
  /** PNG o JPEG RGB (buffer). */
  rgbRaster: Buffer;
  /** Ancho del cajón de contenido en puntos PDF (sin sangrado). */
  contentWidthPt: number;
  contentHeightPt: number;
  bleedPt: number;
  drawCropMarks: boolean;
  /**
   * Ruta absoluta legible en disco a perfil ICC CMYK de salida (ISO Coated v2, etc.).
   * sharp solo acepta path string en `withIccProfile`, no buffer.
   */
  cmykOutputIccPath?: string;
};

function strokeCropMarks(
  doc: InstanceType<typeof PDFDocument>,
  bx: number,
  by: number,
  bw: number,
  bh: number,
  bleed: number,
): void {
  const markLen = Math.min(12, Math.max(4, bleed * 0.45));
  doc.save().lineWidth(0.2).strokeColor("black").opacity(1);
  const segments: [number, number, number, number][] = [
    [bx, by, bx - markLen, by],
    [bx, by, bx, by - markLen],
    [bx + bw, by, bx + bw + markLen, by],
    [bx + bw, by, bx + bw, by - markLen],
    [bx, by + bh, bx - markLen, by + bh],
    [bx, by + bh, bx, by + bh + markLen],
    [bx + bw, by + bh, bx + bw + markLen, by + bh],
    [bx + bw, by + bh, bx + bw, by + bh + markLen],
  ];
  for (const [x1, y1, x2, y2] of segments) {
    doc.moveTo(x1, y1).lineTo(x2, y2).stroke();
  }
  doc.restore();
}

async function rgbToCmykJpeg(args: BuildCmykPrintPdfArgs): Promise<Buffer> {
  const flat = sharp(args.rgbRaster)
    .rotate()
    .flatten({ background: { r: 255, g: 255, b: 255 } });

  const jpegOpts = {
    quality: 92,
    chromaSubsampling: "4:4:4" as const,
    mozjpeg: true,
  };

  if (args.cmykOutputIccPath) {
    try {
      return await flat
        .withIccProfile(args.cmykOutputIccPath, { attach: true })
        .jpeg(jpegOpts)
        .toBuffer();
    } catch {
      // Perfil inválido o sharp/libvips sin soporte: degradación controlada.
    }
  }

  return flat.toColorspace("cmyk").jpeg(jpegOpts).toBuffer();
}

/**
 * Convierte RGB → CMYK vía sharp y compone un PDF con pdfkit.
 */
export async function buildCmykPrintPdfBuffer(
  args: BuildCmykPrintPdfArgs,
): Promise<Buffer> {
  const cmykJpeg = await rgbToCmykJpeg(args);

  const pageW = args.contentWidthPt + 2 * args.bleedPt;
  const pageH = args.contentHeightPt + 2 * args.bleedPt;

  const doc = new PDFDocument({
    size: [pageW, pageH],
    margin: 0,
    autoFirstPage: true,
    pdfVersion: "1.6",
  });

  const chunks: Buffer[] = [];
  const finished = new Promise<Buffer>((resolve, reject) => {
    doc.on("data", (c: Buffer) => {
      chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c));
    });
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  doc.image(cmykJpeg, args.bleedPt, args.bleedPt, {
    width: args.contentWidthPt,
    height: args.contentHeightPt,
  });

  if (args.drawCropMarks) {
    strokeCropMarks(
      doc,
      args.bleedPt,
      args.bleedPt,
      args.contentWidthPt,
      args.contentHeightPt,
      args.bleedPt,
    );
  }

  doc.end();
  return finished;
}
