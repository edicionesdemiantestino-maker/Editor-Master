import { dataUrlToUint8Array } from "./fabric-raster-capture";

type DecodeResult = { id: number; buffer?: ArrayBuffer; error?: string };

const pending = new Map<
  number,
  { resolve: (v: Uint8Array) => void; reject: (e: Error) => void }
>();

let worker: Worker | null = null;
let seq = 0;

function attachWorkerHandlers(w: Worker): void {
  w.onmessage = (ev: MessageEvent<DecodeResult>) => {
    const { id, buffer, error } = ev.data;
    const p = pending.get(id);
    if (!p) return;
    pending.delete(id);
    if (error || !buffer) {
      p.reject(new Error(error || "decode_worker"));
      return;
    }
    p.resolve(new Uint8Array(buffer));
  };
  w.onerror = () => {
    for (const [, pr] of pending) {
      pr.reject(new Error("decode_worker_crash"));
    }
    pending.clear();
    worker = null;
  };
}

function getDecodeWorker(): Worker | null {
  if (typeof Worker === "undefined" || typeof import.meta.url === "undefined") {
    return null;
  }
  if (worker) return worker;
  try {
    const w = new Worker(
      new URL("../worker/export-decode.worker.ts", import.meta.url),
      { type: "classic" },
    );
    attachWorkerHandlers(w);
    worker = w;
    return w;
  } catch {
    return null;
  }
}

/**
 * Para data URLs muy grandes, el decode base64 en worker evita un long task en el main.
 */
/** Por debajo de este tamaño (chars en data URL) el decode en main suele ser aceptable. */
const DATA_URL_WORKER_THRESHOLD_CHARS = 600_000;

export function decodeDataUrlToBytesViaWorkerIfLarge(
  dataUrl: string,
): Promise<Uint8Array> {
  if (dataUrl.length < DATA_URL_WORKER_THRESHOLD_CHARS) {
    return Promise.resolve(dataUrlToUint8Array(dataUrl));
  }
  const comma = dataUrl.indexOf(",");
  if (comma === -1) {
    return Promise.resolve(dataUrlToUint8Array(dataUrl));
  }
  const b64 = dataUrl.slice(comma + 1).replace(/\s/g, "");
  const w = getDecodeWorker();
  if (!w) {
    return Promise.resolve(dataUrlToUint8Array(dataUrl));
  }
  const id = ++seq;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    w.postMessage({ id, b64 } satisfies { id: number; b64: string });
  });
}
