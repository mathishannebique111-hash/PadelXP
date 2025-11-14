import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
  // 1) Si la requête vient de Vercel Cron, on la laisse passer
  if (req.headers.get("x-vercel-cron") === "1") {
    return NextResponse.next();
  }

  const { pathname } = req.nextUrl;

  // 2) Laisser passer le cron et l'API d'email aussi par sécurité
  if (
    pathname.startsWith("/api/cron/trial-check") ||
    pathname.startsWith("/api/send-trial-reminder")
  ) {
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const PUBLIC_PREFIXES = ["/api/auth/", "/api/leaderboard/", "/api/players/", "/api/clubs/", "/api/public/", "/api/challenges/", "/api/player/", "/_next/", "/images/", "/onboarding/", "/dashboard/", "/player/", "/club/"]; // toujours publics
  const PUBLIC_PATHS = new Set(["/", "/login", "/signup", "/clubs", "/clubs/login", "/clubs/signup", "/favicon.ico", "/onboarding", "/onboarding/club", "/dashboard", "/player/login", "/player/signup"]);
  // Les routes API protégées doivent gérer l'authentification elles-mêmes
  const API_ROUTES_THAT_HANDLE_AUTH = ["/api/matches/", "/api/reviews"];
  const isApiRouteThatHandlesAuth = API_ROUTES_THAT_HANDLE_AUTH.some((p) => pathname.startsWith(p));
  const isPublic = PUBLIC_PATHS.has(pathname) || PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
  const isProtected = !isPublic && !isApiRouteThatHandlesAuth; // tout sauf public et routes API qui gèrent leur propre auth
  const isApiRoute = pathname.startsWith("/api/");

  // Pour les routes API protégées, retourner 401 au lieu de rediriger
  // MAIS laisser les routes API qui gèrent leur propre auth passer
  if (!user && isProtected && isApiRoute && !isApiRouteThatHandlesAuth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!user && isProtected && !isApiRoute) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && (pathname === "/signup" || pathname === "/login")) {
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
