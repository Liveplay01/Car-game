# Car Game server – players and leaderboards, on port 5051.
# Coolify builds this from the repository: Base Directory /Server, Dockerfile /Dockerfile.
# No build step: Node runs the TypeScript directly (type stripping), SQLite is built into Node.
FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund
COPY src ./src
# The database lives in a volume: mount it at /data (Coolify → Persistent Storage).
# A new named volume takes over the owner of this folder, so the node user can write to it.
RUN mkdir -p /data && chown node:node /data
VOLUME /data
ENV DB_PATH=/data/car-game.db PORT=5051
USER node
EXPOSE 5051
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:5051/healthz || exit 1
CMD ["node", "--disable-warning=ExperimentalWarning", "src/server.ts"]
