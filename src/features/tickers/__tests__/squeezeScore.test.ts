import { describe, it, expect } from "vitest";
import type { TickerRow } from "../../../lib/types";
import { computeSqueezeScore } from "../squeezeScore";

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
