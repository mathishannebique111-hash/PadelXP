import pino from 'pino';
import * as Sentry from "@sentry/nextjs";
import { logger } from '@/lib/logger';

const isDev = process.env.NODE_ENV === 'development';
const isTest = process.env.NODE_ENV === 'test';

// Configuration simple sans transport pour éviter les problèmes de worker thread
const pinoConfig: pino.LoggerOptions = {
  level: isTest ? 'silent' : (isDev ? 'debug' : 'info'),
  
  // Désactiver hostname et pid pour réduire la taille des logs et améliorer les performances
  base: {
    hostname: false,
    pid: false,
  },
  
  // Format de base sans pino-pretty pour éviter les erreurs de worker
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },

  redact: {
    paths: [
      '*.password', '*.token', '*.email', '*.phone',
      'req.headers.authorization', 'req.headers.cookie',
    ],
    remove: true,
  },
};

const baseLogger = pino(pinoConfig);

const createLogger = (instance: pino.Logger) => ({
  info: (msg: string, context?: any) => instance.info(context || {}, msg),
  error: (msg: string, context?: any) => {
    instance.error(context || {}, msg);
    if (context?.error instanceof Error) {
      Sentry.captureException(context.error, { extra: context });
    }
  },
  warn: (msg: string, context?: any) => {
    instance.warn(context || {}, msg);
    // Capturer aussi les warnings importants dans Sentry
    if (context?.captureInSentry) {
      Sentry.captureMessage(msg, { level: 'warning', extra: context });
    }
  },
  debug: (msg: string, context?: any) => instance.debug(context || {}, msg),
  child: (bindings: any) => createLogger(instance.child(bindings)),
});

export const logger = createLogger(baseLogger);

export const logError = (error: any, context?: any) => {
  if (error instanceof Error) {
    logger.error(error.message, { ...context, error, stack: error.stack });
    Sentry.captureException(error, { extra: context });
  } else {
    logger.error('Unknown error', { ...context, error: String(error) });
    Sentry.captureMessage(`Unknown error: ${String(error)}`, { 
      level: 'error', 
      extra: context 
    });
  }
};

// Helpers pour contextes communs
export const withUser = (userId: string, extra?: any) => ({
  userId,
  ...extra,
});

export const withClub = (clubId: string, extra?: any) => ({
  clubId,
  ...extra,
});

export const withMatch = (matchId: string, extra?: any) => ({
  matchId,
  ...extra,
});

export const withRequest = (req: Request, extra?: any) => ({
  method: req.method,
  url: req.url,
  ...extra,
});
