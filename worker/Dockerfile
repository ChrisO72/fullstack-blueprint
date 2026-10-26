FROM node:24-bookworm-slim AS dependencies
WORKDIR /app
RUN chown node:node /app
USER node
COPY --chown=node:node package.json package-lock.json ./
RUN npm ci

FROM dependencies AS development
COPY --chown=node:node . .
ENV NODE_ENV=development SENTRY_SERVICE=worker
CMD ["node", "--conditions=development", "--import", "tsx", "--import", "./telemetry/register.server.ts", "worker/index.ts"]

FROM development AS build
ARG SENTRY_RELEASE=blueprint@local
RUN SENTRY_RELEASE="$SENTRY_RELEASE" npm run build:worker

FROM node:24-bookworm-slim AS production
WORKDIR /app
RUN chown node:node /app
USER node
COPY --chown=node:node package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build --chown=node:node /app/build/worker ./build/worker
ENV NODE_ENV=production SENTRY_SERVICE=worker
CMD ["node", "--import", "./build/worker/telemetry.js", "build/worker/index.js"]
