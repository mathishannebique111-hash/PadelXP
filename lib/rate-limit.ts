import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

let redisClient: Redis | null = null;
try {
  redisClient = Redis.fromEnv();
} catch (error) {
  console.warn(
    "[rate-limit] Upstash Redis not configured. Rate limiting will not work."
  );
}

// Rate limiter pour les tentatives de connexion
export const loginRateLimit = redisClient
  ? new Ratelimit({
      redis: redisClient,
      limiter: Ratelimit.slidingWindow(5, "15 m"), // 5 tentatives / 15 minutes
      analytics: true,
      prefix: "@upstash/ratelimit/login",
    })
  : null;

// Rate limiter pour la soumission de matchs
export const matchSubmissionRateLimit = redisClient
  ? new Ratelimit({
      redis: redisClient,
      limiter: Ratelimit.slidingWindow(5, "5 m"), // 5 matchs / 5 minutes
      analytics: true,
      prefix: "@upstash/ratelimit/match",
    })
  : null;

// Rate limiter pour les reviews
export const reviewSubmissionRateLimit = redisClient
  ? new Ratelimit({
      redis: redisClient,
      limiter: Ratelimit.slidingWindow(1, "1 h"), // 1 review / heure par joueur (clé = review-user:<userId>)
      analytics: true,
      // nouveau préfixe pour repartir sur des compteurs neufs (évite les anciennes clés IP)
      prefix: "@upstash/ratelimit/review-v2",
    })
  : null;

// Rate limiter pour l'inscription
export const signupRateLimit = redisClient
  ? new Ratelimit({
      redis: redisClient,
      limiter: Ratelimit.slidingWindow(3, "1 h"), // 3 comptes / heure par IP
      analytics: true,
      prefix: "@upstash/ratelimit/signup",
    })
  : null;

// Rate limiter général pour les endpoints API
export const apiRateLimit = redisClient
  ? new Ratelimit({
      redis: redisClient,
      // Augmenter le quota général pour les appels API côté serveur
      // 1000 requêtes / 15 minutes par identifiant
      limiter: Ratelimit.slidingWindow(1000, "15 m"),
      analytics: true,
      prefix: "@upstash/ratelimit/api",
    })
  : null;

/**
 * Obtient l'IP du client depuis une requête Next.js
 */
export function getClientIP(req: Request): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  const realIP = req.headers.get("x-real-ip");
  if (realIP) {
    return realIP;
  }

  return "unknown";
}

/**
 * Vérifie le rate limit pour un identifiant donné
 */
export async function checkRateLimit(
  ratelimiter: Ratelimit | null,
  identifier: string
): Promise<{
  success: boolean;
  limit?: number;
  remaining?: number;
  reset?: number;
}> {
  if (!ratelimiter) {
    // Si le rate limiting n'est pas configuré, autoriser la requête
    // En production, vous devriez logger un avertissement
    console.warn(
      "[rate-limit] Rate limiter not configured, allowing request"
    );
    return { success: true };
  }

  try {
    const result = await ratelimiter.limit(identifier);
    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
    };
  } catch (error) {
    console.error("[rate-limit] Error checking rate limit:", error);
    // En cas d'erreur, autoriser la requête pour ne pas bloquer les utilisateurs légitimes
    return { success: true };
  }
}