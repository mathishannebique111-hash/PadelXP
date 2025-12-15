import pino from 'pino';

const isDev = process.env.NODE_ENV === 'development';
const isTest = process.env.NODE_ENV === 'test';

// Configuration simple sans transport pour éviter les problèmes de worker thread
const pinoConfig: pino.LoggerOptions = {
  level: isTest ? 'silent' : (isDev ? 'debug' : 'info'),
  
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
  error: (msg: string, context?: any) => instance.error(context || {}, msg),
  warn: (msg: string, context?: any) => instance.warn(context || {}, msg),
  debug: (msg: string, context?: any) => instance.debug(context || {}, msg),
  child: (bindings: any) => createLogger(instance.child(bindings)),
});

export const logger = createLogger(baseLogger);

export const logError = (error: any, context?: any) => {
  if (error instanceof Error) {
    logger.error(error.message, { ...context, stack: error.stack });
  } else {
    logger.error('Unknown error', { ...context, error: String(error) });
  }
};
