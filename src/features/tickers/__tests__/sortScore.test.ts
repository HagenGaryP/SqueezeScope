import { describe, it, expect, vi } from 'vitest';
import type { TickerRow } from '../../../lib/types';
import { sortRows } from '../sort';
import { computeSqueezeScore } from '../squeezeScore';

// Wrap the real scorer so calls can be counted without changing results.
vi.mock('../squeezeScore', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../squeezeScore')>();
  return { ...actual, computeSqueezeScore: vi.fn(actual.computeSqueezeScore) };
});

function row(ticker: string, siPublic: number, dtc = 0, rvol = 0): TickerRow {
  return { ticker, price: 1, pctChange: 0, siPublic, siBroad: siPublic, dtc, rvol, catalyst: false };
}

function makeRows(n: number): TickerRow[] {
  // Deterministic pseudo-random spread of inputs.
  return Array.from({ length: n }, (_, i) =>
    row(`T${i}`, (i * 37) % 60, (i * 13) % 12, ((i * 7) % 60) / 10)
  );
}

describe('sortRows by squeezeScore', () => {
  it('computes each score at most once per row', () => {
    const rows = makeRows(2000);
    const calls = () => vi.mocked(computeSqueezeScore).mock.calls.length;
    const before = calls();
    sortRows(rows, 'squeezeScore', 'desc');
    expect(calls() - before).toBeLessThanOrEqual(rows.length);
  });

  it('orders by score ascending and descending', () => {
    const rows = [row('MID', 25, 5, 2.5), row('LOW', 0), row('HIGH', 60, 12, 6)];
    expect(sortRows(rows, 'squeezeScore', 'asc').map((r) => r.ticker)).toEqual(['LOW', 'MID', 'HIGH']);
    expect(sortRows(rows, 'squeezeScore', 'desc').map((r) => r.ticker)).toEqual(['HIGH', 'MID', 'LOW']);
  });

  it('keeps input order for equal scores (stable) in both directions', () => {
    const rows = [row('A', 10), row('B', 10), row('C', 10)];
    expect(sortRows(rows, 'squeezeScore', 'asc').map((r) => r.ticker)).toEqual(['A', 'B', 'C']);
    expect(sortRows(rows, 'squeezeScore', 'desc').map((r) => r.ticker)).toEqual(['A', 'B', 'C']);
  });

  it('matches a reference sort on a large input and does not mutate it', () => {
    const rows = makeRows(500);
    const before = rows.slice();
    const out = sortRows(rows, 'squeezeScore', 'desc');
    const scores = out.map((r) => computeSqueezeScore(r));
    for (let i = 1; i < scores.length; i++) expect(scores[i - 1]).toBeGreaterThanOrEqual(scores[i]);
    expect(rows).toEqual(before);
    expect(out).not.toBe(rows);
  });
});
