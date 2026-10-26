import { describe, it, expect } from 'vitest';
import type { RouteObject } from 'react-router-dom';
import { router } from '../router';

function findRoute(routes: RouteObject[], path: string): RouteObject | undefined {
  for (const r of routes) {
    if (r.path === path) return r;
    const hit = r.children && findRoute(r.children, path);
    if (hit) return hit;
  }
  return undefined;
}

describe('router', () => {
  it('code-splits the ticker detail route (keeps Recharts out of the entry chunk)', async () => {
    const route = findRoute(router.routes as RouteObject[], 'ticker/:symbol');
    expect(route).toBeDefined();
    expect(route?.element).toBeUndefined();
    expect(typeof route?.lazy).toBe('function');

    const lazy = route!.lazy as () => Promise<Partial<RouteObject>>;
    const loaded = await lazy();
    expect(typeof loaded.Component).toBe('function');
  });
});
