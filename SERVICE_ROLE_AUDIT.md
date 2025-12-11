## Audit des usages de `SUPABASE_SERVICE_ROLE_KEY`

Catégories :  
- **À garder** : webhooks Stripe, cron jobs, RGPD export/delete uniquement.  
- **À migrer vers anon key + RLS** : usages runtime non critiques.  
- **Pas sûr** : doute fonctionnel ou besoin de vérif métier.

### À garder
- `app/api/webhooks/stripe/route.ts` : webhook Stripe (nécessite bypass RLS pour mises à jour billing).  
- `app/api/stripe/webhook/route.ts` : webhook Stripe (gestion paiements/boosts).  
- `app/api/cron/trial-check/route.ts` : cron vérification des extensions d’essai.  
- `app/api/trial/check-extensions/route.ts` : cron/automation d’extensions d’essai.  
- `app/api/trial/check-and-extend/route.ts` : cron/automation essai hybride.  
- `app/api/admin/fix-auto-extensions/route.ts` : job correctif auto-extensions (cron/admin).  
- `app/api/admin/reset-club/route.ts` : job correctif reset club (admin/cron).  
- `app/api/admin/sync-tcam-subscription/route.ts` : sync abonnement TCAM (cron).  
- `app/api/recompute-leaderboard/route.ts` : job de recalcul leaderboard (batch/cron).  
- `app/api/check-ghosts/route.ts` : job contrôle des ghosts (batch/cron).  
- `app/api/rgpd/export-data/route.ts` : export RGPD (bypass nécessaire).  
- `app/api/rgpd/delete-account/route.ts` : delete compte RGPD (bypass nécessaire).  
- `app/api/invoices/generate/route.ts` : génération factures (process batch/cron).  
- `scripts/backfill_missing_clubs.js` : script CLI batch (nécessite accès complet).  
- `lib/supabase/service.ts` : client service partagé pour jobs/cron/webhooks (utilisation à encadrer).  
- `lib/server/club-admin.ts` : helper serveur admin (probablement pour jobs/cron).  
- `app/api/tournaments/[id]/calculate-final-ranking/route.ts` : calcul classement final tournoi (batch).  
- `app/api/tournaments/[id]/generate/route.ts` : génération brackets (batch).  
- `app/api/tournaments/[id]/advance/*` (tmc-next-round, pools-final, final-next-round) : avancement tournoi (opérations massives).  
- `app/api/tournaments/[id]/matches/[matchId]/route.ts` : gestion match tournoi (admin/batch).  
- `app/api/tournaments/[id]/registrations*/route.ts` : gestion inscriptions tournoi (admin/batch).  
- `app/api/tournaments/route.ts` : liste/gestion tournois (admin/batch).  
- `app/api/tournaments/[id]/final-rankings/route.ts` : lecture classement final (admin/batch).

### À migrer vers anon key + RLS
- Pages/SSR/CSR : `app/dashboard/page.tsx`, `app/dashboard/layout.tsx`, `app/dashboard/facturation/success/page.tsx`, `app/dashboard/roles/page.tsx`, `app/dashboard/membres/page.tsx`, `app/(protected)/home/page.tsx`, `app/(protected)/badges/page.tsx`, `app/(protected)/challenges/page.tsx`, `app/(protected)/reviews/page.tsx`, `app/(protected)/boost/success/page.tsx`, `app/(protected)/tournaments/page.tsx`, `app/(protected)/match/new/page.tsx`, `app/(protected)/club/page.tsx`, `app/(protected)/matches/history/page.tsx`, `app/club/[slug]/page.tsx`, `app/api/public/stats/route.ts`, `components/TrialStatusBannerWrapper.tsx`, `components/PlayerSummary.tsx`, `components/PlayerClubLogo.tsx`.  
  Raison : lecture données utilisateur/club → devrait passer par client user + RLS.
- Auth/process user standard : `app/api/matches/submit/route.ts`, `app/api/matches/confirm/route.ts`, `app/api/guest-players/route.ts`, `app/api/players/find-or-create/route.ts`, `app/api/players/search/route.ts`, `app/api/players/validate-exact/route.ts`, `app/api/player/profile/route.ts`, `app/api/player/attach/route.ts`, `app/api/player/boost/stats/route.ts`, `app/api/player/challenges/route.ts`, `app/api/challenges/claim-reward/route.ts`, `app/api/reviews/route.ts`, `app/api/leaderboard/route.ts`, `app/api/leaderboard/top3/route.ts`.  
  Raison : opérations utilisateur normales → devraient rester sous RLS avec client user.
- Clubs & admin app (non cron/webhook) : `app/api/clubs/register/route.ts`, `app/api/clubs/signup/route.ts`, `app/api/clubs/public/route.ts`, `app/api/clubs/list/route.ts`, `app/api/clubs/logo/route.ts`, `app/api/clubs/challenges/route.ts`, `app/api/clubs/import-members/route.ts`, `app/api/clubs/remove-admin/route.ts`, `app/api/clubs/invite-admin/route.ts`, `app/api/clubs/admin-invite/reissue/route.ts`, `app/api/clubs/activate-admin/route.ts`, `app/api/clubs/activate-admin/route.ts` (déjà listé), `app/api/clubs/register/route.ts` (déjà listé), `app/api/clubs/signup/route.ts` (déjà listé).  
  Raison : gestion courante club/admin authentifié → RLS devrait suffire.
- Trials (hors cron) : `app/api/trial/manual-extension/route.ts`, `app/api/admin/extend-trial/route.ts`, `app/api/admin/credit-boosts/route.ts`, `app/api/trial/check-extensions/route.ts` (cron gardé mais endpoints devraient valider un secret au lieu du service_role direct), `lib/hooks/use-trial-engagement.ts`, `lib/trial-hybrid.ts`.  
  Raison : actions liées à un club identifié ou admin authentifié → privilégier anon + policies + validations.
- Stripe front/API (hors webhooks) : `app/api/stripe/cancel-subscription/route.ts`, `app/api/stripe/reactivate-subscription/route.ts`, `app/api/stripe/verify-session/route.ts`, `app/api/stripe/verify-boost-session/route.ts`, `app/api/stripe/customer-portal/route.ts`, `app/api/stripe/sync-subscription/route.ts`, `app/api/stripe/verify-boost-session/route.ts`.  
  Raison : devraient utiliser session utilisateur + Stripe IDs stockés côté RLS, pas service role.
- Abonnements (hors webhook) : `app/api/subscription/create/route.ts`, `app/api/subscription/get/route.ts`, `app/api/subscription/cancel/route.ts`, `app/api/subscription/reactivate/route.ts`, `app/dashboard/page.tsx` (déjà listé), `app/dashboard/facturation/success/page.tsx` (déjà listé).  
  Raison : actions utilisateur/club, devraient passer par RLS.
- Boosts utils : `lib/utils/boost-utils.ts`, `lib/utils/boost-points-utils.ts`, `lib/utils/reviews-reward-utils.ts`, `lib/utils/referral-utils.ts`, `lib/utils/player-leaderboard-utils.ts`, `lib/utils/club-utils.ts`, `lib/utils/club-logo-utils.ts`, `lib/utils/achievements-utils.ts`.  
  Raison : logique métier pouvant fonctionner avec clients user + RPC sécurisées.
- Tournaments côté UI/API non batch : `app/(protected)/tournaments/page.tsx`, `app/api/tournaments/[id]/register*/route.ts`, `app/api/tournaments/[id]/registrations*/route.ts`, `app/api/tournaments/[id]/matches/[matchId]/route.ts`, `app/api/tournaments/[id]/final-rankings/route.ts`, `app/api/tournaments/[id]/advance/*`, `app/api/tournaments/route.ts`.  
  Raison : la plupart des opérations devraient être sous RLS + auth utilisateur (sauf batch déjà en “À garder” si réellement cron).
- Divers : `app/api/contact/route.ts` (sauvegarde contact), `app/api/public/stats/route.ts` (lecture publique), `app/api/clubs/public/route.ts` (lecture publique), `app/api/player/profile/route.ts` (lecture profil), `app/api/support/conversation/route.ts` (support), `app/api/billing/update/route.ts`.  
  Raison : aucune nécessité de bypass RLS pour ces flux.
- Pages/SSR affichage data : `app/dashboard/page.tsx`, `app/dashboard/layout.tsx`, `app/dashboard/roles/page.tsx`, `app/dashboard/membres/page.tsx`, `app/(protected)/home/page.tsx`, `app/(protected)/badges/page.tsx`, `app/(protected)/challenges/page.tsx`, `app/(protected)/reviews/page.tsx`, `app/(protected)/boost/success/page.tsx`, `app/(protected)/match/new/page.tsx`, `app/(protected)/club/page.tsx`, `app/(protected)/matches/history/page.tsx`, `app/club/[slug]/page.tsx`, `components/PlayerSummary.tsx`, `components/PlayerClubLogo.tsx`, `components/TrialStatusBannerWrapper.tsx`.  
  Raison : data user/club standard → doit passer par getServerSession + client RLS.

### Pas sûr (à vérifier)
- `app/api/trial/check-extensions/route.ts` déjà classé “À garder” pour cron, mais si appelé par UI il faudra un guard (secret) sinon à migrer.  
- `app/api/trial/check-and-extend/route.ts` idem (si utilisé en cron only, ok).  
- `app/api/admin/reset-club/route.ts` / `app/api/admin/fix-auto-extensions/route.ts` / `app/api/admin/sync-tcam-subscription/route.ts` : si déclenchés manuellement par admin via UI, envisager RPC sécurisée + RLS restreinte ; si cron-only, rester “À garder”.  
- `lib/supabase/service.ts` / `lib/server/club-admin.ts` : helper générique ; conserver pour webhooks/cron, éviter usage UI.  
- `app/api/trial/manual-extension/route.ts` et `app/api/admin/extend-trial/route.ts` : si exposés en UI admin, privilégier RLS + rôle admin plutôt que service role.

### Références documentaires (pas de code exécuté)
- `ENV_SETUP.md`, `AUDIT_SECURITE_COMPLET.md`, `AUDIT_SECURITE_PADELXP.md`, `CHANGELOG_SECURITE.md`, `app/dpa/page.tsx` : mentions de la variable, pas d’usage runtime.
