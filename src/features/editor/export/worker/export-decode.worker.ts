/// <reference lib="webworker" />

type InMsg = { id: number; b64: string };
type OutOk = { id: number; buffer: ArrayBuffer };
type OutErr = { id: number; error: string };

/**
 * Decodifica base64 → Uint8Array fuera del hilo UI (payloads grandes de export).
 */
self.onmessage = (ev: MessageEvent<InMsg>) => {
  const { id, b64 } = ev.data;
  try {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) {
      bytes[i] = bin.charCodeAt(i);
    }
    const ab = bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength,
    ) as ArrayBuffer;
    const msg: OutOk = { id, buffer: ab };
    (self as DedicatedWorkerGlobalScope).postMessage(msg, [ab]);
  } catch (e) {
    const msg: OutErr = {
      id,
      error: e instanceof Error ? e.message : "decode_error",
    };
    (self as DedicatedWorkerGlobalScope).postMessage(msg);
  }
};

export {};
