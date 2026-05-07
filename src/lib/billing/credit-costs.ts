export const CREDIT_COSTS = {
  inpaint: 2,
  "export-print": 3,
  "ai-text": 1,
} as const;

export type CreditCostReason = keyof typeof CREDIT_COSTS;

