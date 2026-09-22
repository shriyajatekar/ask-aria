"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { DateRange, MetricId, PlatformId } from "@/types/analytics";

import {
  clampRangeToDataset,
  DEFAULT_DATE_PRESET,
  getDefaultDashboardRanges,
  resolvePreviousPeriod,
  resolvePresetRange,
  type DateRangePreset,
} from "@/lib/dashboard/date-ranges";
import {
  getRegistryPlatformIds,
  normalizeSelectedPlatformIds,
} from "@/lib/dashboard/consolidated-platforms";

export type DashboardPlatform = PlatformId | "all";
export type AnalyticsMode = "summary" | "comparison";

export interface DashboardSortState {
  field: string;
  direction: "asc" | "desc";
}

export interface DashboardContextValue {
  analyticsMode: AnalyticsMode;
  setAnalyticsMode: (mode: AnalyticsMode) => void;
  platform: DashboardPlatform;
  setPlatform: (platform: DashboardPlatform) => void;
  consolidatedSelectedPlatformIds: PlatformId[];
  setConsolidatedSelectedPlatformIds: (platformIds: PlatformId[]) => void;
  toggleConsolidatedPlatform: (platformId: PlatformId) => void;
  setConsolidatedAllPlatforms: (selectAll: boolean) => void;
  consolidatedChartMetric: MetricId;
  setConsolidatedChartMetric: (metricId: MetricId) => void;
  selectedMetrics: MetricId[];
  setSelectedMetrics: (metrics: MetricId[]) => void;
  addSelectedMetric: (metricId: MetricId) => void;
  chartMetrics: MetricId[];
  setChartMetrics: (metrics: MetricId[]) => void;
  toggleTrendMetric: (metricId: MetricId) => boolean;
  dateRangePreset: DateRangePreset;
  setDateRangePreset: (preset: DateRangePreset) => void;
  dateRange: DateRange;
  setDateRange: (range: DateRange) => void;
  comparisonPeriod: DateRange;
  setComparisonPeriod: (range: DateRange) => void;
  brandId: string | null;
  setBrandId: (brandId: string | null) => void;
  category: string | null;
  setCategory: (category: string | null) => void;
  subcategory: string | null;
  setSubcategory: (subcategory: string | null) => void;
  productId: string | null;
  setProductId: (productId: string | null) => void;
  chartGranularity: "daily" | "weekly";
  setChartGranularity: (value: "daily" | "weekly") => void;
  chartView: "graph" | "combined";
  setChartView: (value: "graph" | "combined") => void;
  productTableSort: DashboardSortState;
  setProductTableSort: (sort: DashboardSortState) => void;
  platformTableSort: DashboardSortState;
  setPlatformTableSort: (sort: DashboardSortState) => void;
  productSearch: string;
  setProductSearch: (value: string) => void;
  applyDatePreset: (preset: DateRangePreset) => void;
}

const DEFAULT_KPI_METRICS: MetricId[] = [
  "gross_sales",
  "orders",
  "conversion_rate",
  "roas",
  "acos",
  "sessions",
  "buy_box_share",
];

const DEFAULT_TREND_METRICS: MetricId[] = [
  "gross_sales",
  "orders",
  "conversion_rate",
  "roas",
];

export const KPI_LIBRARY_LIMIT = 7;
export const TREND_METRIC_LIMIT = 4;

const DashboardContext = createContext<DashboardContextValue | null>(null);

export function DashboardProvider({ children }: { children: ReactNode }) {
  const defaults = getDefaultDashboardRanges();
  const [analyticsMode, setAnalyticsMode] = useState<AnalyticsMode>("summary");
  const [platform, setPlatform] = useState<DashboardPlatform>("all");
  const [consolidatedSelectedPlatformIds, setConsolidatedSelectedPlatformIdsState] =
    useState<PlatformId[]>(() => getRegistryPlatformIds());
  const [consolidatedChartMetric, setConsolidatedChartMetric] =
    useState<MetricId>("gross_sales");
  const [selectedMetrics, setSelectedMetricsState] =
    useState<MetricId[]>(DEFAULT_KPI_METRICS);
  const [chartMetrics, setChartMetricsState] =
    useState<MetricId[]>(DEFAULT_TREND_METRICS);
  const [dateRangePreset, setDateRangePreset] =
    useState<DateRangePreset>(DEFAULT_DATE_PRESET);
  const [dateRange, setDateRange] = useState<DateRange>(defaults.dateRange);
  const [comparisonPeriod, setComparisonPeriod] = useState<DateRange>(
    defaults.comparisonPeriod,
  );
  const [brandId, setBrandId] = useState<string | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [subcategory, setSubcategory] = useState<string | null>(null);
  const [productId, setProductId] = useState<string | null>(null);
  const [chartGranularity, setChartGranularity] = useState<"daily" | "weekly">(
    "daily",
  );
  const [chartView, setChartView] = useState<"graph" | "combined">("graph");
  const [productTableSort, setProductTableSort] = useState<DashboardSortState>({
    field: "revenue",
    direction: "desc",
  });
  const [platformTableSort, setPlatformTableSort] = useState<DashboardSortState>({
    field: "revenue",
    direction: "desc",
  });
  const [productSearch, setProductSearch] = useState("");

  const applyDatePreset = useCallback((preset: DateRangePreset) => {
    setDateRangePreset(preset);
    if (preset === "custom") return;
    const nextRange = resolvePresetRange(preset);
    setDateRange(nextRange);
    setComparisonPeriod(resolvePreviousPeriod(nextRange));
  }, []);

  const setDateRangeWithComparison = useCallback((range: DateRange) => {
    const clamped = clampRangeToDataset(range);
    setDateRange(clamped);
    setComparisonPeriod(resolvePreviousPeriod(clamped));
    setDateRangePreset("custom");
  }, []);

  const setComparisonPeriodClamped = useCallback((range: DateRange) => {
    setComparisonPeriod(clampRangeToDataset(range));
    setDateRangePreset("custom");
  }, []);

  const setSelectedMetrics = useCallback((metrics: MetricId[]) => {
    const next = metrics.slice(0, KPI_LIBRARY_LIMIT);
    setSelectedMetricsState(next);
    setChartMetricsState((current) =>
      current.filter((metricId) => next.includes(metricId)),
    );
  }, []);

  const setChartMetrics = useCallback((metrics: MetricId[]) => {
    setChartMetricsState(metrics.slice(0, TREND_METRIC_LIMIT));
  }, []);

  const addSelectedMetric = useCallback((metricId: MetricId) => {
    setSelectedMetricsState((current) => {
      if (current.includes(metricId)) return current;
      if (current.length >= KPI_LIBRARY_LIMIT) return current;
      return [...current, metricId];
    });
  }, []);

  const toggleTrendMetric = useCallback(
    (metricId: MetricId): boolean => {
      if (!selectedMetrics.includes(metricId)) return false;

      if (chartMetrics.includes(metricId)) {
        if (chartMetrics.length <= 1) return false;
        setChartMetricsState(chartMetrics.filter((id) => id !== metricId));
        return true;
      }

      if (chartMetrics.length >= TREND_METRIC_LIMIT) return false;
      setChartMetricsState([...chartMetrics, metricId]);
      return true;
    },
    [chartMetrics, selectedMetrics],
  );

  const setConsolidatedSelectedPlatformIds = useCallback(
    (platformIds: PlatformId[]) => {
      const normalized = normalizeSelectedPlatformIds(platformIds);
      if (normalized.length === 0) return;
      setConsolidatedSelectedPlatformIdsState(normalized);
    },
    [],
  );

  const toggleConsolidatedPlatform = useCallback(
    (platformId: PlatformId) => {
      setConsolidatedSelectedPlatformIdsState((current) => {
        const normalized = normalizeSelectedPlatformIds(current);
        if (normalized.includes(platformId)) {
          if (normalized.length <= 1) return normalized;
          return normalized.filter((id) => id !== platformId);
        }
        return normalizeSelectedPlatformIds([...normalized, platformId]);
      });
    },
    [],
  );

  const setConsolidatedAllPlatforms = useCallback((selectAll: boolean) => {
    if (!selectAll) return;
    setConsolidatedSelectedPlatformIdsState(getRegistryPlatformIds());
  }, []);

  const value = useMemo(
    () => ({
      analyticsMode,
      setAnalyticsMode,
      platform,
      setPlatform,
      consolidatedSelectedPlatformIds,
      setConsolidatedSelectedPlatformIds,
      toggleConsolidatedPlatform,
      setConsolidatedAllPlatforms,
      consolidatedChartMetric,
      setConsolidatedChartMetric,
      selectedMetrics,
      setSelectedMetrics,
      addSelectedMetric,
      chartMetrics,
      setChartMetrics,
      toggleTrendMetric,
      dateRangePreset,
      setDateRangePreset,
      dateRange,
      setDateRange: setDateRangeWithComparison,
      comparisonPeriod,
      setComparisonPeriod: setComparisonPeriodClamped,
      brandId,
      setBrandId,
      category,
      setCategory,
      subcategory,
      setSubcategory,
      productId,
      setProductId,
      chartGranularity,
      setChartGranularity,
      chartView,
      setChartView,
      productTableSort,
      setProductTableSort,
      platformTableSort,
      setPlatformTableSort,
      productSearch,
      setProductSearch,
      applyDatePreset,
    }),
    [
      analyticsMode,
      platform,
      consolidatedSelectedPlatformIds,
      setConsolidatedSelectedPlatformIds,
      toggleConsolidatedPlatform,
      setConsolidatedAllPlatforms,
      consolidatedChartMetric,
      selectedMetrics,
      addSelectedMetric,
      chartMetrics,
      toggleTrendMetric,
      dateRangePreset,
      dateRange,
      setDateRangeWithComparison,
      comparisonPeriod,
      setComparisonPeriodClamped,
      brandId,
      category,
      subcategory,
      productId,
      chartGranularity,
      chartView,
      productTableSort,
      platformTableSort,
      productSearch,
      applyDatePreset,
    ],
  );

  return (
    <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>
  );
}

export function useDashboard(): DashboardContextValue {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error("useDashboard must be used within DashboardProvider.");
  }
  return context;
}

export function useDashboardFilters() {
  const dashboard = useDashboard();
  return {
    platform: dashboard.platform,
    selectedMetrics: dashboard.selectedMetrics,
    dateRange: dashboard.dateRange,
    comparisonPeriod: dashboard.comparisonPeriod,
    brand: dashboard.brandId,
    category: dashboard.category,
    product: dashboard.productId,
    sort: dashboard.productTableSort,
    filters: {
      brandId: dashboard.brandId,
      category: dashboard.category,
      subcategory: dashboard.subcategory,
      productId: dashboard.productId,
    },
  };
}
