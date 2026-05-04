"use client";

import type { FabricImage } from "fabric";

import type { ImageElement } from "@/entities/editor/document-schema";
import type { InpaintSceneRect } from "@/services/inpaint/inpaint-types";

import { intersectSceneRects } from "./geometry";
import { requestInpaintFromApi } from "./inpaint-api-client";
import {
  buildBinaryMaskPngDataUrl,
  fetchHttpsToPngDataUrl,
  rasterizeImageElementToPngDataUrl,
} from "./raster";
import { sceneRectToImagePixelRoi } from "./scene-rect-to-image-roi";

export async function runMagicEraseForSelectedImage(args: {
  fabricImage: FabricImage;
  model: ImageElement;
  sceneRect: InpaintSceneRect;
  prompt?: string;
}): Promise<{ dataUrl: string; width: number; height: number }> {
  const { fabricImage, model, sceneRect, prompt } = args;

  const bounds = fabricImage.getBoundingRect();
  const inter = intersectSceneRects(sceneRect, bounds);
  if (!inter) {
    throw new Error("La selección no intersecta la imagen.");
  }

  const nw = model.naturalWidth;
  const nh = model.naturalHeight;
  const roi = sceneRectToImagePixelRoi(fabricImage, inter, nw, nh);

  const imageDataUrl = await rasterizeImageElementToPngDataUrl(model);
  const maskDataUrl = buildBinaryMaskPngDataUrl(nw, nh, roi);

  const { outputUrl } = await requestInpaintFromApi({
    imageDataUrl,
    maskDataUrl,
    prompt,
  });

  return fetchHttpsToPngDataUrl(outputUrl);
}
