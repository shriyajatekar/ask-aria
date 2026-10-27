import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { CHART_NEUTRAL, CHART_PALETTE } from "@/lib/dashboard/chart-colors";

const css = readFileSync(path.resolve(__dirname, "../src/app/globals.css"), "utf8");
const token = (name: string) => {
  const match = css.match(new RegExp(`--color-${name}:\\s*(#[0-9a-fA-F]{6})`));
  if (!match) throw new Error(`missing token ${name}`);
  return match[1];
};

function luminance(hex: string): number {
  const n = Number.parseInt(hex.slice(1), 16);
  const channel = (c: number) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(n >> 16) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

const backgrounds = ["page", "surface", "background-secondary"];

describe("design tokens", () => {
  it("text colours meet WCAG AA (4.5:1) on every background", () => {
    for (const text of ["text-primary", "text-secondary", "text-tertiary", "accent-interactive", "error", "warning"]) {
      for (const bg of backgrounds) {
        expect(contrast(token(text), token(bg)), `${text} on ${bg}`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it("white text on copper and copper on its tint meet AA", () => {
    expect(contrast("#ffffff", token("accent-interactive"))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(token("accent-interactive"), token("accent-subtle"))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(token("error"), token("error-subtle"))).toBeGreaterThanOrEqual(4.5);
  });

  it("chart colours meet 3:1 against white", () => {
    for (const hex of [...CHART_PALETTE, CHART_NEUTRAL]) {
      expect(contrast(hex, "#ffffff"), hex).toBeGreaterThanOrEqual(3);
    }
  });

  it("uses no green, blue or purple hues", () => {
    const hues = [...css.matchAll(/--color-[a-z0-9-]+:\s*(#[0-9a-fA-F]{6})/g)].map((m) => m[1]);
    for (const hex of [...hues, ...CHART_PALETTE]) {
      const n = Number.parseInt(hex.slice(1), 16);
      const [r, g, b] = [n >> 16, (n >> 8) & 255, n & 255];
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      if (max - min < 12) continue; // neutral grey
      let hue = 0;
      if (max === r) hue = ((g - b) / (max - min)) * 60;
      else if (max === g) hue = (2 + (b - r) / (max - min)) * 60;
      else hue = (4 + (r - g) / (max - min)) * 60;
      hue = (hue + 360) % 360;
      expect(hue < 75 || hue > 330, `${hex} hue ${hue.toFixed(0)}°`).toBe(true);
    }
  });
});
