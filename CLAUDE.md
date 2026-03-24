# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start development server
npm run build        # Production build
npm run lint         # Run ESLint
npm run test         # Run Jest tests
npm run test:watch   # Run tests in watch mode
```

To run a single test file: `npx jest path/to/test.test.ts`

## Architecture Overview

PadelXP is a **Next.js 15 App Router** full-stack app for managing padel clubs, player rankings, and tournaments. It targets both web and mobile (iOS/Android via Capacitor).

### Stack
- **Framework**: Next.js 15 + TypeScript + React 19
- **Database**: Supabase (PostgreSQL) — direct SQL, no ORM
- **Auth**: Supabase Auth with cookie-based SSR sessions
- **Styling**: TailwindCSS with CSS variable-based white-labeling per club
- **Payments**: Stripe (subscriptions + one-time boosts)
- **Email**: Resend
- **Rate limiting**: Upstash Redis
- **Mobile**: Capacitor 8 (iOS/Android wrapper)
- **Monitoring**: Sentry + Pino logger

### Key Directories

- `app/` — App Router. Three main user surfaces:
  - `app/(auth)/` — Login/signup/password reset
  - `app/(protected)/` — Player-facing pages (home, matches, leaderboard, badges)
  - `app/dashboard/` — Club admin dashboard
  - `app/admin/` — Global admin panel
  - `app/api/` — 55+ REST API routes organized by domain
- `lib/` — Business logic and utilities. Key files:
  - `lib/supabase/server.ts` — Server-side Supabase client (uses cookies)
  - `lib/supabase/client.ts` — Browser Supabase client
  - `lib/supabase/admin.ts` — Admin client using service role key
  - `lib/utils/elo-utils.ts` — ELO rating calculations
  - `lib/email.ts` — Email sending via Resend
  - `lib/notifications.ts` — Push notification management
  - `lib/club-branding.ts` — White-label theming logic
- `components/` — React components (landing pages, player UI, dashboard UI)
- `supabase/migrations/` — 126+ SQL migration files (schema source of truth)
- `contexts/` — React contexts (PopupQueueContext, ChallengeContext)
- `types/` — TypeScript type definitions; generated DB types at `lib/types_db.ts`

### Routing & Middleware

`middleware.ts` handles:
- Rate limiting via Upstash Redis
- Session validation + 120-minute inactivity timeout
- White-label subdomain extraction (determines which club's branding to apply)
- Capacitor app detection via user-agent
- Route protection: players blocked from dashboard, admins blocked from player routes
- Performance context caching in cookies (2-min TTL)

### White-Label / Multi-Club

Clubs get subdomains (e.g., `myclubname.padelxp.com`). The middleware extracts the subdomain and injects club branding as CSS RGB variables used throughout TailwindCSS. `NEXT_PUBLIC_FORCE_CLUB_SUBDOMAIN` overrides this in development.

### Multi-Platform UI

`tailwind.config.ts` defines custom variants `is-app` and `is-web` based on Capacitor detection. Components use these variants to conditionally show/hide elements between the native app and web.

### Auth Flow

1. Supabase Auth handles login/OAuth
2. `/api/auth/callback` processes the session post-login
3. Session persisted in HTTP-only cookies
4. Server components call `createClient()` from `lib/supabase/server.ts`
5. Admin access: checked against hardcoded emails + `profiles.is_admin` + `club_admins` table

### Database Conventions

- All schema changes go in `supabase/migrations/` as `.sql` files
- RLS (Row-Level Security) is enforced on tables for data isolation
- The generated type file is `lib/types_db.ts` — regenerate with Supabase CLI after migrations

### Environment Variables

Required locals (see `.env.local`):
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
STRIPE_SECRET_KEY
NEXT_PUBLIC_STRIPE_PUBLIC_KEY
NEXT_PUBLIC_STRIPE_PRICE_*        # Monthly/quarterly/annual/boost price IDs
RESEND_API_KEY
RESEND_FROM_EMAIL
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
SENTRY_AUTH_TOKEN
SUBSCRIPTION_CRON_SECRET
NEXT_PUBLIC_FORCE_CLUB_SUBDOMAIN  # Override club subdomain in dev
```
