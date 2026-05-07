export const PLANS = {
  free: {
    monthlyIncluded: {
      inpaint: 20,
      "export-print": 10,
    },
  },
  pro: {
    monthlyIncluded: {
      inpaint: 200,
      "export-print": 100,
    },
  },
  business: {
    monthlyIncluded: {
      inpaint: 1000,
      "export-print": 500,
    },
  },
} as const;

