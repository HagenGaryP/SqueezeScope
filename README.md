# SqueezeScope — Short-Squeeze Radar (React + TypeScript + Azure-ready)

[![CI](https://github.com/<HagenGaryP>/squeezescope/actions/workflows/ci.yml/badge.svg)](https://github.com/<HagenGaryP>/squeezescope/actions/workflows/ci.yml)


A production-minded, data-heavy web app for screening equities, computing a “squeeze score,” and visualizing signals.
Built to demonstrate modern **Frontend engineering skills** with a pragmatic path to serverless cloud (Azure) deployment.

> **Why this project?**
> Hiring managers want to see a *real, usable* app: crisp UX, clean code organization, tests, basic auth, CI/CD, and observability.
> SqueezeScope is designed to showcase exactly that while remaining small enough to ship.

---

## ✨ Key Features (MVP)

- **Screener** with filters:
  - Query by ticker
  - SI% minimum, DTC minimum, RVOL minimum
  - Catalyst flag
  - Sortable columns + Asc/Desc buttons
  - State persisted in the URL
- **Ticker detail** page with metric badges and a price chart
- **Mock API** via Mock Service Worker (MSW) for realistic, offline-friendly dev
- **Modular architecture** (features/*, components/*, lib/*) with typed data models

### Planned (stretch goals)
- Watchlists (localStorage → API)
- Auth (GitHub / Entra)
- Daily & intraday jobs
- Observability dashboards
- SignalR live updates

---

## 🧰 Tech Stack

- **Frontend:** React 18, TypeScript, Vite
- **Routing & Data:** React Router, React Query
- **UI:** React-Bootstrap (easily swappable for Tailwind/shadcn)
- **Validation/Forms:** Zod, React-Hook-Form
- **Data Viz:** Recharts
- **Mocks:** MSW (service worker)
- **Testing (planned):** Vitest, Testing Library, Playwright
- **Cloud (later):** Azure Static Web Apps, Azure Functions (Node/TS), Cosmos DB (NoSQL), Blob Storage, Application Insights

---

## 📦 Project Structure

```
src/
  app/
    router.tsx
  components/
    Layout/
      AppShell.tsx
      NavBar.tsx
  features/
    tickers/
      ScreenerPage.tsx
      TickerDetailPage.tsx
      components/
        ScreenerTable.tsx
      screenerSchema.ts
    watchlists/            # placeholder for next milestone
      storage.ts
  lib/
    api.ts
    types.ts
  mocks/
    browser.ts
    handlers.ts
    data/
      tickers.json
      metrics.json
  pages/
    HomePage.tsx
    NotFound.tsx
    ErrorFallback.tsx
  styles/
    globals.css
```

---

## 🏗️ Local Development

```bash
# install dependencies
npm install

# one-time: install the MSW service worker in /public
npx msw init public/ --save

# run dev server
npm run dev
```

Visit **http://localhost:5173**

**Routes**
- `/` — Home
- `/screener` — Screener with filters/sort and table
- `/ticker/:symbol` — Ticker details (e.g. `/ticker/TNYA`)
- `/*` — NotFound or ErrorFallback for runtime errors

---

## 🧪 Mock API (MSW)

- Handlers: `src/mocks/handlers.ts`
- JSON data: `src/mocks/data/tickers.json` and `metrics.json`
- During `npm run dev`, MSW intercepts `/api/*` requests and returns fixtures.
- Extend the JSON files to add more tickers/metrics for testing.

---

## 🗃️ Data Models (client)

```ts
// lib/types.ts
export type TickerRow = {
  ticker: string
  price: number
  pctChange: number
  siPublic: number
  siBroad: number
  dtc: number
  rvol: number
  catalyst: boolean
}

export type TickerMetrics = {
  ticker: string
  siPublic: number
  siBroad: number
  dtc: number
  rvol30d: number
  squeezeScore: number
  series: { t: string; price: number; vol: number }[]
}
```

---

## ✅ Quality & Best Practices

- **Accessibility:** Lighthouse + axe audits, semantic headings, contrast, focus states
- **Performance:** code-splitting routes, memoized computations, minimal re-renders
- **Testing (planned):**
  - Unit tests: Screener filter/sort logic
  - E2E tests: Screener → Ticker happy path
- **Developer Experience:** strict TypeScript, ESLint/Prettier, conventional commits

---

## 🚀 Deploy (future)

Azure Static Web Apps (free tier is perfect for a portfolio app):

- **Frontend:** SWA Free tier with GitHub Actions CI/CD
- **API:** Azure Functions (Consumption, Node/TS)
- **Data:** Cosmos DB (NoSQL) — consider Free Tier (1000 RU/s + 25 GB)
- **Storage:** Blob for CSV/imports
- **Telemetry:** Application Insights

> Dev uses MSW mocks; swap `/api/*` to Azure Functions with minimal changes.

---

## 🗺️ Roadmap

- [ ] Watchlist (localStorage → API)
- [ ] Squeeze score pipeline + timers (daily rank, intraday refresh)
- [ ] Auth-protected routes (SWA Auth)
- [ ] Observability (App Insights dashboards + alerts)
- [ ] Real-time (SignalR Free)
- [ ] Tests (Vitest + Playwright) + GitHub Actions CI
- [ ] Azure Bicep/azd infra as code

---

## 💬 For Reviewers

This repo aims to demonstrate:

- Thoughtful **state management** & typed contracts
- **Testable** logic (filters/sorts)
- Attention to **accessibility** & **performance**
- A pragmatic, low-ops **cloud architecture** path (SWA + Functions + Cosmos)
- Real-world skills in frontend, cloud basics, and project structure

If you’d like to see the cloud version, check the `deploy/azure` notes or the live demo link (when available).

---

## 📄 License

MIT © 2025 Gary Hagen
