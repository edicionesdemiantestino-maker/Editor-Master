import { describe, expect, it } from "vitest";

import { validateInpaintJsonBody } from "@/app/api/inpaint/validate-inpaint-body";

import { rgbaSquarePngDataUrl } from "../helpers/min-png";

describe("validateInpaintJsonBody", () => {
  it("acepta imagen y máscara del mismo tamaño (≥ mínimo del servidor)", () => {
    const png8 = rgbaSquarePngDataUrl(8);
    const r = validateInpaintJsonBody({
      imageDataUrl: png8,
      maskDataUrl: png8,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.imageDataUrl).toBe(png8);
      expect(r.value.maskDataUrl).toBe(png8);
    }
  });

  it("rechaza si anchos/altos difieren", () => {
    const a = rgbaSquarePngDataUrl(8);
    const b = rgbaSquarePngDataUrl(9);
    const r = validateInpaintJsonBody({
      imageDataUrl: a,
      maskDataUrl: b,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.publicCode).toBe("image_mask_dimension_mismatch");
    }
  });

  it("rechaza JSON que no es objeto", () => {
    const r = validateInpaintJsonBody(null);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.publicCode).toBe("invalid_json_shape");
  });
});
