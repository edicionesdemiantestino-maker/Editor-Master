import type {
  InpaintProvider,
  InpaintProviderRunInput,
  InpaintRemoteResult,
} from "./inpaint-types";
import {
  replicateCreatePrediction,
  replicateWaitForOutput,
} from "./replicate-http";

function firstOutputUrl(output: unknown): string {
  if (typeof output === "string" && output.startsWith("http")) return output;
  if (Array.isArray(output) && typeof output[0] === "string") {
    return output[0];
  }
  throw new Error("Salida de Replicate inesperada: se esperaba URL o [url].");
}

/**
 * Proveedor concreto: Stable Diffusion Inpainting en Replicate.
 * Los nombres de `input` siguen el esquema público del modelo (image, mask, prompt, …).
 * Si una versión del modelo dejara de aceptar `data:` URLs, subí los PNG a Storage
 * y pasá aquí URLs `https://` (el contrato `InpaintProvider` no cambia).
 *
 * @see https://replicate.com/stability-ai/stable-diffusion-inpainting
 */
export function createReplicateSdInpaintProvider(args: {
  token: string;
  /** Hash de versión del modelo en Replicate (Settings → API / version id). */
  version: string;
}): InpaintProvider {
  const run = async (
    input: InpaintProviderRunInput,
  ): Promise<InpaintRemoteResult> => {
    const prediction = await replicateCreatePrediction({
      token: args.token,
      version: args.version,
      input: {
        image: input.imageDataUrl,
        mask: input.maskDataUrl,
        prompt:
          input.prompt?.trim() ||
          "seamlessly remove the masked region, natural continuation of the scene",
        num_inference_steps: 25,
      },
      preferWaitSeconds: 60,
    });

    let output: unknown = prediction.output;
    if (prediction.status !== "succeeded" || output == null) {
      output = await replicateWaitForOutput({
        token: args.token,
        predictionId: prediction.id,
        pollIntervalMs: 1500,
        maxAttempts: 120,
      });
    }

    return { outputUrl: firstOutputUrl(output) };
  };

  return { id: "replicate-sd-inpaint", run };
}
