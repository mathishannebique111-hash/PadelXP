import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { logger } from "@/lib/logger";
import { isAdmin } from "@/lib/admin-auth";



// Initialisation sécurisée de Redis pour éviter le crash au démarrage
const redisUrl = process.env.UPSTASH_REDIS_REST_URL?.replace(/"/g, '') || '';
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN?.replace(/"/g, '') || '';

const redisClient = (redisUrl && redisToken)
  ? new Redis({ url: redisUrl, token: redisToken })
  : null;

// Helper pour créer un ratelimiter seulement si Redis est dispo
const createRatelimit = (limiter: any, prefix: string) => {
  if (!redisClient) return null;
  return new Ratelimit({
    redis: redisClient,
    limiter,
    analytics: true,
    prefix,
  });
};

const generalRatelimit = createRatelimit(Ratelimit.slidingWindow(1000, "15 m"), "ratelimit:general");
const loginRatelimit = createRatelimit(Ratelimit.slidingWindow(20, "15 m"), "ratelimit:login");
const matchSubmitRatelimit = createRatelimit(Ratelimit.slidingWindow(5, "5 m"), "ratelimit:match");


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
  // Console log pour debug
  if (req.nextUrl.pathname.startsWith('/api/players/find-or-create')) {
    console.log('[Middleware] Handling request for:', req.nextUrl.pathname);
  }

  // Exclure les webhooks Stripe du middleware
  if (req.nextUrl.pathname === '/api/stripe/webhook') {
    return NextResponse.next();
  }

  // Debug pour la route /share
  if (req.nextUrl.pathname.startsWith('/share')) {
    console.log('[Middleware] Share route accessed:', req.nextUrl.pathname);
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
      logger.info("[Middleware] Club URL blocked in mobile app", { path: normalizedPathname });
      const url = req.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }

    // LOGIQUE DE REDIRECTION POUR L'APP iOS
    // Sur la page racine "/", vérifier l'auth et rediriger
    if (normalizedPathname === "/" || normalizedPathname === "") {
      // Créer un client Supabase pour vérifier l'authentification
      const supabaseForApp = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            get(name: string) {
              return req.cookies.get(name)?.value;
            },
            set() { },
            remove() { },
          },
        }
      );

      const { data: { user } } = await supabaseForApp.auth.getUser();

      if (user) {
        // Utilisateur connecté → aller vers /home
        logger.info("[Middleware] iOS app: User authenticated, redirecting to /home", { userId: user.id });
        const url = req.nextUrl.clone();
        url.pathname = "/home";
        return NextResponse.redirect(url);
      } else {
        // Pas connecté → aller vers /player/signup (inscription)
        logger.info("[Middleware] iOS app: User not authenticated, redirecting to /player/signup");
        const url = req.nextUrl.clone();
        url.pathname = "/player/signup";
        return NextResponse.redirect(url);
      }
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
        logger.info("[Middleware] Player URL blocked on website", { path: normalizedPathname });
        const url = req.nextUrl.clone();
        url.pathname = "/download";
        return NextResponse.redirect(url);
      }
    }
  }



  // RATE LIMITING - Appliqué avant toute autre logique
  const ip = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "127.0.0.1";
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
      if (loginRatelimit) {
        const { success, remaining, reset } = await loginRatelimit.limit(ip);
        if (!success) {
          return NextResponse.json(
            { error: "Trop de tentatives de connexion. Réessayez dans 15 minutes.", retryAfter: reset },
            { status: 429 }
          );
        }
        rateLimitInfo = { limit: "15", remaining, reset };
      }
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
                setAll() { },
              },
            }
          );
          const { data: { user } } = await supabase.auth.getUser();
          if (user?.id) {
            rateLimitId = user.id;
          }
        } catch (e) {
          logger.warn("[Middleware] Unable to resolve user for match rate-limit, fallback to IP", { error: e instanceof Error ? e.message : String(e) });
        }
      }
      rateLimitId = rateLimitId || ip;



      if (matchSubmitRatelimit) {
        const { success, remaining, reset } = await matchSubmitRatelimit.limit(rateLimitId || ip);
        if (!success) {
          return NextResponse.json(
            { error: "Trop de matchs soumis. Limite: 5 matchs par 5 minutes.", retryAfter: reset },
            { status: 429 }
          );
        }
        rateLimitInfo = { limit: "5", remaining, reset };
      }
    }



    // Rate limiting général pour toutes les routes API
    if (
      pathnameForRateLimit.startsWith("/api/") &&
      !pathnameForRateLimit.startsWith("/api/cron/trial-check") &&
      !pathnameForRateLimit.startsWith("/api/send-trial-reminder") &&
      !pathnameForRateLimit.startsWith("/api/webhooks/") &&
      pathnameForRateLimit !== "/api/resend-inbound" &&
      pathnameForRateLimit !== "/api/matches/submit" &&
      !pathnameForRateLimit.startsWith("/api/players/find-or-create")
    ) {
      if (generalRatelimit) {
        const { success, remaining, reset } = await generalRatelimit.limit(ip);
        if (!success) {
          console.log('[Middleware] Rate limit exceeded for:', pathnameForRateLimit);
          return NextResponse.json(
            { error: "Trop de requêtes. Réessayez plus tard.", retryAfter: reset },
            { status: 429 }
          );
        }
        rateLimitInfo = { limit: "1000", remaining, reset };
      }
    }
  } catch (error) {
    console.error('[Middleware] Rate limiter error:', error);
    // logger.error({ error: error instanceof Error ? error.message : String(error), context: 'rate-limiting', pathname: pathnameForRateLimit }, "[Middleware] Rate limiting error:");
  }



  // 2) Laisser passer le cron, l'API d'email, l'attente Android et les webhooks
  if (
    normalizedPathname.startsWith("/api/cron/trial-check") ||
    normalizedPathname.startsWith("/api/send-trial-reminder") ||
    normalizedPathname.startsWith("/api/webhooks/") ||
    normalizedPathname === "/api/resend-inbound" ||
    normalizedPathname === "/api/trial/check-extensions" ||
    normalizedPathname.startsWith("/api/attenteandroid")
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
    "/api/admin/check",  // Allow check API
    "/api/admin/create", // Allow create API
    "/api/guest/",       // Allow guest API
    "/api/contact/",     // Allow public contact forms
    "/api/attenteandroid/", // Allow public Android waitlist
    "/.well-known/",     // Allow Digital Asset Links and Apple Site Association
    "/share",            // Public profile sharing card
    "/_next/",
    "/images/",
    "/onboarding/",
    "/admin/access" // Allow dedicated admin access page
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
    "/courses",
    "/club",
    "/match/new",
    "/tournaments",
    "/about",
    "/contact",
    "/players",
    "/guest/confirmation", // Allow guest confirmation page
    "/attenteandroid" // Allow Android waitlist page
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



  // 3) AUTH & PERF OPTIMIZATION
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

  // Optimized session check
  const { data: { session } } = await supabase.auth.getSession();

  // Inactivity check
  if (session) {
    const now = Date.now();
    const lastActivityCookie = req.cookies.get("last_activity")?.value;
    if (lastActivityCookie) {
      const lastActivity = parseInt(lastActivityCookie, 10);
      if (!isNaN(lastActivity) && (now - lastActivity) / (1000 * 60) > 120) {
        await supabase.auth.signOut();
        res.cookies.set("last_activity", "", { expires: new Date(0) });
        if (isProtected) return isApiRoute ? NextResponse.json({ error: "Unauthorized" }, { status: 401 }) : NextResponse.redirect(new URL("/login", req.url));
      }
    }
    if (isProtected) res.cookies.set("last_activity", now.toString(), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 120 * 60, path: "/" });
  }

  // Redirect if protected and no session
  if (!session && isProtected) {
    return isApiRoute ? NextResponse.json({ error: "Unauthorized" }, { status: 401 }) : NextResponse.redirect(new URL("/login", req.url));
  }

  // DATA FETCHING & CACHING
  if (session?.user) {
    const user = session.user;

    // Check for cached performance context (short-lived: 2 minutes)
    const perfContextCookie = req.cookies.get("perf_context")?.value;
    let perfContext: any = null;

    if (perfContextCookie) {
      try {
        perfContext = JSON.parse(Buffer.from(perfContextCookie, 'base64').toString());
        // Verify expiration (max 2 minutes)
        if (Date.now() - perfContext.timestamp > 120000) perfContext = null;
      } catch (e) {
        perfContext = null;
      }
    }

    if (!perfContext) {
      // CONSOLIDATED QUERY
      // We fetch everything in one go: profile, admin status, and club status
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("is_admin, club_id, clubs(is_suspended, trial_end_date, trial_current_end_date, subscription_status)")
          .eq("id", user.id)
          .maybeSingle();

        const { data: clubAdmin } = await supabase
          .from('club_admins')
          .select('club_id')
          .eq('user_id', user.id)
          .maybeSingle();

        perfContext = {
          is_admin: profile?.is_admin || isAdmin(user.email),
          club_id: profile?.club_id || clubAdmin?.club_id || null,
          is_suspended: (profile as any)?.clubs?.is_suspended || false,
          trial_end: (profile as any)?.clubs?.trial_current_end_date || (profile as any)?.clubs?.trial_end_date || null,
          sub_status: (profile as any)?.clubs?.subscription_status || null,
          is_club_admin: !!clubAdmin,
          timestamp: Date.now()
        };

        // Cache for 2 minutes
        res.cookies.set("perf_context", Buffer.from(JSON.stringify(perfContext)).toString('base64'), {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 120, // 2 minutes
          path: '/'
        });
      } catch (e) {
        logger.error("[Middleware] Fetch error", e);
      }
    }

    if (perfContext) {
      const { is_admin, club_id, is_suspended, trial_end, sub_status } = perfContext;

      // Admin logic
      if (normalizedPathname.startsWith('/admin') && !is_admin) {
        return NextResponse.redirect(new URL("/home", req.url));
      }

      // Redirection logic for Entry pages
      const isEntryPage = ["/signup", "/login", "/player/login", "/player/signup", "/home"].includes(normalizedPathname);
      if (is_admin && isEntryPage && !req.headers.get('referer')?.includes('/admin')) {
        return NextResponse.redirect(new URL("/admin/messages", req.url));
      }
      if (!is_admin && (normalizedPathname === "/signup" || normalizedPathname === "/login")) {
        return NextResponse.redirect(new URL("/home", req.url));
      }

      // Club Suspension check
      if (!is_admin) {
        if (is_suspended && !normalizedPathname.startsWith('/player/club-suspended')) {
          return NextResponse.redirect(new URL("/player/club-suspended", req.url));
        }

        // Grace period check
        if (trial_end && sub_status !== 'active') {
          const daysSinceExp = Math.floor((Date.now() - new Date(trial_end).getTime()) / (1000 * 60 * 60 * 24));
          if (daysSinceExp > 7 && !normalizedPathname.startsWith('/player/club-stopped') && !normalizedPathname.startsWith('/api/player/club-stopped-survey')) {
            return NextResponse.redirect(new URL("/player/club-stopped", req.url));
          }
        }
      }
    }
  }

  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
