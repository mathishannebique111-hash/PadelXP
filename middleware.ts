import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { logger } from "@/lib/logger";
import { isAdmin } from "@/lib/admin-auth";



const generalRatelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(1000, "15 m"),
  analytics: true,
  prefix: "ratelimit:general",
});



const loginRatelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(20, "15 m"), // 20 tentatives / 15 minutes
  analytics: true,
  prefix: "ratelimit:login",
});



const matchSubmitRatelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, "5 m"),
  analytics: true,
  prefix: "ratelimit:match",
});


// Fonction pour détecter l'app mobile Capacitor
function isCapacitorApp(userAgent: string): boolean {
  return userAgent.toLowerCase().includes('padelxpcapacitor');
}


// URLs réservées aux clubs (bloquées dans l'app mobile)
const CLUB_ONLY_URLS = [
  "/clubs",
  "/clubs/login",
  "/clubs/signup",
  "/signup",
  "/onboarding/club",
  "/dashboard",
  "/dashboard/membres",
  "/dashboard/classement",
  "/dashboard/historique",
  "/dashboard/page-club",
  "/dashboard/challenges",
  "/dashboard/tournaments",
  "/dashboard/roles",
  "/dashboard/facturation",
  "/dashboard/import-export",
  "/dashboard/aide",
];

// URLs réservées aux joueurs (bloquées sur le web en production)
const PLAYER_ONLY_URLS = [
  "/player/signup",
  "/player/login",
  "/player/dashboard",
  "/player/profile",
  "/player/settings",
  "/player/stats",
  "/player/matches",
  "/player/badges",
  "/leaderboard",
  "/matches/submit",
];



export async function middleware(req: NextRequest) {
  // Exclure les webhooks Stripe du middleware
  if (req.nextUrl.pathname === '/api/stripe/webhook') {
    return NextResponse.next();
  }
  // 1) Si la requête vient de Vercel Cron, on la laisse passer (pas de rate limiting)
  if (req.headers.get("x-vercel-cron") === "1") {
    return NextResponse.next();
  }


  // Normaliser le pathname
  const { pathname } = req.nextUrl;
  const normalizedPathname = pathname.endsWith("/") && pathname !== "/" 
    ? pathname.slice(0, -1) 
    : pathname;


  // BLOQUER LES URLs CLUB DANS L'APP MOBILE
  const userAgent = req.headers.get('user-agent') || '';
  if (isCapacitorApp(userAgent)) {
    const isClubUrl = CLUB_ONLY_URLS.some(url => 
      normalizedPathname === url || normalizedPathname.startsWith(url + '/')
    );
    
    if (isClubUrl) {
      logger.info({ path: normalizedPathname }, "[Middleware] Club URL blocked in mobile app");
      const url = req.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
  }

  // BLOQUER LES URLs JOUEURS SUR LE WEB (selon variable d'environnement)
  if (!isCapacitorApp(userAgent)) {
    // Vérifier si le blocage est activé (true en production, false en local/preview)
    const blockPlayersOnWeb = process.env.BLOCK_PLAYERS_ON_WEB === 'true';
    
    if (blockPlayersOnWeb) {
      const isPlayerUrl = PLAYER_ONLY_URLS.some(url => 
        normalizedPathname === url || normalizedPathname.startsWith(url + '/')
      );
      
      if (isPlayerUrl) {
        logger.info({ path: normalizedPathname }, "[Middleware] Player URL blocked on website");
        const url = req.nextUrl.clone();
        url.pathname = "/download";
        return NextResponse.redirect(url);
      }
    }
  }



  // RATE LIMITING - Appliqué avant toute autre logique
  const ip = req.ip ?? req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "127.0.0.1";
  const pathnameForRateLimit = normalizedPathname;



  // Variables pour stocker les informations de rate limiting (pour les headers de réponse)
  let rateLimitInfo: { limit: string; remaining: number; reset: number } | null = null;



  try {
    // Rate limiting pour les tentatives de connexion (uniquement POST vers les API d'auth)
    // Ne pas appliquer aux visites simples de pages (GET) ni aux pages de réinitialisation
    const isLoginApiCall = 
      (pathnameForRateLimit.startsWith("/api/auth/login") || 
       pathnameForRateLimit.startsWith("/api/auth/callback")) &&
      req.method === "POST";
    
    // Ne pas appliquer le rate limiting aux visites simples de la page /login (GET)
    // ni aux pages de réinitialisation de mot de passe
    if (isLoginApiCall) {
      const { success, remaining, reset } = await loginRatelimit.limit(ip);
      if (!success) {
        return NextResponse.json(
          { error: "Trop de tentatives de connexion. Réessayez dans 15 minutes.", retryAfter: reset },
          { status: 429 }
        );
      }
      rateLimitInfo = { limit: "15", remaining, reset };
    }



    // Rate limiting pour la soumission de matchs
    if (pathnameForRateLimit === "/api/matches/submit") {
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
                setAll() {},
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



    // Rate limiting général pour toutes les routes API
    if (
      pathnameForRateLimit.startsWith("/api/") &&
      !pathnameForRateLimit.startsWith("/api/cron/trial-check") &&
      !pathnameForRateLimit.startsWith("/api/send-trial-reminder") &&
      !pathnameForRateLimit.startsWith("/api/webhooks/") &&
      pathnameForRateLimit !== "/api/resend-inbound" &&
      pathnameForRateLimit !== "/api/matches/submit"
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
    logger.error({ error: error instanceof Error ? error.message : String(error), context: 'rate-limiting', pathname: pathnameForRateLimit }, "[Middleware] Rate limiting error:");
  }



  // 2) Laisser passer le cron, l'API d'email et les webhooks
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
    "/api/referrals/",
    "/_next/", 
    "/images/", 
    "/onboarding/"
  ];
  
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
    "/download",  // NOUVEAU : page de téléchargement app
    "/forgot-password",  // Page de réinitialisation de mot de passe
    "/reset-password",  // Page de définition du nouveau mot de passe
    "/terms", 
    "/privacy", 
    "/legal", 
    "/cgv", 
    "/cookies",
    "/player/legal",
    "/player/terms",
    "/player/privacy",
    "/player/cookies",
    "/about", 
    "/contact"
  ]);
  
  const API_ROUTES_THAT_HANDLE_AUTH = ["/api/matches/", "/api/reviews"];
  const isApiRouteThatHandlesAuth = API_ROUTES_THAT_HANDLE_AUTH.some((p) => normalizedPathname.startsWith(p));
  const isPublic = PUBLIC_PATHS.has(normalizedPathname) || PUBLIC_PREFIXES.some((p) => normalizedPathname.startsWith(p));
  const isProtected = !isPublic && !isApiRouteThatHandlesAuth;
  const isApiRoute = normalizedPathname.startsWith("/api/");



  // Si la route est publique, laisser passer immédiatement
  if (isPublic) {
    const publicResponse = NextResponse.next();
    if (rateLimitInfo) {
      publicResponse.headers.set("X-RateLimit-Limit", rateLimitInfo.limit);
      publicResponse.headers.set("X-RateLimit-Remaining", rateLimitInfo.remaining.toString());
      publicResponse.headers.set("X-RateLimit-Reset", rateLimitInfo.reset.toString());
    }
    return publicResponse;
  }



  const res = NextResponse.next();
  
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



  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();



  // Vérifier l'inactivité
  if (session) {
    const now = Date.now();
    const lastActivityCookie = req.cookies.get("last_activity")?.value;
    
    if (lastActivityCookie) {
      const lastActivity = parseInt(lastActivityCookie, 10);
      if (!isNaN(lastActivity)) {
        const inactiveMinutes = (now - lastActivity) / (1000 * 60);
        
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
    
    if (isProtected) {
      res.cookies.set("last_activity", now.toString(), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 30 * 60,
        path: "/",
      });
    }
  }



  // Vérifier l'expiration de la session
  if (session?.expires_at) {
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = session.expires_at;
    const expiresIn = expiresAt - now;
    
    if (expiresIn < 60) {
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



  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();



  if (!user && !session && isProtected) {
    if (isApiRoute && !isApiRouteThatHandlesAuth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!isApiRoute) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
  }



  if (session && !user && userError) {
    logger.warn({ errorCode: userError?.code, errorMessage: userError?.message, path: normalizedPathname?.substring(0, 30) + "…" || 'unknown' }, "[Middleware] Session exists but getUser() failed (temporary error?):");
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
  
  if (!session && req.cookies.get("last_activity")) {
    res.cookies.set("last_activity", "", { expires: new Date(0), path: "/" });
  }



  // Admin redirection logic
  if (user) {
    // Vérifier si l'utilisateur est admin via la base de données (plus fiable que juste l'email)
    let userIsAdmin = false;
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .maybeSingle();
      userIsAdmin = profile?.is_admin || false;
      
      // Fallback sur la fonction isAdmin basée sur l'email si pas de profil ou is_admin null
      if (!userIsAdmin) {
        userIsAdmin = isAdmin(user.email);
      }
    } catch (e) {
      // En cas d'erreur, utiliser la fonction basée sur l'email
      userIsAdmin = isAdmin(user.email);
    }
    
    // Protect admin routes - rediriger uniquement si vraiment non-admin
    if (normalizedPathname.startsWith('/admin')) {
      if (!userIsAdmin) {
        const url = req.nextUrl.clone();
        url.pathname = '/home';
        return NextResponse.redirect(url);
      }
      // Si admin et sur route admin, continuer normalement (pas de redirection)
    }
    
    // Redirect admin users to admin messages when accessing player entry pages
    // MAIS seulement si l'admin n'est pas déjà en train de naviguer dans l'admin
    // (vérifier le referer pour éviter les redirections lors de la navigation admin)
    const referer = req.headers.get('referer') || '';
    const isComingFromAdmin = referer.includes('/admin');
    
    // Rediriger les admins vers /admin/messages au lieu de /home ou autres pages joueur
    if (
      userIsAdmin &&
      !isComingFromAdmin &&
      (normalizedPathname === "/player/login" ||
        normalizedPathname === "/player/signup" ||
        normalizedPathname === "/player/dashboard" ||
        normalizedPathname === "/player/onboarding" ||
        normalizedPathname === "/home")
    ) {
      const url = req.nextUrl.clone();
      url.pathname = "/admin/messages";
      return NextResponse.redirect(url);
    }
    
    // Redirect logged-in users away from login/signup pages
    if (normalizedPathname === "/signup" || normalizedPathname === "/login") {
      if (userIsAdmin) {
        const url = req.nextUrl.clone();
        url.pathname = "/admin/messages";
        return NextResponse.redirect(url);
      } else {
        const url = req.nextUrl.clone();
        url.pathname = "/home";
        return NextResponse.redirect(url);
      }
    }
  }



  return res;
}



export const config = {
  matcher: ["/(.*)"],
};
