/** Reexport desde cuotas centralizadas (`@/lib/rate-limit/api-quotas`). */
export {
  INPAINT_MAX_BODY_BYTES,
  INPAINT_MAX_EDGE_PX,
  INPAINT_MAX_PROMPT_LENGTH,
  INPAINT_MAX_CONCURRENT_PER_USER,
  INPAINT_RATE_LIMIT_MAX,
  INPAINT_RATE_LIMIT_WINDOW_MS,
  INPAINT_REDIS_SLOT_TTL_SEC,
} from "@/lib/rate-limit/api-quotas";
