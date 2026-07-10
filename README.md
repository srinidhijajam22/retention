# BEL — Learner Retention Dashboard

A full-stack rebuild of the BEL retention/outreach dashboard. The original was a single
static HTML file with hardcoded passwords and all data in `localStorage` (per-browser,
not shared between teammates). This version splits it into a real backend (persistent
shared database, hashed credentials, server-side business logic) and a React frontend.

## Stack

- **Backend**: Node.js + Express + SQLite (`better-sqlite3`), JWT auth (`bcryptjs` for
  password hashing), `xlsx` for parsing LXD export files server-side, `multer` for file
  uploads.
- **Frontend**: React + Vite, Chart.js for the retention/churn/focus-group charts. Styling
  is a direct port of the original dark theme.

## Project layout

```
server/   Express API + SQLite database
client/   React + Vite frontend
```

## Getting started

### 1. Backend

```bash
cd server
npm install
npm run seed   # creates users + cohorts, seeds real BEL C17 roster (idempotent)
npm run dev    # http://localhost:4000
```

Optional environment variables (see `server/.env.example`): `PORT`, `JWT_SECRET`,
`DB_PATH`. In production, set `JWT_SECRET` to a real random secret — the code falls
back to a dev-only value otherwise.

### 2. Frontend

```bash
cd client
npm install
npm run dev    # http://localhost:5173, proxies /api to localhost:4000
```

Log in with any of the seeded accounts (default password `bel@2024`, changeable per-user
directly in the `users` table or via a future admin UI):

| Username  | Role  |
|-----------|-------|
| shibu     | admin |
| admin     | admin |
| team      | team  |
| manasvi   | team  |
| srinidhi  | team  |

Admins see every cohort, can edit tracks, upload LXD exports, manage phase labels,
delete/reset weeks, and assign cohorts/tracks to Manasvi/Srinidhi from **Settings**.
Team accounts only see cohorts/tracks assigned to them (falls back to "see everything"
until an admin sets up assignments).

## Deploying so your team can access it over the internet

Running `npm run dev` only serves the app on your own machine (`localhost`) — nobody
else can open it. To get a real, shareable URL, see **[DEPLOY.md](./DEPLOY.md)**: it
walks through deploying as a single service (Render, Railway, or any Docker host) with
real secrets instead of the dev-only default password.

## What moved server-side

- **Auth**: bcrypt-hashed passwords + JWT, instead of a hardcoded plaintext map shipped
  to the browser.
- **Data model**: cohorts/learners/weekly attendance/outreach/assignments now live in
  SQLite (`server/retention.db`, gitignored) instead of a single `localStorage` blob —
  so all teammates see the same data instead of per-browser copies.
- **LXD upload parsing**: `.xlsx`/`.csv` files are parsed and merged into the database on
  the server (multi-track weekly merge logic, mobile-number matching, backfill of
  "Missed" for untouched learners) — ported from the original client-side logic.
- **Focus-group / priority scoring** (`getFocusGroup`, `getPriority`, `isAtRisk`) is
  duplicated in `server/src/lib/priority.js` and `client/src/lib/priority.js` since both
  sides need it (server for CSV export/bulk-assign, client for live filtering).

## Known follow-ups

- `xlsx` (SheetJS) has two published advisories (ReDoS, prototype pollution) with no
  patched release on the npm registry; SheetJS only ships fixes via their own CDN, which
  isn't reachable from this environment's network policy. Upload is restricted to
  authenticated users and only reads cell values (no formula evaluation), which limits
  exposure, but swap in the CDN-hosted patched build before exposing this to untrusted
  uploads.
- Vite's dev server (`esbuild`) has known dev-only advisories fixed in Vite 6/7/8; those
  majors need a `@vitejs/plugin-react` bump and weren't pulled in here since they don't
  affect the production build output, only the local dev server.
