import { PDFDocument, PDFImage, PDFPage, rgb } from "pdf-lib";

export type PdfStandardRgbBuildArgs = {
  /** Tamaño de página en puntos (= cajón lógico del diseño). */
  pageSizePt: { width: number; height: number };
  title: string;
  subject?: string;
  keywords?: string[];
  rasterBytes: Uint8Array;
  rasterIsPng: boolean;
};

export type PdfPrintBuildArgs = PdfStandardRgbBuildArgs & {
  bleedPt: number;
};

function drawRasterOnPage(args: {
  page: PDFPage;
  embedded: PDFImage;
  drawX: number;
  drawY: number;
  drawW: number;
  drawH: number;
}): void {
  const { page, embedded, drawX, drawY, drawW, drawH } = args;
  page.drawImage(embedded, {
    x: drawX,
    y: drawY,
    width: drawW,
    height: drawH,
  });
}

/**
 * PDF RGB estándar: una página, fondo blanco, imagen a tamaño lógico en puntos.
 */
export async function buildStandardRgbPdf(
  args: PdfStandardRgbBuildArgs,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(args.title);
  pdf.setAuthor("Editor Maestro");
  pdf.setCreator("Editor Maestro");
  pdf.setProducer("Editor Maestro / pdf-lib");
  if (args.subject) pdf.setSubject(args.subject);
  if (args.keywords?.length) pdf.setKeywords(args.keywords);

  const page = pdf.addPage([args.pageSizePt.width, args.pageSizePt.height]);
  const pw = page.getWidth();
  const ph = page.getHeight();

  page.drawRectangle({
    x: 0,
    y: 0,
    width: pw,
    height: ph,
    color: rgb(1, 1, 1),
  });

  const embedded = args.rasterIsPng
    ? await pdf.embedPng(args.rasterBytes)
    : await pdf.embedJpg(args.rasterBytes);

  drawRasterOnPage({
    page,
    embedded,
    drawX: 0,
    drawY: 0,
    drawW: pw,
    drawH: ph,
  });

  return pdf.save();
}

/**
 * PDF “prensa”: página con sangrado, cajón lógico centrado, listo para pipeline CMYK externo.
 */
export async function buildPrintProfileRgbPdf(
  args: PdfPrintBuildArgs,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`${args.title} (print)`);
  pdf.setAuthor("Editor Maestro");
  pdf.setCreator("Editor Maestro");
  pdf.setProducer("Editor Maestro / pdf-lib");
  pdf.setSubject(
    args.subject ??
      "RGB preliminar — conversión CMYK y perfiles ICC deben aplicarse en backend.",
  );
  pdf.setKeywords([
    "EditorMaestro",
    "print-profile",
    "rgb-source",
    "cmyk-pending",
    ...(args.keywords ?? []),
  ]);

  const { width: lw, height: lh } = args.pageSizePt;
  const b = args.bleedPt;
  const pageW = lw + 2 * b;
  const pageH = lh + 2 * b;

  const page = pdf.addPage([pageW, pageH]);

  page.drawRectangle({
    x: 0,
    y: 0,
    width: pageW,
    height: pageH,
    color: rgb(1, 1, 1),
  });

  const embedded = args.rasterIsPng
    ? await pdf.embedPng(args.rasterBytes)
    : await pdf.embedJpg(args.rasterBytes);

  const drawX = b;
  const drawY = b;

  drawRasterOnPage({
    page,
    embedded,
    drawX,
    drawY,
    drawW: lw,
    drawH: lh,
  });

  return pdf.save();
}
