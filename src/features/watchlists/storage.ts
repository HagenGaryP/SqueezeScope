const KEY = 'squeezescope:watchlist';

export function readWatchlist(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? (arr.filter(x => typeof x === 'string') as string[]) : [];
  } catch {
    return [];
  }
}

export function writeWatchlist(list: string[]) {
  const unique = Array.from(new Set(list.map(s => s.toUpperCase()))).slice(0, 200);
  localStorage.setItem(KEY, JSON.stringify(unique));
}
