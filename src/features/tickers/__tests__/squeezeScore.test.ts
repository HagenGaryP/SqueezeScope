import { describe, it, expect } from "vitest";
import type { TickerRow } from "../../../lib/types";
import { computeSqueezeScore, computeSqueezeScoreFromMetrics } from "../squeezeScore";

function makeRow(partial: Partial<TickerRow>): TickerRow {
  return {
    ticker: "TEST",
    price: 10,
    pctChange: 0,
    siPublic: 0,
    siBroad: 0,
    dtc: 0,
    rvol: 1,
    catalyst: false,
    ...partial,
  };
}

describe("computeSqueezeScore", () => {
  it("returns 0 for a very low-risk setup", () => {
    const row = makeRow({
      siPublic: 0,
      siBroad: 0,
      dtc: 0,
      rvol: 0,
      catalyst: false,
    });

    const score = computeSqueezeScore(row);

    expect(score).toBe(0);
  });

  it("returns a mid-range score for moderate values without catalyst", () => {
    const row = makeRow({
      siPublic: 25, // 0.5 normalized
      siBroad: 25, // 0.5 normalized
      dtc: 5, // 0.5 normalized
      rvol: 2.5, // 0.5 normalized
      catalyst: false,
    });

    const score = computeSqueezeScore(row);

    // 0.5 SI, 0.5 DTC, 0.5 RVOL → base 0.5 → score ≈ 50
    expect(score).toBeCloseTo(50, 5);
  });

  it("applies a small boost when catalyst is true", () => {
    const withoutCatalyst = makeRow({
      siPublic: 25,
      siBroad: 25,
      dtc: 5,
      rvol: 2.5,
      catalyst: false,
    });

    const withCatalyst = makeRow({
      siPublic: 25,
      siBroad: 25,
      dtc: 5,
      rvol: 2.5,
      catalyst: true,
    });

    const baseScore = computeSqueezeScore(withoutCatalyst);
    const boostedScore = computeSqueezeScore(withCatalyst);

    // Catalyst adds a small bump, not a huge jump.
    expect(boostedScore).toBeGreaterThan(baseScore);
    expect(boostedScore - baseScore).toBeCloseTo(5, 1); // ~5 points
  });

  it("caps extremely high values at 100", () => {
    const row = makeRow({
      siPublic: 80, // > 50 → normalized to 1
      siBroad: 90, // > 50 → normalized to 1
      dtc: 20, // > 10 → normalized to 1
      rvol: 10, // > 5 → normalized to 1
      catalyst: true,
    });

    const score = computeSqueezeScore(row);

    // Raw score would exceed 100, but we clamp to the 0–100 range.
    expect(score).toBe(100);
  });
});

describe("computeSqueezeScore edge cases", () => {
  it("treats negative and NaN inputs as zero contribution", () => {
    expect(computeSqueezeScore(makeRow({ siPublic: -10, siBroad: -5, dtc: -1, rvol: -2 }))).toBe(0);
    expect(computeSqueezeScore(makeRow({ siPublic: NaN, siBroad: NaN, dtc: NaN, rvol: NaN }))).toBe(0);
  });

  it("weights components 50/30/20 at their caps", () => {
    expect(computeSqueezeScore(makeRow({ siPublic: 50, siBroad: 50, dtc: 0, rvol: 0 }))).toBeCloseTo(50);
    expect(computeSqueezeScore(makeRow({ siPublic: 0, siBroad: 0, dtc: 10, rvol: 0 }))).toBeCloseTo(30);
    expect(computeSqueezeScore(makeRow({ siPublic: 0, siBroad: 0, dtc: 0, rvol: 5 }))).toBeCloseTo(20);
  });

  it("averages public and broad short interest", () => {
    // Public maxed, broad zero → half of the 50% SI weight.
    expect(computeSqueezeScore(makeRow({ siPublic: 50, siBroad: 0, dtc: 0, rvol: 0 }))).toBeCloseTo(25);
  });

  it("is monotonic in each input", () => {
    const base = { siPublic: 10, siBroad: 10, dtc: 2, rvol: 1 };
    const s = computeSqueezeScore(makeRow(base));
    expect(computeSqueezeScore(makeRow({ ...base, siPublic: 20 }))).toBeGreaterThan(s);
    expect(computeSqueezeScore(makeRow({ ...base, siBroad: 20 }))).toBeGreaterThan(s);
    expect(computeSqueezeScore(makeRow({ ...base, dtc: 4 }))).toBeGreaterThan(s);
    expect(computeSqueezeScore(makeRow({ ...base, rvol: 2 }))).toBeGreaterThan(s);
  });

  it("stays within 0–100 for any input", () => {
    for (const v of [-1e9, -1, 0, 1, 49.9, 50, 1e9, Infinity, -Infinity]) {
      const score = computeSqueezeScore(makeRow({ siPublic: v, siBroad: v, dtc: v, rvol: v, catalyst: true }));
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    }
  });
});

describe("computeSqueezeScoreFromMetrics", () => {
  const metrics = {
    ticker: "TEST",
    siPublic: 25,
    siBroad: 25,
    dtc: 5,
    rvol30d: 4,
    squeezeScore: 99,
    series: [],
  };

  // Current behaviour: RVOL is treated as neutral (1) even though metrics carry rvol30d.
  // Whether rvol30d should feed the score is an open maintainer decision (see #53);
  // update this test if that changes.
  it("uses SI and DTC from metrics with neutral RVOL (1) and no catalyst (current behaviour)", () => {
    const expected = computeSqueezeScore(
      makeRow({ siPublic: 25, siBroad: 25, dtc: 5, rvol: 1, catalyst: false })
    );
    expect(computeSqueezeScoreFromMetrics(metrics)).toBeCloseTo(expected);
  });

  it("ignores the stored squeezeScore field", () => {
    expect(computeSqueezeScoreFromMetrics({ ...metrics, squeezeScore: 0 })).toBeCloseTo(
      computeSqueezeScoreFromMetrics(metrics)
    );
  });
});
