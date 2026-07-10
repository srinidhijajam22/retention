# Multi-stage build: compile the React frontend, then ship it alongside the
# Express API in a single production image. Node's official image includes
# what better-sqlite3 needs to install its prebuilt binary.

FROM node:22-slim AS client-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ .
RUN npm run build

FROM node:22-slim AS server
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci --omit=dev
COPY server/ .
COPY --from=client-build /app/client/dist /app/client/dist

# SQLite file lives here — mount a persistent volume at this path on your host
# (Render "Persistent Disk", Railway "Volume", etc.) so data survives restarts/deploys.
ENV DB_PATH=/data/retention.db
VOLUME ["/data"]

ENV NODE_ENV=production
EXPOSE 4000
CMD ["sh", "-c", "node src/seed.js && node src/index.js"]
