/** Static demo data for the Ask Aria portfolio showcase only. */

export const SHOWCASE_WORKSPACE = "Sugar Cosmetics";

export const SHOWCASE_CHANNELS = [
  "Unified",
  "Amazon",
  "Flipkart",
  "Myntra",
  "Nykaa",
  "Purple",
  "Ajio",
  "Zepto",
  "Swiggy Instamart",
  "Blinkit",
] as const;

export const SHOWCASE_KPIS = [
  "Ad Impressions",
  "Ad Clicks",
  "Ad Sales",
  "ACOS",
] as const;

export const SHOWCASE_PERIODS = {
  current: "06/09/2025 – 30/09/2025",
  comparison: "06/10/2025 – 31/10/2025",
  currentLong: "06 Sep – 30 Sep 2025",
  comparisonLong: "06 Oct – 31 Oct 2025",
};

export const SHOWCASE_FLIPKART_ROAS = {
  platform: "Flipkart",
  previous: 4.8,
  current: 3.9,
  changePercent: -18,
  driver: "Buy Box loss across 2 high-performing SKUs.",
};

export const SHOWCASE_SOURCE = {
  platform: "Flipkart",
  period: "06 Sep – 30 Sep 2025",
  metric: "ROAS",
  dataPoints: 248,
  lastUpdated: "10:42 AM",
};

export const SHOWCASE_EVIDENCE = [
  { label: "Ad spend", value: "+23%" },
  { label: "Conversion rate", value: "-11%" },
  { label: "Buy Box visibility", value: "-14%" },
];

export const SHOWCASE_ACTIONS = {
  pauseKeywords: "Pause 3 keywords · Amazon → Hair Care",
  reallocate: "Reallocate ₹18,500 to 2 high-CVR campaigns",
  impact: "+8–12% ROAS",
};
