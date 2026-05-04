import { yieldToMain } from "@/lib/scheduling/yield-to-main";

import { decodeDataUrlToBytesViaWorkerIfLarge } from "./export-worker-bridge";

export { yieldToMain } from "@/lib/scheduling/yield-to-main";

/**
 * Decodifica raster para PDF u operaciones posteriores, con yield previo y worker opcional.
 */
export async function decodeRasterForExport(dataUrl: string): Promise<Uint8Array> {
  await yieldToMain();
  return decodeDataUrlToBytesViaWorkerIfLarge(dataUrl);
}
