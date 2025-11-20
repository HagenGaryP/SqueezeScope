# SqueezeScope — Short-Squeeze Radar (React + TypeScript)

[![CI](https://github.com/HagenGaryP/SqueezeScope/actions/workflows/ci.yml/badge.svg)](https://github.com/HagenGaryP/SqueezeScope/actions/workflows/ci.yml)

SqueezeScope is a short-squeeze–oriented stock screener built with a modern React + TypeScript stack. It focuses on a realistic, production-minded frontend: typed data models, URL-driven filters, a watchlist, error and empty states, and a mock API in development.

The goal is to showcase frontend engineering skills on a project that’s small enough to ship but structured like a real app.

---

## Overview

SqueezeScope helps you:

- Scan a small universe of tickers with short-interest / squeeze-relevant metrics
- Filter and sort by SI%, days-to-cover, relative volume, and catalysts
- Save symbols to a watchlist backed by `localStorage`
- Drill into a ticker detail view with a 60-day price/volume chart

The app is designed as a static demo in production (no backend required) while still exercising a realistic API layer during development via MSW.

---

## Features

### Screener

- Filter by:
  - Ticker search
  - Minimum short interest (public & broad float)
  - Days-to-cover (short ratio)
  - Relative volume
  - Catalyst flag
- Sortable table with sticky headers and keyboard-accessible focus states
- Filter state is synced to the URL, so views are shareable

### Watchlist

- Add/remove tickers from the screener and detail pages
- Watchlist is stored in `localStorage` via a small, tested custom hook
- Compact table layout optimized for at-a-glance monitoring

### Ticker detail

- Hero strip with key metrics:
  - Short interest (public & broad float)
  - Days-to-cover (DTC)
  - Relative volume (RVOL)
  - Squeeze score
- 60-day price/volume sparkline via Recharts
- Watchlist toggle integrated into the detail view

### Error & 404 UX

- App-level `ErrorBoundary` with a friendly fallback
- 404 route with a primary “Back to Screener” call-to-action
- Semantic landmarks and focus considerations for better accessibility

### Data layer

- Centralized tickers client:
  - `fetchTickers()`
  - `fetchTickerMetrics(symbol)`
- React Query for caching, background refetching, and async state
- MSW-backed mock API in development
- Static JSON fixtures in production (no backend dependency)

---

## Tech stack

- **Framework:** React 19, TypeScript, Vite 7
- **Routing:** React Router 7
- **Data & caching:** `@tanstack/react-query` v5
- **Forms & validation:** React Hook Form + Zod
- **UI:** React-Bootstrap 2, Bootstrap 5, custom CSS (compact dark theme)
- **Charts:** Recharts 3
- **Mock API:** MSW 2
- **HTTP client:** Axios
- **Testing:** Vitest, Testing Library, jest-dom
- **CI:** GitHub Actions (lint, typecheck, build on PRs)

---

## Dev vs prod behavior

### Development

- The app runs as a typical SPA backed by a mock API.
- MSW is enabled and intercepts:
  - `/api/tickers`
  - `/api/tickers/:symbol`
- The tickers client uses Axios to hit those endpoints, so the UI still talks to an “API layer” even though it’s mocked.

### Production demo

- MSW is not started by default in production builds.
- The tickers client transparently switches to typed static fixtures:
  - `tickerFixtures` for screener + watchlist data
  - `findOrCreateMetrics(symbol)` for ticker detail metrics and series
- This makes the app deployable as a fully static site (Netlify, Vercel, GitHub Pages, Azure Static Web Apps, etc.) with no backend.

---

## Getting started

### Prerequisites

- Node 20+ recommended
- npm (comes with Node)

### Setup & local dev

From the project root:

    # install dependencies
    npm install

    # run dev server (MSW-enabled)
    npm run dev

Then open the printed local URL (typically `http://localhost:5173`).

**Key routes**

- `/` — Home
- `/screener` — Screener with filters & sortable table
- `/ticker/:symbol` — Ticker detail (e.g. `/ticker/TNYA`)
- `/watchlists` — Watchlist view
- `/*` — 404 page

### Quality checks

    # unit tests
    npm run test

    # lint (and associated static checks)
    npm run lint

    # production build
    npm run build

    # preview production build locally
    npm run preview

---

## Project structure

    src/
      main.tsx
      app/
        router.tsx          # central route config
      components/
        Layout/             # AppShell, NavBar
        ui/                 # ErrorBoundary, shared UI helpers
      features/
        tickers/            # Screener, detail page, query + filter + sort helpers
        watchlists/         # watchlist hook, storage helpers, watchlist page
      lib/
        api.ts              # Axios instance
        types.ts            # domain types (TickerRow, TickerMetrics, etc.)
      mocks/
        browser.ts          # MSW worker setup
        handlers.ts         # /api/tickers and /api/tickers/:symbol handlers
        data/               # tickers.json, metrics.json (fixtures)
      styles/
        globals.css         # global theme + layout
      test/
        setup.ts            # Vitest + Testing Library setup
        smoke.test.ts       # basic app smoke test

---

## Future work & Azure integration

Planned enhancements focus on replacing the static demo data with a small, Azure-backed backend while keeping the current frontend architecture:

- **Azure Static Web Apps**
  - Host the React SPA on Azure Static Web Apps with CI/CD from GitHub Actions.
- **Azure Functions (serverless API)**
  - Introduce a minimal Azure Functions API that serves tickers and metrics from a real data source.
  - Maintain the same REST shape used by the current MSW handlers.
- **Azure data store**
  - Persist watchlists and/or ticker snapshots using Azure Cosmos DB or Azure SQL.
  - Optionally extend the data model with user-specific preferences (e.g. saved filter presets).
- **Observability**
  - Add basic monitoring and logging via Azure Application Insights for API calls and key user flows.

These are intentionally scoped so the existing frontend and tickers client can be reused with minimal changes, while allowing the project to demonstrate practical Azure experience.

---

## What this project demonstrates

- Feature-oriented React architecture with thin UI components and pure helper functions
- A centralized, typed data client that cleanly separates dev (MSW) and prod (static fixtures) flows
- URL-driven filters using React Hook Form + Zod
- A practical watchlist implementation with `localStorage` persistence and tests
- CI-enforced quality gates (lint, tests, build) suitable for a PR-driven workflow
- A clear path to Azure integration (Static Web Apps + Functions + managed data store)

---

## License

MIT © 2025 Gary Hagen
