import * as Sentry from "@sentry/react-router";
import { startTransition, StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";
import { isRouteErrorResponse } from "react-router";
import { HydratedRouter } from "react-router/dom";
import type { BrowserConfig } from "~/telemetry/config";
import {
  privacyOptions,
  sanitizeBreadcrumbData,
  sanitizeText,
  sanitizeUrl,
  isSafeReplayUrls,
} from "~/telemetry/redact";

declare global {
  interface Window {
    __SENTRY_CONFIG__?: BrowserConfig;
  }
}

const config = window.__SENTRY_CONFIG__;
if (config?.dsn && import.meta.env.MODE !== "test") {
  Sentry.init({
    ...privacyOptions,
    ...config,
    initialScope: {
      tags: { service: "browser", runtime: "browser" },
      attributes: { service: "browser", runtime: "browser" },
    },
    integrations: [
      Sentry.reactRouterTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        maskAllInputs: true,
        blockAllMedia: true,
        maskAttributes: ["title", "placeholder", "alt", "href", "src", "action"],
        networkDetailAllowUrls: [],
        networkCaptureBodies: false,
        networkRequestHeaders: [],
        networkResponseHeaders: [],
        beforeAddRecordingEvent(event) {
          if (event.data.tag === "breadcrumb") {
            const payload = event.data.payload;
            if (payload.category === "console") return null;
            if (payload.message) payload.message = sanitizeText(payload.message);
            payload.data = sanitizeBreadcrumbData({ ...payload.data });
          } else if (event.data.tag === "performanceSpan") {
            const payload = event.data.payload;
            payload.description = sanitizeUrl(payload.description);
            payload.data = sanitizeBreadcrumbData({ ...payload.data });
          }
          return event;
        },
      }),
    ],
    tracePropagationTargets: [
      new RegExp(`^${config.appOrigin.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:/|$)`),
      /^\/(?!\/)/,
    ],
  });
  let replayAllowed = isSafeReplayUrls([window.location.href]);
  Sentry.addEventProcessor((event) => {
    if (event.type === "replay_event") {
      replayAllowed &&=
        "urls" in event && isSafeReplayUrls(event.urls) && isSafeReplayUrls([window.location.href]);
      if (!replayAllowed) return null;
      delete event.user;
      delete event.extra;
    }
    return event;
  });
}

startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <HydratedRouter
        instrumentations={[Sentry.createSentryClientInstrumentation({ captureErrors: false })]}
        onError={(error, info) => {
          if (isRouteErrorResponse(error) && error.status < 500) return;
          Sentry.sentryOnError(error, info);
        }}
      />
    </StrictMode>,
    {
      onRecoverableError: Sentry.reactErrorHandler(),
      onUncaughtError: Sentry.reactErrorHandler(),
    },
  );
});
