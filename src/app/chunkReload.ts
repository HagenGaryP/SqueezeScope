export const CHUNK_RELOAD_KEY = 'squeezescope:chunk-reload-at';
const RELOAD_WINDOW_MS = 10_000;

/** Messages browsers (and Vite's preload helper) use when a lazy chunk cannot be loaded. */
const CHUNK_ERROR =
  /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Unable to preload CSS/i;

export function isChunkLoadError(error: unknown): boolean {
  return error instanceof Error && CHUNK_ERROR.test(error.message);
}

export function reloadedRecently(now = Date.now()): boolean {
  try {
    const at = Number(sessionStorage.getItem(CHUNK_RELOAD_KEY));
    return Number.isFinite(at) && now - at < RELOAD_WINDOW_MS;
  } catch {
    // Without storage we cannot guard against a reload loop.
    return true;
  }
}
