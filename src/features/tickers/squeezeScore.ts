import type { TickerRow, TickerMetrics } from '../../lib/types';

/**
 * Compute a 0–100 SqueezeScore from a TickerRow.
 *
 * Inputs (v1):
 * - siPublic / siBroad: short interest % (public vs broad float)
 * - dtc: days-to-cover (short ratio)
 * - rvol: relative volume
 * - catalyst: recent news/filing flag
 *
 * The formula is intentionally simple and can be tuned later without changing UI components.
 */
export function computeSqueezeScore(row: TickerRow): number {
  const { siPublic, siBroad, dtc, rvol, catalyst } = row;

  // Normalize inputs into 0–1 bands with simple caps.
  const siPublicNorm = clamp01((siPublic ?? 0) / 50); // 50%+ SI → maxed
  const siBroadNorm = clamp01((siBroad ?? 0) / 50);
  const dtcNorm = clamp01((dtc ?? 0) / 10); // 10+ days → maxed
  const rvolNorm = clamp01((rvol ?? 0) / 5); // 5x RVOL → maxed

  const siScore = (siPublicNorm + siBroadNorm) / 2;

  // Simple weights for v1.
  const base =
    siScore * 0.5 + // short interest: 50%
    dtcNorm * 0.3 + // days-to-cover: 30%
    rvolNorm * 0.2; // relative volume: 20%

  const catalystBoost = catalyst ? 0.05 : 0;

  const score = (base + catalystBoost) * 100;
  return clamp(score, 0, 100);
}

/**
 * Compute SqueezeScore from TickerMetrics by adapting it to a TickerRow shape.
 *
 * For now we rely on the shared SI% and DTC fields and treat the rest as neutral.
 * If TickerMetrics is extended (price, rvol, catalyst, etc.), update this adapter
 * without touching the core scoring formula.
 */
export function computeSqueezeScoreFromMetrics(metrics: TickerMetrics): number {
  const rowLike: TickerRow = {
    ticker: metrics.ticker,
    price: 0,
    pctChange: 0,
    siPublic: metrics.siPublic,
    siBroad: metrics.siBroad,
    dtc: metrics.dtc,
    rvol: 1,         // neutral relative volume
    catalyst: false, // no catalyst info at the metrics level (yet)
  };

  return computeSqueezeScore(rowLike);
}

// Helpers

function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function clamp01(value: number): number {
  // Clamp to the [0, 1] range (unit interval).
  return clamp(value, 0, 1);
}
