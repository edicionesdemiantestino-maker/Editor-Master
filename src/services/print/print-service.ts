/**
 * Capa de servicio de impresión (CMYK, PDF prensa).
 * Mantener imports de Node (sharp, pdfkit) solo desde API routes o este módulo,
 * nunca desde componentes cliente.
 */

export { buildCmykPrintPdfBuffer } from "./cmyk-pdf-from-raster";
export type { BuildCmykPrintPdfArgs } from "./cmyk-pdf-from-raster";
