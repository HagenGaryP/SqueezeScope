import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWatchlist } from '../useWatchlist';

beforeEach(() => {
  // Reset per test so state doesn’t leak across cases
  localStorage.clear();
});

describe('useWatchlist (smoke)', () => {
  it('starts empty', () => {
    const { result } = renderHook(() => useWatchlist());
    expect(result.current.list).toEqual([]);
  });

  it('can add and remove a ticker', () => {
    const { result } = renderHook(() => useWatchlist());

    act(() => result.current.add('TNYA'));
    expect(result.current.list).toEqual(['TNYA']);

    act(() => result.current.remove('TNYA'));
    expect(result.current.list).toEqual([]);
  });
});
