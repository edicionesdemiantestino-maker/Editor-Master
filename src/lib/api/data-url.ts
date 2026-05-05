const DEFAULT_MAX_DECODED_BYTES = 10 * 1024 * 1024;

const BASE64_RE = /^[A-Za-z0-9+/]+={0,2}$/;

export type DecodeDataUrlOptions = {
  maxDecodedBytes?: number;
};

export function estimateDecodedBytesFromBase64Length(base64Length: number): number {
  if (!Number.isFinite(base64Length) || base64Length <= 0) return 0;
  // Base64 encodes 3 bytes into 4 chars (+ padding). Worst-case padding is 2 chars.
  return Math.floor((base64Length * 3) / 4);
}

export function extractBase64FromDataUrl(dataUrl: string): {
  mime: string;
  base64: string;
} {
  const comma = dataUrl.indexOf(",");
  if (comma === -1) throw new Error("invalid_data_url");
  const header = dataUrl.slice(0, comma);
  const payload = dataUrl.slice(comma + 1).replace(/\s/g, "");
  if (!payload) throw new Error("empty_payload");

  // data:image/png;base64
  const m = /^data:([^;]+);base64$/i.exec(header);
  if (!m?.[1]) throw new Error("invalid_data_url");
  return { mime: m[1].toLowerCase(), base64: payload };
}

export function decodeBase64DataUrlToBuffer(
  dataUrl: string,
  options?: DecodeDataUrlOptions,
): Buffer {
  const { base64 } = extractBase64FromDataUrl(dataUrl);
  const maxDecodedBytes = options?.maxDecodedBytes ?? DEFAULT_MAX_DECODED_BYTES;

  const estimated = estimateDecodedBytesFromBase64Length(base64.length);
  if (estimated > maxDecodedBytes) {
    throw new Error("payload_too_large");
  }

  // Quick sanity check (avoid Buffer.from on obviously invalid characters).
  if (!BASE64_RE.test(base64)) {
    throw new Error("invalid_base64");
  }

  const buf = Buffer.from(base64, "base64");
  if (buf.length > maxDecodedBytes) {
    throw new Error("payload_too_large");
  }
  if (buf.length === 0) {
    throw new Error("empty_payload");
  }
  return buf;
}

export function redactDataUrl(dataUrl: string): string {
  try {
    const comma = dataUrl.indexOf(",");
    if (comma === -1) return "<invalid-data-url>";
    const header = dataUrl.slice(0, comma);
    const payloadLen = Math.max(0, dataUrl.length - comma - 1);
    return `${header},<redacted:${payloadLen}chars>`;
  } catch {
    return "<unredactable-data-url>";
  }
}

