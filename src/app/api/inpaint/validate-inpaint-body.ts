import { imageSize } from "image-size";

import {
  INPAINT_MAX_EDGE_PX,
  INPAINT_MAX_PROMPT_LENGTH,
} from "./constants";

export type InpaintValidatedPayload = {
  imageDataUrl: string;
  maskDataUrl: string;
  prompt?: string;
};

export type InpaintValidationFailure = {
  ok: false;
  httpStatus: number;
  /** Código estable para el cliente (no detalles internos). */
  publicCode: string;
};

export type InpaintValidationResult =
  | { ok: true; value: InpaintValidatedPayload }
  | InpaintValidationFailure;

const ALLOWED_PREFIXES = [
  "data:image/png;base64,",
  "data:image/jpeg;base64,",
  "data:image/jpg;base64,",
  "data:image/webp;base64,",
] as const;

export function isAllowedImageDataUrl(v: unknown): v is string {
  return (
    typeof v === "string" &&
    ALLOWED_PREFIXES.some((p) => v.startsWith(p)) &&
    v.length > 40
  );
}

function decodeBase64FromDataUrl(dataUrl: string): Buffer {
  const comma = dataUrl.indexOf(",");
  if (comma === -1) {
    throw new Error("invalid_data_url");
  }
  const b64 = dataUrl.slice(comma + 1).replace(/\s/g, "");
  if (!b64) throw new Error("empty_payload");
  return Buffer.from(b64, "base64");
}

function measureImage(buffer: Buffer): { width: number; height: number } {
  try {
    const r = imageSize(buffer);
    if (!r.width || !r.height) throw new Error("unknown_dimensions");
    return { width: r.width, height: r.height };
  } catch {
    throw new Error("invalid_image");
  }
}

function assertMaxEdge(w: number, h: number): void {
  if (w > INPAINT_MAX_EDGE_PX || h > INPAINT_MAX_EDGE_PX) {
    throw new Error("dimensions_too_large");
  }
  if (w < 8 || h < 8) {
    throw new Error("dimensions_too_small");
  }
}

function normalizePrompt(raw: unknown): string | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw !== "string") throw new Error("invalid_prompt_type");
  const t = raw.replace(/\u0000/g, "").trim();
  if (t.length === 0) return undefined;
  if (t.length > INPAINT_MAX_PROMPT_LENGTH) throw new Error("prompt_too_long");
  return t;
}

/**
 * Valida estructura, decodifica buffers y comprueba dimensiones y coincidencia imagen/máscara.
 */
export function validateInpaintJsonBody(body: unknown): InpaintValidationResult {
  if (!body || typeof body !== "object") {
    return { ok: false, httpStatus: 400, publicCode: "invalid_json_shape" };
  }
  const o = body as Record<string, unknown>;
  const imageDataUrl = o.imageDataUrl;
  const maskDataUrl = o.maskDataUrl;

  if (!isAllowedImageDataUrl(imageDataUrl) || !isAllowedImageDataUrl(maskDataUrl)) {
    return {
      ok: false,
      httpStatus: 400,
      publicCode: "invalid_image_data_url",
    };
  }

  try {
    const imgBuf = decodeBase64FromDataUrl(imageDataUrl);
    const maskBuf = decodeBase64FromDataUrl(maskDataUrl);
    const imgDim = measureImage(imgBuf);
    const maskDim = measureImage(maskBuf);
    assertMaxEdge(imgDim.width, imgDim.height);
    assertMaxEdge(maskDim.width, maskDim.height);
    if (imgDim.width !== maskDim.width || imgDim.height !== maskDim.height) {
      return {
        ok: false,
        httpStatus: 400,
        publicCode: "image_mask_dimension_mismatch",
      };
    }
    const prompt = normalizePrompt(o.prompt);
    return {
      ok: true,
      value: { imageDataUrl, maskDataUrl, prompt },
    };
  } catch (e) {
    const code =
      e instanceof Error ? e.message : "validation_failed";
    const map: Record<string, { status: number; public: string }> = {
      invalid_image: { status: 400, public: "invalid_image_binary" },
      invalid_data_url: { status: 400, public: "invalid_image_data_url" },
      empty_payload: { status: 400, public: "empty_image_payload" },
      unknown_dimensions: { status: 400, public: "invalid_image_binary" },
      dimensions_too_large: { status: 400, public: "dimensions_exceed_limit" },
      dimensions_too_small: { status: 400, public: "dimensions_below_minimum" },
      invalid_prompt_type: { status: 400, public: "invalid_prompt" },
      prompt_too_long: { status: 400, public: "prompt_too_long" },
    };
    const m = map[code] ?? { status: 400, public: "validation_failed" };
    return { ok: false, httpStatus: m.status, publicCode: m.public };
  }
}
