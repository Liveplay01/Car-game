# Car Game – browser game, served as a static site by nginx on port 5050.
# Coolify builds this Dockerfile straight from the repository root.

# Stage 1: build the Vite app (type-check included).
FROM node:22-alpine AS build
WORKDIR /app
COPY Web/package.json Web/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY Web/ ./
# Optional TURN relay for multiplayer on mobile data (see Web/README.md, Multiplayer).
# Empty by default: the game then uses public STUN only.
ARG VITE_TURN_URL=""
ARG VITE_TURN_USERNAME=""
ARG VITE_TURN_CREDENTIAL=""
ENV VITE_TURN_URL=$VITE_TURN_URL VITE_TURN_USERNAME=$VITE_TURN_USERNAME VITE_TURN_CREDENTIAL=$VITE_TURN_CREDENTIAL
RUN npm run build

# Stage 2: only the built files and nginx.
FROM nginx:alpine AS production
COPY Web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 5050
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:5050/healthz || exit 1
