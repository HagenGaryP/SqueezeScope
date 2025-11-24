import type { TickerRow } from "../../lib/types";

/**
 * Compute a 0–100 squeeze score from a TickerRow.
 *
 * This is intentionally simple for v1 and based only on:
 * - short interest (% of public & broad float)
 * - days-to-cover (short ratio)
 * - relative volume
 * - catalyst flag
 *
 * The formula can be iterated on later without changing UI components.
 */
export function computeSqueezeScore(row: TickerRow): number {
  const { siPublic, siBroad, dtc, rvol, catalyst } = row;

  // Normalize inputs into 0–1 bands with simple caps.
  const siPublicNorm = clamp01((siPublic ?? 0) / 50); // 50%+ SI → maxed
  const siBroadNorm = clamp01((siBroad ?? 0) / 50);
  const dtcNorm = clamp01((dtc ?? 0) / 10); // 10+ days → maxed
  const rvolNorm = clamp01((rvol ?? 0) / 5); // 5x RVOL → maxed

  const siScore = (siPublicNorm + siBroadNorm) / 2;

  // Simple weights for v1
  const base =
    siScore * 0.5 + // short interest: 50%
    dtcNorm * 0.3 + // days-to-cover: 30%
    rvolNorm * 0.2; // relative volume: 20%

  // Small bump in score for catalyst
  const catalystBoost = catalyst ? 0.05 : 0;

  const score = (base + catalystBoost) * 100;
  return clamp(score, 0, 100);
}

// Helper to clamp a number between min and max
function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function clamp01(value: number): number {
  // Clamp to the [0, 1] range (unit interval).
  return clamp(value, 0, 1);
}
