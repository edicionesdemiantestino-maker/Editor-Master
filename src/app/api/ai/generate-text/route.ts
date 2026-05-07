import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { jsonPublicError } from "@/lib/api/http-json";
import { AI_TEXT_MAX_PROMPT_LENGTH } from "@/lib/rate-limit/api-quotas";
import { rateLimitService } from "@/lib/rate-limit/rate-limit-service";
import { requireServerUser } from "@/lib/supabase/require-server-user";
import { USAGE_COST_USD } from "@/lib/billing/usage-costs";
import {
  assertAiTextProductAllowed,
  ProductUsageBlockedError,
} from "@/services/usage/enforce-product-usage";
import { trackUsageEvent } from "@/services/usage/usage-service";
import { COSTS } from "@/lib/billing/costs";
import { consumeCredits } from "@/services/billing/credits-service";

export const runtime = "nodejs";

export const maxDuration = 60;

function extractMessageText(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const choices = (data as { choices?: unknown }).choices;
  if (!Array.isArray(choices) || choices.length === 0) return null;
  const msg = (choices[0] as { message?: { content?: unknown } }).message;
  const c = msg?.content;
  return typeof c === "string" && c.trim().length > 0 ? c.trim() : null;
}

export async function POST(req: Request) {
  const requestId = randomUUID();

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return jsonPublicError(requestId, 503, "openai_not_configured");
  }

  const auth = await requireServerUser();
  if (!auth.ok) {
    return jsonPublicError(requestId, auth.status, auth.publicCode);
  }

  const userId = auth.userId;

  const rl = await rateLimitService.consumeAiText(userId);
  if (!rl.allowed) {
    const retrySec = Math.max(1, Math.ceil(rl.retryAfterMs / 1000));
    return NextResponse.json(
      { error: "rate_limit", requestId, retryAfterMs: rl.retryAfterMs },
      {
        status: 429,
        headers: {
          "Retry-After": String(retrySec),
          "X-Request-Id": requestId,
        },
      },
    );
  }

  try {
    await assertAiTextProductAllowed(auth.supabase, userId);
  } catch (e) {
    if (e instanceof ProductUsageBlockedError) {
      return NextResponse.json(
        { error: e.code, kind: e.kind, requestId },
        { status: 403, headers: { "X-Request-Id": requestId } },
      );
    }
    throw e;
  }

  let parsed: unknown;
  try {
    parsed = (await req.json()) as unknown;
  } catch {
    return jsonPublicError(requestId, 400, "invalid_json");
  }

  const prompt =
    parsed &&
    typeof parsed === "object" &&
    typeof (parsed as { prompt?: unknown }).prompt === "string"
      ? (parsed as { prompt: string }).prompt.trim()
      : "";

  if (!prompt.length) {
    return jsonPublicError(requestId, 400, "prompt_required");
  }
  if (prompt.length > AI_TEXT_MAX_PROMPT_LENGTH) {
    return jsonPublicError(requestId, 413, "prompt_too_long");
  }

  try {
    await consumeCredits(COSTS.ai, "ai-text", requestId);
  } catch (e) {
    if (e instanceof Error && e.message === "insufficient_credits") {
      return NextResponse.json(
        { error: "insufficient_credits", requestId },
        { status: 402, headers: { "X-Request-Id": requestId } },
      );
    }
    throw e;
  }

  const upstream = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
    }),
  });

  const data = (await upstream.json()) as unknown;

  if (!upstream.ok) {
    const errObj = data && typeof data === "object" ? (data as { error?: { message?: string } }) : null;
    const detail = errObj?.error?.message?.slice(0, 200);
    return NextResponse.json(
      {
        error: "openai_error",
        requestId,
        detail: detail ?? upstream.statusText,
      },
      { status: 502, headers: { "X-Request-Id": requestId } },
    );
  }

  const text = extractMessageText(data);
  if (!text) {
    return NextResponse.json(
      { error: "empty_completion", requestId },
      { status: 502, headers: { "X-Request-Id": requestId } },
    );
  }

  await trackUsageEvent(
    auth.supabase,
    userId,
    "ai-text",
    null,
    1,
    USAGE_COST_USD["ai-text"],
  );

  return NextResponse.json(
    { text, requestId },
    { headers: { "X-Request-Id": requestId } },
  );
}
