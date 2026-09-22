import type { Brand } from "@/types/analytics";

export const BRANDS: Brand[] = [
  {
    id: "brand-luma",
    name: "Luma Beauty",
    category: "Beauty",
    status: "active",
  },
  {
    id: "brand-novi",
    name: "Novi Skin",
    category: "Skincare",
    status: "active",
  },
  {
    id: "brand-aurelia",
    name: "Aurelia Care",
    category: "Personal Care",
    status: "active",
  },
  {
    id: "brand-morrow",
    name: "Morrow Beauty",
    category: "Makeup",
    status: "active",
  },
  {
    id: "brand-veya",
    name: "Veya Cosmetics",
    category: "Beauty",
    status: "active",
  },
  {
    id: "brand-haven",
    name: "Haven Wellness",
    category: "Wellness",
    status: "active",
  },
  {
    id: "brand-silkline",
    name: "Silkline Hair",
    category: "Haircare",
    status: "active",
  },
];

export const BRAND_BY_ID = Object.fromEntries(
  BRANDS.map((brand) => [brand.id, brand]),
) as Record<string, Brand>;
