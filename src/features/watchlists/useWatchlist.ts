import * as React from 'react';
import { readWatchlist, writeWatchlist } from './storage';

export function useWatchlist() {
  const [list, setList] = React.useState<string[]>(() => readWatchlist());

  React.useEffect(() => {
    writeWatchlist(list);
  }, [list]);

  const add = React.useCallback((ticker: string) => {
    const t = ticker.toUpperCase();
    setList(prev => (prev.includes(t) ? prev : [...prev, t]));
  }, []);

  const remove = React.useCallback((ticker: string) => {
    const t = ticker.toUpperCase();
    setList(prev => prev.filter(x => x !== t));
  }, []);

  const toggle = React.useCallback((ticker: string) => {
    const t = ticker.toUpperCase();
    setList(prev => (prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]));
  }, []);

  const has = React.useCallback((ticker: string) => list.includes(ticker.toUpperCase()), [list]);

  return { list, add, remove, toggle, has };
}
