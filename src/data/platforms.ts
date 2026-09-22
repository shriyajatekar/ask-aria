import type { Platform } from "@/types/analytics";

/** Display order for Header 2 — Commerce Intelligence (independent ordering). */
export const PLATFORMS: Platform[] = [
  {
    id: "amazon",
    name: "Amazon",
    channelType: "marketplace",
    country: "IN",
    status: "active",
  },
  {
    id: "flipkart",
    name: "Flipkart",
    channelType: "marketplace",
    country: "IN",
    status: "active",
  },
  {
    id: "myntra",
    name: "Myntra",
    channelType: "marketplace",
    country: "IN",
    status: "active",
  },
  {
    id: "ajio",
    name: "Ajio",
    channelType: "marketplace",
    country: "IN",
    status: "active",
  },
  {
    id: "tata_cliq",
    name: "Tata CLiQ",
    channelType: "marketplace",
    country: "IN",
    status: "active",
  },
  {
    id: "indiamart",
    name: "IndiaMART",
    channelType: "marketplace",
    country: "IN",
    status: "active",
  },
  {
    id: "nykaa",
    name: "Nykaa",
    channelType: "beauty_specialty",
    country: "IN",
    status: "active",
  },
  {
    id: "purple",
    name: "Purple",
    channelType: "beauty_specialty",
    country: "IN",
    status: "active",
  },
  {
    id: "bigbasket",
    name: "BigBasket",
    channelType: "quick_commerce",
    country: "IN",
    status: "active",
  },
  {
    id: "blinkit",
    name: "Blinkit",
    channelType: "quick_commerce",
    country: "IN",
    status: "active",
  },
  {
    id: "zepto",
    name: "Zepto",
    channelType: "quick_commerce",
    country: "IN",
    status: "active",
  },
  {
    id: "swiggy_instamart",
    name: "Swiggy Instamart",
    channelType: "quick_commerce",
    country: "IN",
    status: "active",
  },
];

export const PLATFORM_BY_ID = Object.fromEntries(
  PLATFORMS.map((platform) => [platform.id, platform]),
) as Record<Platform["id"], Platform>;
