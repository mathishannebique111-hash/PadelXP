import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
  // 1) Si la requête vient de Vercel Cron, on la laisse passer
  if (req.headers.get("x-vercel-cron") === "1") {
    return NextResponse.next();
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
    normalizedPathname === "/api/resend-inbound"
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
    "/terms", 
    "/privacy", 
    "/legal", 
    "/cgv", 
    "/cookies", 
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
    return NextResponse.next();
  }

  const res = NextResponse.next();

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
    console.warn("[Middleware] Session exists but getUser() failed (temporary error?):", {
      errorCode: userError?.code,
      errorMessage: userError?.message,
      path: normalizedPathname,
    });
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
