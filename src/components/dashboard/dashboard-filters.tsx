"use client";

import { useMemo } from "react";
import { SlidersHorizontal } from "lucide-react";

import { BRANDS } from "@/data/brands";
import { PRODUCTS } from "@/data/products";
import { useDashboard } from "@/contexts/dashboard-context";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/cn";

export function DashboardFiltersDialog() {
  const dashboard = useDashboard();
  const activeCount = [
    dashboard.brandId,
    dashboard.category,
    dashboard.subcategory,
    dashboard.productId,
  ].filter(Boolean).length;

  const scopedProducts = useMemo(() => {
    return PRODUCTS.filter((product) => {
      if (dashboard.brandId && product.brandId !== dashboard.brandId) {
        return false;
      }
      if (dashboard.category && product.category !== dashboard.category) {
        return false;
      }
      if (
        dashboard.subcategory &&
        product.subcategory !== dashboard.subcategory
      ) {
        return false;
      }
      return true;
    });
  }, [dashboard.brandId, dashboard.category, dashboard.subcategory]);

  const categories = useMemo(() => {
    const source = dashboard.brandId
      ? PRODUCTS.filter((product) => product.brandId === dashboard.brandId)
      : PRODUCTS;
    return [...new Set(source.map((product) => product.category))].sort();
  }, [dashboard.brandId]);

  const subcategories = useMemo(() => {
    const source = PRODUCTS.filter((product) => {
      if (dashboard.brandId && product.brandId !== dashboard.brandId) {
        return false;
      }
      if (dashboard.category && product.category !== dashboard.category) {
        return false;
      }
      return true;
    });
    return [...new Set(source.map((product) => product.subcategory))].sort();
  }, [dashboard.brandId, dashboard.category]);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm" className="shrink-0 gap-2 px-3.5">
          <SlidersHorizontal className="h-4 w-4" />
          Filters
          {activeCount > 0 ? (
            <span className="rounded-sm bg-accent-interactive px-1.5 py-0.5 text-[11px] text-white">
              {activeCount}
            </span>
          ) : null}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Filters</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <CompactField label="Brand">
            <select
              className={selectClassName}
              value={dashboard.brandId ?? ""}
              onChange={(event) => {
                const brandId = event.target.value || null;
                dashboard.setBrandId(brandId);
                dashboard.setCategory(null);
                dashboard.setSubcategory(null);
                dashboard.setProductId(null);
              }}
            >
              <option value="">All brands</option>
              {BRANDS.map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {brand.name}
                </option>
              ))}
            </select>
          </CompactField>
          <CompactField label="Category">
            <select
              className={selectClassName}
              value={dashboard.category ?? ""}
              onChange={(event) => {
                dashboard.setCategory(event.target.value || null);
                dashboard.setSubcategory(null);
                dashboard.setProductId(null);
              }}
            >
              <option value="">All categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </CompactField>
          <CompactField label="Sub-category">
            <select
              className={selectClassName}
              value={dashboard.subcategory ?? ""}
              onChange={(event) => {
                dashboard.setSubcategory(event.target.value || null);
                dashboard.setProductId(null);
              }}
            >
              <option value="">All sub-categories</option>
              {subcategories.map((subcategory) => (
                <option key={subcategory} value={subcategory}>
                  {subcategory}
                </option>
              ))}
            </select>
          </CompactField>
          <CompactField label="Product / SKU">
            <select
              className={selectClassName}
              value={dashboard.productId ?? ""}
              onChange={(event) =>
                dashboard.setProductId(event.target.value || null)
              }
            >
              <option value="">All products</option>
              {scopedProducts.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
          </CompactField>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CompactField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="type-label text-text-tertiary">{label}</span>
      {children}
    </label>
  );
}

const selectClassName = cn(
  "h-8 w-full rounded-md border border-border-strong bg-white px-2",
  "type-body text-[13px] text-text-primary",
);
