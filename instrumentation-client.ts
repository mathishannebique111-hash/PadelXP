// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

// Déterminer si c'est un mobile
const isMobile = typeof navigator !== 'undefined' && /iPhone|iPad|Android|Mobile/i.test(navigator.userAgent);

Sentry.init({
  dsn: "https://3597fe03aee95b2372eac5737690bd40@o4510539191615488.ingest.us.sentry.io/4510539211931648",

  // Add optional integrations for additional features
  // Note: Désactiver les Replays sur mobile pour éviter les connexions WebSocket insécurisées
  integrations: isMobile ? [] : [
    Sentry.replayIntegration({
      maskAllText: false,
      blockAllMedia: false,
    }),
  ],

  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  // Enable logs to be sent to Sentry
  enableLogs: true,

  // Define how likely Replay events are sampled.
  // This sets the sample rate to be 10%. You may want this to be 100% while
  // in development and sample at a lower rate in production
  // Désactiver les replays sur mobile
  replaysSessionSampleRate: isMobile ? 0 : (process.env.NODE_ENV === "production" ? 0 : 0.1),

  // Define how likely Replay events are sampled when an error occurs.
  replaysOnErrorSampleRate: isMobile ? 0 : 1.0,

  // Enable sending user PII (Personally Identifiable Information)
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#sendDefaultPii
  sendDefaultPii: true,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
