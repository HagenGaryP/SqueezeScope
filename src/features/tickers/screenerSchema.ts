import { z } from "zod";

/**
 * Supported keys to sort the list of stocks by a given metric.
 */
export const sortKeys = [
  "ticker",
  "siPublic",
  "siBroad",
  "rvol",
  "dtc",
  "squeezeScore",
  "pctChange",
  "price",
] as const;

export type SortKey = (typeof sortKeys)[number];

/** Sort direction */
export const dirKeys = ["asc", "desc"] as const;
export type Dir = (typeof dirKeys)[number];

/**
 * Input schema (coerces & supplies defaults from URL/query).
 * Keys are optional *on input* so we can parse raw URL strings.
 */
export const ScreenerInputSchema = z.object({
  q: z.string().trim().optional().default(""),
  siMin: z.coerce.number().min(0).max(100).default(0),
  dtcMin: z.coerce.number().min(0).max(10).default(0),
  rvolMin: z.coerce.number().min(0).max(10).default(0),
  catalyst: z.coerce.boolean().default(false),
  sort: z.enum(sortKeys).default("ticker"),
  dir: z.enum(dirKeys).default("asc"),
});

/**
 * Form schema (all fields required & correctly typed for RHF).
 * This is what the resolver should use to avoid TS mismatch.
 */
export const ScreenerFormSchema = z.object({
  q: z.string(),
  siMin: z.number().min(0).max(100),
  dtcMin: z.number().min(0).max(10),
  rvolMin: z.number().min(0).max(10),
  catalyst: z.boolean(),
  sort: z.enum(sortKeys),
  dir: z.enum(dirKeys),
});

export type ScreenerValues = z.infer<typeof ScreenerFormSchema>;

/** Default screener state (matches the defaults in ScreenerInputSchema). */
export const SCREENER_DEFAULTS: ScreenerValues = {
  q: "",
  siMin: 0,
  dtcMin: 0,
  rvolMin: 0,
  catalyst: false,
  sort: "ticker",
  dir: "asc",
};

/** Form fields that narrow the result set (sort/dir only reorder it). */
export const filterKeys = ["q", "siMin", "dtcMin", "rvolMin", "catalyst"] as const;
export type FilterKey = (typeof filterKeys)[number];

/** Human-readable sort labels, shared by the sort select and the summary strip. */
export const SORT_LABELS: Record<SortKey, string> = {
  ticker: "Ticker",
  siPublic: "SI% Public",
  siBroad: "SI% Broad",
  rvol: "RVOL",
  dtc: "DTC",
  squeezeScore: "Squeeze Score",
  pctChange: "% Change",
  price: "Price",
};
