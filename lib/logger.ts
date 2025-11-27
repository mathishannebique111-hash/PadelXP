import pino from 'pino';

const isDev = process.env.NODE_ENV === 'development';

// En dev : utiliser console.log simple (pas de problèmes de worker)
// En prod : utiliser Pino pour logs structurés et sécurisés
export const logger = isDev ? {
  info: (...args: any[]) => console.log(...args),
  error: (...args: any[]) => console.error(...args),
  warn: (...args: any[]) => console.warn(...args),
  debug: (...args: any[]) => console.debug(...args),
} : pino({
  level: 'info',
  redact: {
    paths: [
      '*.password',
      '*.token',
      '*.email',
      '*.phone',
      '*.user_id',
      '*.userId',
      'req.headers.authorization',
      'req.headers.cookie',
    ],
    remove: true,
  },
});
