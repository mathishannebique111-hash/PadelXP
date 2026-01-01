import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { logger } from "@/lib/logger";

const generalRatelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  // Augmenter le quota général pour éviter les 429 sur les actions normales des joueurs
  // 1000 requêtes / 15 minutes par IP
  limiter: Ratelimit.slidingWindow(1000, "15 m"),
  analytics: true,
  prefix: "ratelimit:general",
});

const loginRatelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, "15 m"),
  analytics: true,
  prefix: "ratelimit:login",
});

const matchSubmitRatelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, "5 m"),
  analytics: true,
  prefix: "ratelimit:match",
});

export async function middleware(req: NextRequest) {
  // Exclure les webhooks Stripe du middleware
  if (req.nextUrl.pathname === '/api/stripe/webhook') {
    return NextResponse.next();
  }
  // 1) Si la requête vient de Vercel Cron, on la laisse passer (pas de rate limiting)
  if (req.headers.get("x-vercel-cron") === "1") {
    return NextResponse.next();
  }

  // RATE LIMITING - Appliqué avant toute autre logique
  const ip = req.ip ?? req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "127.0.0.1";
  const pathnameForRateLimit = req.nextUrl.pathname;

  // Variables pour stocker les informations de rate limiting (pour les headers de réponse)
  let rateLimitInfo: { limit: string; remaining: number; reset: number } | null = null;

  try {
    // Rate limiting pour les tentatives de connexion
    if (pathnameForRateLimit.startsWith("/login") || pathnameForRateLimit.startsWith("/api/auth/login") || pathnameForRateLimit.startsWith("/api/auth/callback")) {
      const { success, remaining, reset } = await loginRatelimit.limit(ip);
      if (!success) {
        return NextResponse.json(
          { error: "Trop de tentatives de connexion. Réessayez dans 15 minutes.", retryAfter: reset },
          { status: 429 }
        );
      }
      rateLimitInfo = { limit: "5", remaining, reset };
    }

    // Rate limiting pour la soumission de matchs
    if (pathnameForRateLimit === "/api/matches/submit") {
      // Identifier par joueur connecté si possible, sinon par IP
      let rateLimitId = req.headers.get("x-user-id") || null;
      if (!rateLimitId) {
        try {
          const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
              cookies: {
                getAll() {
                  return req.cookies.getAll();
                },
                setAll() {
                  // no-op in middleware
                },
              },
            }
          );
          const { data: { user } } = await supabase.auth.getUser();
          if (user?.id) {
            rateLimitId = user.id;
          }
        } catch (e) {
          logger.warn({ error: e instanceof Error ? e.message : String(e) }, "[Middleware] Unable to resolve user for match rate-limit, fallback to IP");
        }
      }
      rateLimitId = rateLimitId || ip;

      const { success, remaining, reset } = await matchSubmitRatelimit.limit(rateLimitId);
      if (!success) {
        return NextResponse.json(
          { error: "Trop de matchs soumis. Limite: 5 matchs par 5 minutes.", retryAfter: reset },
          { status: 429 }
        );
      }
      rateLimitInfo = { limit: "5", remaining, reset };
    }

    // Rate limiting général pour toutes les routes API (sauf celles déjà gérées et les webhooks/cron)
    if (
      pathnameForRateLimit.startsWith("/api/") &&
      !pathnameForRateLimit.startsWith("/api/cron/trial-check") &&
      !pathnameForRateLimit.startsWith("/api/send-trial-reminder") &&
      !pathnameForRateLimit.startsWith("/api/webhooks/") &&
      pathnameForRateLimit !== "/api/resend-inbound" &&
      pathnameForRateLimit !== "/api/matches/submit" // Déjà géré ci-dessus
    ) {
      const { success, remaining, reset } = await generalRatelimit.limit(ip);
      if (!success) {
        return NextResponse.json(
          { error: "Trop de requêtes. Réessayez plus tard.", retryAfter: reset },
          { status: 429 }
        );
      }
      rateLimitInfo = { limit: "1000", remaining, reset };
    }
  } catch (error) {
    // En cas d'erreur de rate limiting (Redis indisponible par exemple), on continue
    // pour ne pas bloquer l'application, mais on log l'erreur
    logger.error({ error: error instanceof Error ? error.message : String(error), context: 'rate-limiting', pathname: pathnameForRateLimit }, "[Middleware] Rate limiting error:");
    // Continuer avec le reste de la logique
  }

  // Normaliser le pathname : enlever le trailing slash et convertir en minuscules pour la comparaison
  const { pathname } = req.nextUrl;
  const normalizedPathname = pathname.endsWith("/") && pathname !== "/" 
    ? pathname.slice(0, -1) 
    : pathname;

  // 2) Laisser passer le cron, l'API d'email et les webhooks aussi par sécurité
  if (
    normalizedPathname.startsWith("/api/cron/trial-check") ||
    normalizedPathname.startsWith("/api/send-trial-reminder") ||
    normalizedPathname.startsWith("/api/webhooks/") ||
    normalizedPathname === "/api/resend-inbound" ||
    normalizedPathname === "/api/trial/check-extensions"
  ) {
    return NextResponse.next();
  }

  // Définir les routes publiques AVANT toute vérification d'authentification
  const PUBLIC_PREFIXES = [
    "/api/auth/", 
    "/api/leaderboard/", 
    "/api/players/", 
    "/api/clubs/", 
    "/api/public/", 
    "/api/challenges/", 
    "/api/player/", 
    "/api/referrals/", // Permettre la validation des codes de parrainage lors de l'inscription
    "/_next/", 
    "/images/", 
    "/onboarding/"
    // Note: /dashboard/ et /player/ ne sont PAS publics - ces routes nécessitent une authentification
  ]; // toujours publics
  
  const PUBLIC_PATHS = new Set([
    "/", 
    "/login", 
    "/signup", 
    "/clubs", 
    "/clubs/login", 
    "/clubs/signup", 
    "/favicon.ico", 
    "/onboarding", 
    "/onboarding/club", 
    "/dashboard", 
    "/player/login", 
    "/player/signup", 
    // Pages légales clubs (déjà publiques)
    "/terms", 
    "/privacy", 
    "/legal", 
    "/cgv", 
    "/cookies", 
    // Pages légales joueurs (à rendre accessibles sans connexion)
    "/player/legal",
    "/player/terms",
    "/player/privacy",
    "/player/cookies",
    "/about", 
    "/contact"
  ]);
  
  // Les routes API protégées doivent gérer l'authentification elles-mêmes
  const API_ROUTES_THAT_HANDLE_AUTH = ["/api/matches/", "/api/reviews"];
  const isApiRouteThatHandlesAuth = API_ROUTES_THAT_HANDLE_AUTH.some((p) => normalizedPathname.startsWith(p));
  const isPublic = PUBLIC_PATHS.has(normalizedPathname) || PUBLIC_PREFIXES.some((p) => normalizedPathname.startsWith(p));
  const isProtected = !isPublic && !isApiRouteThatHandlesAuth; // tout sauf public et routes API qui gèrent leur propre auth
  const isApiRoute = normalizedPathname.startsWith("/api/");

  // Si la route est publique, laisser passer immédiatement sans vérification d'authentification
  if (isPublic) {
    const publicResponse = NextResponse.next();
    // Ajouter les headers de rate limiting si appliqué
    if (rateLimitInfo) {
      publicResponse.headers.set("X-RateLimit-Limit", rateLimitInfo.limit);
      publicResponse.headers.set("X-RateLimit-Remaining", rateLimitInfo.remaining.toString());
      publicResponse.headers.set("X-RateLimit-Reset", rateLimitInfo.reset.toString());
    }
    return publicResponse;
  }

  const res = NextResponse.next();
  
  // Ajouter les headers de rate limiting à la réponse si appliqué
  if (rateLimitInfo) {
    res.headers.set("X-RateLimit-Limit", rateLimitInfo.limit);
    res.headers.set("X-RateLimit-Remaining", rateLimitInfo.remaining.toString());
    res.headers.set("X-RateLimit-Reset", rateLimitInfo.reset.toString());
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          res.cookies.set(name, value, options);
        },
        remove(name: string, options: any) {
          res.cookies.set(name, "", { ...options, expires: new Date(0) });
        },
      },
    }
  );

  // Vérifier d'abord la session pour éviter les déconnexions inattendues
  // Si une session existe mais getUser() échoue temporairement, on ne déconnecte pas
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  // Vérifier l'inactivité : déconnecter après 29 minutes d'inactivité
  if (session) {
    const now = Date.now();
    const lastActivityCookie = req.cookies.get("last_activity")?.value;
    
    // Si le cookie existe, vérifier l'inactivité
    if (lastActivityCookie) {
      const lastActivity = parseInt(lastActivityCookie, 10);
      if (!isNaN(lastActivity)) {
        const inactiveMinutes = (now - lastActivity) / (1000 * 60); // minutes
        
        // Si plus de 29 minutes d'inactivité, déconnecter
        if (inactiveMinutes > 29) {
          await supabase.auth.signOut();
          res.cookies.set("last_activity", "", { expires: new Date(0) });
          if (isProtected && !isApiRoute) {
            const url = req.nextUrl.clone();
            url.pathname = "/login";
            return NextResponse.redirect(url);
          }
          if (isProtected && isApiRoute && !isApiRouteThatHandlesAuth) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
          }
          return res;
        }
      }
    }
    
    // Mettre à jour la dernière activité pour les routes protégées
    // (créer ou mettre à jour le cookie même s'il n'existe pas encore)
    if (isProtected) {
      res.cookies.set("last_activity", now.toString(), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 30 * 60, // 30 minutes (légèrement plus que le timeout pour éviter les problèmes de timing)
        path: "/",
      });
    }
  }

  // Si une session existe, vérifier son expiration (Supabase: 1 heure par défaut)
  if (session?.expires_at) {
    const now = Math.floor(Date.now() / 1000); // timestamp en secondes
    const expiresAt = session.expires_at;
    
    // Vérifier l'expiration de la session
    // On accepte la session si elle expire dans plus de 1 minute
    const expiresIn = expiresAt - now;
    
    // Si la session expire dans moins de 1 minute, considérer comme expirée
    if (expiresIn < 60) {
      // Session expirée, déconnecter
      await supabase.auth.signOut();
      res.cookies.set("last_activity", "", { expires: new Date(0) });
      if (isProtected && !isApiRoute) {
        const url = req.nextUrl.clone();
        url.pathname = "/login";
        return NextResponse.redirect(url);
      }
      if (isProtected && isApiRoute && !isApiRouteThatHandlesAuth) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      return res;
    }
  }

  // Essayer d'obtenir l'utilisateur avec gestion d'erreur gracieuse
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  // Si getUser() échoue mais qu'une session existe, c'est probablement une erreur temporaire
  // On permet la navigation pour éviter les déconnexions inattendues
  if (!user && !session && isProtected) {
    // Pas de session ni d'utilisateur : déconnecté
    if (isApiRoute && !isApiRouteThatHandlesAuth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!isApiRoute) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
  }

  // Si une session existe mais getUser() échoue temporairement, on ne bloque pas la requête
  // Cela permet d'éviter les déconnexions inattendues dues à des problèmes réseau temporaires
  if (session && !user && userError) {
    // Erreur temporaire probable : loguer mais ne pas déconnecter
    logger.warn({ errorCode: userError?.code, errorMessage: userError?.message, path: normalizedPathname?.substring(0, 30) + "…" || 'unknown' }, "[Middleware] Session exists but getUser() failed (temporary error?):");
    // Laisser passer la requête si une session existe et mettre à jour last_activity
    // pour éviter que l'inactivité soit comptée pendant une erreur temporaire
    if (isProtected) {
      const now = Date.now();
      res.cookies.set("last_activity", now.toString(), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 30 * 60,
        path: "/",
      });
    }
    return res;
  }
  
  // Si aucune session n'existe, supprimer le cookie last_activity s'il existe
  if (!session && req.cookies.get("last_activity")) {
    res.cookies.set("last_activity", "", { expires: new Date(0), path: "/" });
  }

  // Si l'utilisateur est connecté et tente d'accéder à login/signup, rediriger
  if (user && (normalizedPathname === "/signup" || normalizedPathname === "/login")) {
    const url = req.nextUrl.clone();
    // Utilisateur déjà connecté: on le redirige vers la page protégée principale
    url.pathname = "/home";
    return NextResponse.redirect(url);
  }

  return res;
}

export const config = {
  matcher: ["/(.*)"],
};
