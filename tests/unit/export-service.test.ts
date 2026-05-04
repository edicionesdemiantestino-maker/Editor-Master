import { JSDOM } from "jsdom";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Canvas } from "fabric";

import type { EditorDocument } from "@/entities/editor/document-schema";
import { createEmptyDocument } from "@/entities/editor/defaults";
import {
  clampExportMultiplier,
  DEFAULT_EXPORT_FORM,
  type ExportFormState,
} from "@/features/editor/export/export-types";
import { executeExportDownload } from "@/features/editor/export/services/export-service";
import {
  buildExportFileName,
  sanitizeExportBaseName,
} from "@/features/editor/export/services/export-filename";
import {
  captureFabricRasterDataUrl,
  dataUrlToUint8Array,
  flattenPngDataUrlOnBackground,
  readRasterDataUrlSize,
} from "@/features/editor/export/services/fabric-raster-capture";
import {
  buildPrintProfileRgbPdf,
  buildStandardRgbPdf,
} from "@/features/editor/export/services/pdf-export";
import { requestPrintCmykPdfDownload } from "@/features/editor/export/services/print-export-client";

vi.mock("@/features/editor/export/services/fabric-raster-capture", () => ({
  captureFabricRasterDataUrl: vi.fn(() => "data:image/png;base64,QUJD"),
  dataUrlToUint8Array: vi.fn(() => new Uint8Array([1, 2, 3])),
  flattenPngDataUrlOnBackground: vi.fn(async (u: string) => `flat:${u}`),
  readRasterDataUrlSize: vi.fn(async () => ({ width: 100, height: 80 })),
}));

vi.mock("@/features/editor/export/services/pdf-export", () => ({
  buildStandardRgbPdf: vi.fn(async () => new Uint8Array([37, 80, 68, 70])),
  buildPrintProfileRgbPdf: vi.fn(async () => new Uint8Array([37, 80, 68, 70, 2])),
}));

vi.mock("@/features/editor/export/services/export-pipeline", () => ({
  yieldToMain: vi.fn().mockResolvedValue(undefined),
  decodeRasterForExport: vi.fn(async (dataUrl: string) => {
    const { dataUrlToUint8Array } = await import(
      "@/features/editor/export/services/fabric-raster-capture"
    );
    return dataUrlToUint8Array(dataUrl);
  }),
}));

vi.mock("@/features/editor/export/services/print-export-client", () => ({
  requestPrintCmykPdfDownload: vi.fn().mockResolvedValue({
    blob: new Blob([9, 9, 9]),
    filename: "mock-cmyk.pdf",
  }),
}));

let jsdomInstance: JSDOM | null = null;

beforeAll(() => {
  jsdomInstance = new JSDOM("<!DOCTYPE html><html><body></body></html>", {
    url: "http://localhost/",
  });
  const w = jsdomInstance.window;
  const g = globalThis as typeof globalThis & {
    window: Window;
    document: Document;
  };
  g.window = w as unknown as Window;
  g.document = w.document;
});

afterAll(() => {
  jsdomInstance?.window.close();
  jsdomInstance = null;
  const g = globalThis as Record<string, unknown>;
  delete g.window;
  delete g.document;
});

function mockCanvas(): Canvas {
  return {
    getActiveObject: vi.fn().mockReturnValue(undefined),
    discardActiveObject: vi.fn(),
    setActiveObject: vi.fn(),
    requestRenderAll: vi.fn(),
    renderAll: vi.fn(),
    toDataURL: vi.fn().mockReturnValue("data:image/png;base64,QUJD"),
  } as unknown as Canvas;
}

function baseDoc(): EditorDocument {
  const d = createEmptyDocument("p1");
  d.meta.title = "Mi export";
  d.canvas.width = 1080;
  d.canvas.height = 1350;
  d.canvas.backgroundColor = "#f0f0f0";
  return d;
}

function stubAnchorDownloads() {
  const anchors: Array<{ download: string; href: string }> = [];
  const origCreate = document.createElement.bind(document);
  vi.spyOn(document, "createElement").mockImplementation((tag) => {
    if (tag === "a") {
      const a = {
        download: "",
        href: "",
        rel: "",
        click: vi.fn(),
        remove: vi.fn(),
      };
      anchors.push(a);
      return a as unknown as HTMLAnchorElement;
    }
    return origCreate(tag as keyof HTMLElementTagNameMap);
  });
  vi.spyOn(document.body, "appendChild").mockImplementation(() => null);
  vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:mock-url");
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
  return anchors;
}

describe("executeExportDownload", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.mocked(captureFabricRasterDataUrl).mockClear();
    vi.mocked(flattenPngDataUrlOnBackground).mockClear();
    vi.mocked(dataUrlToUint8Array).mockClear();
    vi.mocked(readRasterDataUrlSize).mockClear();
    vi.mocked(buildStandardRgbPdf).mockClear();
    vi.mocked(buildPrintProfileRgbPdf).mockClear();
  });

  it("PNG con transparencia: captura y descarga sin aplanar", async () => {
    const anchors = stubAnchorDownloads();
    const canvas = mockCanvas();
    const form: ExportFormState = {
      ...DEFAULT_EXPORT_FORM,
      format: "png",
      pngPreserveTransparency: true,
      scale: 2,
    };

    await executeExportDownload({
      canvas,
      document: baseDoc(),
      form,
    });

    expect(captureFabricRasterDataUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        format: "png",
        multiplier: 2,
      }),
    );
    expect(flattenPngDataUrlOnBackground).not.toHaveBeenCalled();
    expect(anchors).toHaveLength(1);
    expect(anchors[0]!.download).toMatch(/Mi-export-2x\.png$/i);
    expect(anchors[0]!.href).toContain("data:image/png");
  });

  it("PNG sin transparencia: aplica flatten sobre el color de fondo", async () => {
    stubAnchorDownloads();
    const canvas = mockCanvas();
    const form: ExportFormState = {
      ...DEFAULT_EXPORT_FORM,
      format: "png",
      pngPreserveTransparency: false,
      scale: 1,
    };

    await executeExportDownload({
      canvas,
      document: baseDoc(),
      form,
    });

    expect(flattenPngDataUrlOnBackground).toHaveBeenCalledWith(
      "data:image/png;base64,QUJD",
      "#f0f0f0",
    );
  });

  it("JPEG: captura con calidad y extensión .jpg", async () => {
    const anchors = stubAnchorDownloads();
    const canvas = mockCanvas();
    const form: ExportFormState = {
      ...DEFAULT_EXPORT_FORM,
      format: "jpeg",
      jpegQuality: 0.88,
      scale: 3,
    };

    await executeExportDownload({ canvas, document: baseDoc(), form });

    expect(captureFabricRasterDataUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        format: "jpeg",
        jpegQuality: 0.88,
        multiplier: 3,
      }),
    );
    expect(anchors[0]!.download).toMatch(/\.jpg$/i);
  });

  it("PDF RGB: genera PDF estándar y descarga blob", async () => {
    stubAnchorDownloads();
    const canvas = mockCanvas();
    const form: ExportFormState = {
      ...DEFAULT_EXPORT_FORM,
      format: "pdf-rgb",
      pdfRasterEncoding: "png-lossless",
      scale: 2,
    };

    await executeExportDownload({ canvas, document: baseDoc(), form });

    expect(dataUrlToUint8Array).toHaveBeenCalled();
    expect(buildStandardRgbPdf).toHaveBeenCalledWith(
      expect.objectContaining({
        pageSizePt: { width: 1080, height: 1350 },
        rasterIsPng: true,
      }),
    );
  });

  it("PDF impresión: PDF de perfil, manifiesto JSON y lectura de tamaño intrínseco", async () => {
    const anchors = stubAnchorDownloads();
    const canvas = mockCanvas();
    const form: ExportFormState = {
      ...DEFAULT_EXPORT_FORM,
      format: "pdf-print",
      bleedMm: 3,
      pdfRasterEncoding: "jpeg-high",
      scale: 2,
    };

    await executeExportDownload({ canvas, document: baseDoc(), form });

    expect(buildPrintProfileRgbPdf).toHaveBeenCalled();
    expect(readRasterDataUrlSize).toHaveBeenCalled();
    expect(anchors).toHaveLength(2);
    expect(anchors[0]!.download).toMatch(/print\.pdf$/i);
    expect(anchors[1]!.download).toMatch(/print-job\.json$/i);
  });

  it("PDF impresión + CMYK servidor: llama al cliente de API cuando está activado", async () => {
    vi.mocked(requestPrintCmykPdfDownload).mockClear();
    const anchors = stubAnchorDownloads();
    const canvas = mockCanvas();
    const form: ExportFormState = {
      ...DEFAULT_EXPORT_FORM,
      format: "pdf-print",
      requestServerCmykPdf: true,
      drawPrintCropMarks: true,
      bleedMm: 3,
      pdfRasterEncoding: "png-lossless",
      scale: 2,
    };
    await executeExportDownload({ canvas, document: baseDoc(), form });
    expect(requestPrintCmykPdfDownload).toHaveBeenCalledWith(
      expect.objectContaining({
        bleedMm: 3,
        drawCropMarks: true,
        targetDpi: 300,
      }),
    );
    expect(anchors.length).toBeGreaterThanOrEqual(2);
  });

  it("withFabricExportSession restaura selección previa si existía", async () => {
    const active = { type: "mock" };
    const canvas = {
      ...mockCanvas(),
      getActiveObject: vi.fn().mockReturnValue(active),
      discardActiveObject: vi.fn(),
      setActiveObject: vi.fn(),
    } as unknown as Canvas;

    stubAnchorDownloads();
    const form: ExportFormState = { ...DEFAULT_EXPORT_FORM, format: "png" };
    await executeExportDownload({ canvas, document: baseDoc(), form });

    expect(canvas.discardActiveObject).toHaveBeenCalled();
    expect(canvas.setActiveObject).toHaveBeenCalledWith(active);
  });
});

describe("export-service helpers (puros)", () => {
  it("sanitizeExportBaseName y buildExportFileName", () => {
    expect(sanitizeExportBaseName("  Mi|diseño  ", "fb")).toBe("Mi_diseño");
    expect(buildExportFileName({ base: "x", scale: 2, ext: "png" })).toBe(
      "x-2x.png",
    );
  });

  it("clampExportMultiplier", () => {
    expect(clampExportMultiplier(0.1)).toBe(0.5);
    expect(clampExportMultiplier(9)).toBe(8);
  });
});
