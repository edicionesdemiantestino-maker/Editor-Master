export function getReplicateApiToken(): string | undefined {
  return process.env.REPLICATE_API_TOKEN;
}

/** ID de versión del modelo (no el slug `owner/name`). */
export function getReplicateInpaintVersion(): string | undefined {
  return process.env.REPLICATE_INPAINT_VERSION;
}

export function isReplicateInpaintConfigured(): boolean {
  return Boolean(getReplicateApiToken() && getReplicateInpaintVersion());
}
