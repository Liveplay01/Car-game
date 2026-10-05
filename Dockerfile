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
# Optional: address of the leaderboard service (Server/), e.g. https://api.example.com.
# Empty by default: the game then has no leaderboard. nginx.conf must allow it in connect-src.
ARG VITE_API_URL=""
ENV VITE_API_URL=$VITE_API_URL
# Optional: "1" switches on Google's rewarded ads (free chest, free upgrade step, Skin Upgrade boost) on the
# normal site and in the Play app (Web/README.md, Rewarded ads). Needs an AdSense account approved for H5 Games Ads.
# Empty by default: the game's own three-second placeholder plays instead.
ARG VITE_REWARDED_ADS=""
ENV VITE_REWARDED_ADS=$VITE_REWARDED_ADS
RUN npm run build

# Stage 2: only the built files and nginx.
FROM nginx:alpine AS production
COPY Web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 5050
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:5050/healthz || exit 1
