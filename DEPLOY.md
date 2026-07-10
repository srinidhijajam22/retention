# Deploying the BEL Retention Dashboard

The app is a single Node.js service in production: Express serves both the API
(`/api/*`) and the built React frontend from the same process/port, so you only need
**one** web service on your host — no separate frontend hosting, no CORS setup.

This guide uses [Render](https://render.com) (free tier available, persistent disks,
GitHub-connected auto-deploys). The same build/start commands work on Railway, Fly.io,
or any other Node host — only the dashboard screens differ.

## Before you deploy — real learner data is involved

This app seeds real names/phone numbers/emails (the BEL C17 roster) and, in dev mode
only, a shared default password. **Do not deploy without setting the two environment
variables below** — the app will actually refuse to start/seed without them once
`NODE_ENV=production` is set, so this isn't optional:

- `JWT_SECRET` — a long random string (e.g. run `openssl rand -hex 32` locally and paste
  the output). Signs login sessions; anyone who has it can forge a valid login.
- `SEED_PASSWORD` — a strong password for the five seeded accounts (`shibu`, `admin`,
  `team`, `manasvi`, `srinidhi`). Share it with your team over a private channel, not in
  the repo or a support ticket.

## Steps (Render)

1. **Push this branch to GitHub** if you haven't already (`git push`) — Render deploys
   straight from a GitHub repo/branch.
2. **Create a Render account** at [render.com](https://render.com) if you don't have one,
   and connect your GitHub account when prompted.
3. **New + → Web Service**, pick the `retention` repo, branch
   `claude/full-stack-app-setup-s4o5we` (or wherever this ends up merged).
4. Configure the service:
   - **Runtime**: Node
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`
5. **Add a Persistent Disk** (Render dashboard → your service → Disks → Add Disk):
   - **Mount path**: `/data`
   - This is what makes the SQLite database survive restarts/redeploys — without it,
     every deploy wipes the data.
6. **Environment variables** (Render dashboard → Environment):
   | Key | Value |
   |---|---|
   | `NODE_ENV` | `production` |
   | `JWT_SECRET` | *(your random string from above)* |
   | `SEED_PASSWORD` | *(your chosen team password)* |
   | `DB_PATH` | `/data/retention.db` |
7. **Deploy**. The `npm start` command only runs the API server — it does not seed the
   database automatically on Render, so run the seed once after the first deploy
   finishes:
   - Render dashboard → your service → **Shell** tab → run:
     ```bash
     npm run seed
     ```
   - You only need to do this once; re-running later is harmless (it skips
     users/cohorts/learners that already exist, so it won't duplicate data or reset
     anyone's password).
8. Render gives you a public URL like `https://retention-xxxx.onrender.com` — that's your
   real, shareable link. Log in with any of the five usernames and your `SEED_PASSWORD`.

## Steps (Docker — Railway, Fly.io, or any container host)

A `Dockerfile` is included at the repo root and does the seed step automatically on
every container start (`CMD ["sh", "-c", "node src/seed.js && node src/index.js"]`).

1. Point your host at this repo/Dockerfile.
2. Attach a persistent volume mounted at `/data` (the image already sets
   `DB_PATH=/data/retention.db`).
3. Set `JWT_SECRET` and `SEED_PASSWORD` as environment variables/secrets on the host.
4. Deploy — the container seeds on boot and starts serving on port 4000 (map your host's
   public port to container port 4000).

## After deploying

- **Change the shared password eventually to per-user passwords.** This app currently
  seeds one shared password across all five accounts (matching the original dashboard's
  design) — fine to get started, but if this becomes long-lived infrastructure, consider
  adding per-user password management rather than one shared secret.
- **Back up `/data/retention.db` periodically** — it's the only copy of your outreach
  logs and call history once you're live.
