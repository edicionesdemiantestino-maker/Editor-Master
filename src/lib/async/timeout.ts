export type TimeoutOptions = {
  ms: number;
  code?: string;
};

export function timeoutSignal({ ms, code = "timeout" }: TimeoutOptions): Promise<never> {
  return new Promise((_, reject) => {
    const t = setTimeout(() => {
      reject(new Error(code));
    }, ms);
    // Best-effort: don't keep process alive in Node.
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (typeof t === "object" && "unref" in t && typeof (t as any).unref === "function") {
      (t as any).unref();
    }
  });
}

