import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWatchlist } from '../useWatchlist';

beforeEach(() => {
  // Isolate test cases: clear any persisted state between tests.
  localStorage.clear();
});

describe('useWatchlist', () => {
  it('starts empty', () => {
    const { result } = renderHook(() => useWatchlist());
    // Fresh hook should expose an empty list.
    expect(result.current.list).toEqual([]);
  });

  it('can add and remove a ticker', () => {
    const { result } = renderHook(() => useWatchlist());

    // Add a ticker and verify presence.
    act(() => result.current.add('TNYA'));
    expect(result.current.list).toEqual(['TNYA']);

    // Remove it and verify empty again.
    act(() => result.current.remove('TNYA'));
    expect(result.current.list).toEqual([]);
  });

  it('toggle + has behave consistently', () => {
    const { result } = renderHook(() => useWatchlist());

    // Toggle on: should be present and reported by `has`.
    expect(result.current.has('TSLA')).toBe(false);
    act(() => result.current.toggle('TSLA'));
    expect(result.current.has('TSLA')).toBe(true);
    expect(result.current.list).toEqual(['TSLA']);

    // Toggle off: should be removed and not reported by `has`.
    act(() => result.current.toggle('TSLA'));
    expect(result.current.has('TSLA')).toBe(false);
    expect(result.current.list).toEqual([]);
  });

  it('persists to localStorage and is readable by a new hook instance', () => {
    // First instance writes state.
    const first = renderHook(() => useWatchlist());
    act(() => first.result.current.add('NVDA'));
    expect(first.result.current.list).toContain('NVDA');

    // New instance should hydrate from localStorage.
    const second = renderHook(() => useWatchlist());
    expect(second.result.current.list).toContain('NVDA');
    expect(second.result.current.has('NVDA')).toBe(true);
  });
});
