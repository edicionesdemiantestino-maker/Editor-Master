import type { Canvas } from "fabric";

import type { EditorDocument } from "@/entities/editor/document-schema";

import type { ExportFormState } from "../export-types";
import { clampExportMultiplier } from "../export-types";

import { withFabricExportSession } from "./canvas-export-session";
import {
  captureFabricRasterDataUrl,
  flattenPngDataUrlOnBackground,
  readRasterDataUrlSize,
} from "./fabric-raster-capture";
import { buildExportFileName, sanitizeExportBaseName } from "./export-filename";
import { decodeRasterForExport, yieldToMain } from "./export-pipeline";
import { buildPrintJobPayloadV1 } from "./print-job-payload";
import { requestPrintCmykPdfDownload } from "./print-export-client";
import { buildPrintProfileRgbPdf, buildStandardRgbPdf } from "./pdf-export";

function mmToPt(mm: number): number {
  return (mm * 72) / 25.4;
}

function triggerDownloadDataUrl(dataUrl: string, filename: string): void {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function uint8ArrayToArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
}

function triggerDownloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Orquesta exportación completa: sesión limpia en Fabric, raster con `multiplier`,
 * descarga(s) según formato (PDF imprime también el manifiesto JSON para backend CMYK).
 *
 * Entre pasos pesados se llama `yieldToMain` para reducir bloqueos del hilo UI.
 * La decodificación base64 grande puede delegarse a un Web Worker vía `decodeRasterForExport`.
 */
export async function executeExportDownload(args: {
  canvas: Canvas;
  document: EditorDocument;
  form: ExportFormState;
}): Promise<void> {
  const { canvas, document: doc, form } = args;
  const multiplier = clampExportMultiplier(form.scale);
  const base = sanitizeExportBaseName(doc.meta.title, "diseno");
  const bg = doc.canvas.backgroundColor || "#ffffff";
  const lw = doc.canvas.width;
  const lh = doc.canvas.height;

  await withFabricExportSession(canvas, async () => {
    switch (form.format) {
      case "png": {
        let dataUrl = captureFabricRasterDataUrl({
          canvas,
          multiplier,
          format: "png",
          logicalWidthPx: lw,
          logicalHeightPx: lh,
        });
        await yieldToMain();
        if (!form.pngPreserveTransparency) {
          dataUrl = await flattenPngDataUrlOnBackground(dataUrl, bg);
          await yieldToMain();
        }
        triggerDownloadDataUrl(
          dataUrl,
          buildExportFileName({ base, scale: multiplier, ext: "png" }),
        );
        return;
      }
      case "jpeg": {
        const dataUrl = captureFabricRasterDataUrl({
          canvas,
          multiplier,
          format: "jpeg",
          jpegQuality: form.jpegQuality,
          logicalWidthPx: lw,
          logicalHeightPx: lh,
        });
        await yieldToMain();
        triggerDownloadDataUrl(
          dataUrl,
          buildExportFileName({ base, scale: multiplier, ext: "jpg" }),
        );
        return;
      }
      case "pdf-rgb": {
        const usePng = form.pdfRasterEncoding === "png-lossless";
        const dataUrl = captureFabricRasterDataUrl({
          canvas,
          multiplier,
          format: usePng ? "png" : "jpeg",
          jpegQuality: form.jpegQuality,
          logicalWidthPx: lw,
          logicalHeightPx: lh,
        });
        await yieldToMain();
        const bytes = await decodeRasterForExport(dataUrl);
        await yieldToMain();
        const pdfBytes = await buildStandardRgbPdf({
          pageSizePt: { width: lw, height: lh },
          title: doc.meta.title,
          rasterBytes: bytes,
          rasterIsPng: usePng,
          keywords: ["EditorMaestro", "rgb-screen", `scale-${multiplier}x`],
        });
        await yieldToMain();
        triggerDownloadBlob(
          new Blob([uint8ArrayToArrayBuffer(pdfBytes)], {
            type: "application/pdf",
          }),
          buildExportFileName({ base, scale: multiplier, ext: "pdf" }),
        );
        return;
      }
      case "pdf-print": {
        const usePng = form.pdfRasterEncoding === "png-lossless";
        const dataUrl = captureFabricRasterDataUrl({
          canvas,
          multiplier,
          format: usePng ? "png" : "jpeg",
          jpegQuality: form.jpegQuality,
          logicalWidthPx: lw,
          logicalHeightPx: lh,
        });
        await yieldToMain();
        const bleedPt = mmToPt(form.bleedMm);
        const bytes = await decodeRasterForExport(dataUrl);
        await yieldToMain();
        const pdfBytes = await buildPrintProfileRgbPdf({
          pageSizePt: { width: lw, height: lh },
          title: doc.meta.title,
          rasterBytes: bytes,
          rasterIsPng: usePng,
          bleedPt,
        });

        const intrinsic = await readRasterDataUrlSize(dataUrl);
        await yieldToMain();
        const job = buildPrintJobPayloadV1({
          document: doc,
          scale: form.scale,
          bleedMm: form.bleedMm,
          pageSizePt: {
            width: lw + 2 * bleedPt,
            height: lh + 2 * bleedPt,
          },
          contentBoxPt: { width: lw, height: lh },
          contentOriginPt: { x: bleedPt, y: bleedPt },
          rasterEncoding: usePng ? "image/png" : "image/jpeg",
          intrinsicPx: intrinsic,
        });

        const slug = base.replace(/\s+/g, "-");
        triggerDownloadBlob(
          new Blob([uint8ArrayToArrayBuffer(pdfBytes)], {
            type: "application/pdf",
          }),
          `${slug}-${multiplier}x-print.pdf`,
        );
        await yieldToMain();
        triggerDownloadBlob(
          new Blob([JSON.stringify(job, null, 2)], {
            type: "application/json",
          }),
          `${slug}-${multiplier}x-print-job.json`,
        );

        if (form.requestServerCmykPdf) {
          await yieldToMain();
          const { blob, filename } = await requestPrintCmykPdfDownload({
            imageDataUrl: dataUrl,
            bleedMm: form.bleedMm,
            title: doc.meta.title,
            drawCropMarks: form.drawPrintCropMarks,
            targetDpi: 300,
          });
          await yieldToMain();
          triggerDownloadBlob(blob, filename);
        }
        return;
      }
    }
  });
}
