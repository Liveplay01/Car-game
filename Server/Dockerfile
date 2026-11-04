# Car Game server – players and leaderboards, on port 5051.
# Coolify builds this from the repository root: Base Directory /, Dockerfile /Server/Dockerfile.
# The game's rules (Web/src/core) are bundled once so the service can replay submitted runs (record proof).
FROM node:22-alpine AS proof
WORKDIR /repo/Web
COPY Web/package.json Web/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY Web ./
RUN npm run build:proof

FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY Server/package.json Server/package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund
COPY Server/src ./src
COPY --from=proof /repo/Server/proof ./proof
# The database lives in a volume: mount it at /data (Coolify → Persistent Storage).
# A new named volume takes over the owner of this folder, so the node user can write to it.
RUN mkdir -p /data && chown node:node /data
VOLUME /data
ENV DB_PATH=/data/car-game.db PORT=5051
USER node
EXPOSE 5051
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3   CMD wget -q -O /dev/null http://127.0.0.1:5051/healthz || exit 1
CMD ["node", "--disable-warning=ExperimentalWarning", "src/server.ts"]
