FROM node:24-bookworm-slim AS dependencies
WORKDIR /app
RUN chown node:node /app
USER node
COPY --chown=node:node package.json package-lock.json ./
RUN npm ci

FROM dependencies AS development
COPY --chown=node:node . .
ENV NODE_ENV=development SENTRY_SERVICE=web
EXPOSE 5173
CMD ["node", "--conditions=development", "--import", "tsx", "--import", "./telemetry/register.server.ts", "./node_modules/@react-router/dev/bin.cjs", "dev"]

FROM development AS build
ARG SENTRY_RELEASE=blueprint@local
RUN SENTRY_RELEASE="$SENTRY_RELEASE" npm run build:web

FROM node:24-bookworm-slim AS production
WORKDIR /app
RUN chown node:node /app
USER node
COPY --chown=node:node package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build --chown=node:node /app/build/web ./build/web
ENV NODE_ENV=production SENTRY_SERVICE=web
ENV HOST=0.0.0.0 PORT=3000
EXPOSE 3000
CMD ["node", "--import", "./build/web/telemetry.js", "./node_modules/@react-router/serve/bin.cjs", "./build/web/server/index.js"]
