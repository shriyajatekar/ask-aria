import { PLATFORM_IDS } from "@/types/analytics";
import type { PlatformId, Product } from "@/types/analytics";

import { BRANDS } from "./brands";

const CATEGORIES = [
  {
    category: "Skincare",
    subcategories: ["Serums", "Moisturizers", "Cleansers", "Sunscreen"],
  },
  {
    category: "Makeup",
    subcategories: ["Foundation", "Lip Color", "Mascara", "Blush"],
  },
  {
    category: "Haircare",
    subcategories: ["Shampoo", "Conditioner", "Hair Oil", "Styling"],
  },
  {
    category: "Personal Care",
    subcategories: ["Body Wash", "Deodorant", "Hand Care", "Bath"],
  },
  {
    category: "Wellness",
    subcategories: ["Supplements", "Aromatherapy", "Sleep Care", "Hydration"],
  },
  {
    category: "Beauty Tools",
    subcategories: ["Brushes", "Applicators", "Devices", "Accessories"],
  },
] as const;

const PRODUCT_DESCRIPTORS = [
  "Hydra",
  "Velvet",
  "Clarity",
  "Radiance",
  "Silk",
  "Cloud",
  "Pure",
  "Glow",
  "Calm",
  "Renew",
  "Lumen",
  "Nova",
  "Kind",
  "True",
  "Prime",
  "Soft",
  "Daily",
  "Night",
  "Active",
  "Balance",
];

function buildProducts(): Product[] {
  const products: Product[] = [];
  let index = 0;

  const tagPlan: Record<number, string[]> = {
    0: ["top_performer"],
    1: ["top_performer"],
    2: ["top_performer"],
    3: ["top_performer"],
    4: ["top_performer"],
    5: ["top_performer"],
    6: ["underperformer"],
    7: ["underperformer"],
    8: ["underperformer"],
    9: ["underperformer"],
    10: ["underperformer"],
    11: ["underperformer"],
    12: ["underperformer"],
    13: ["underperformer"],
    14: ["inventory_stress"],
    15: ["inventory_stress"],
    16: ["inventory_stress"],
    17: ["inventory_stress"],
    18: ["inventory_stress"],
    19: ["inventory_stress"],
    20: ["competitive_pressure"],
    21: ["competitive_pressure"],
    22: ["competitive_pressure"],
    23: ["competitive_pressure"],
    24: ["competitive_pressure"],
    25: ["competitive_pressure"],
  };

  for (let i = 0; i < 52; i += 1) {
    const brand = BRANDS[i % BRANDS.length];
    const platformId = PLATFORM_IDS[i % PLATFORM_IDS.length] as PlatformId;
    const categoryDef = CATEGORIES[i % CATEGORIES.length];
    const subcategory =
      categoryDef.subcategories[i % categoryDef.subcategories.length];
    const descriptor = PRODUCT_DESCRIPTORS[i % PRODUCT_DESCRIPTORS.length];
    const variant = PRODUCT_DESCRIPTORS[(i + 7) % PRODUCT_DESCRIPTORS.length];

    const price = Math.round(299 + (i % 11) * 175 + (i % 3) * 90);
    const cost = Math.round(price * (0.38 + (i % 5) * 0.04));
    const rating = Number((3.6 + (i % 13) * 0.1).toFixed(1));
    const reviewCount = 120 + i * 37 + (i % 4) * 210;

    const scenarioTags = [...(tagPlan[i] ?? [])];
    if (platformId === "amazon") scenarioTags.push("amazon_portfolio");
    if (platformId === "blinkit" && i % 7 === 0) {
      scenarioTags.push("inventory_stress");
    }

    products.push({
      id: `prod-${String(i + 1).padStart(3, "0")}`,
      sku: `CI-${brand.name.split(" ")[0].slice(0, 3).toUpperCase()}-${String(index + 1).padStart(4, "0")}`,
      name: `${descriptor} ${variant} ${subcategory}`,
      brandId: brand.id,
      category: categoryDef.category,
      subcategory,
      platformId,
      price,
      cost,
      rating: Math.min(rating, 4.9),
      reviewCount,
      status: i % 17 === 0 ? "launch" : "active",
      scenarioTags: [...new Set(scenarioTags)],
    });
    index += 1;
  }

  return products;
}

export const PRODUCTS: Product[] = buildProducts();

export const PRODUCT_BY_ID = Object.fromEntries(
  PRODUCTS.map((product) => [product.id, product]),
) as Record<string, Product>;

export const PRODUCTS_BY_PLATFORM = PLATFORM_IDS.reduce(
  (accumulator, platformId) => {
    accumulator[platformId] = PRODUCTS.filter(
      (product) => product.platformId === platformId,
    );
    return accumulator;
  },
  {} as Record<PlatformId, Product[]>,
);
