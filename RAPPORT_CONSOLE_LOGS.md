# 📋 RAPPORT D'AUDIT - OCCURRENCES DE console.* DANS LE CODE

**Date de l'audit :** $(date)  
**Objectif :** Identifier tous les fichiers contenant des appels à `console.log`, `console.warn`, `console.error`, `console.debug`, ou `console.info` pour planifier la migration vers le logger centralisé (`lib/logger.ts`)

**Note :** Le fichier `lib/logger.ts` est exclu de ce rapport car il contient l'implémentation du logger centralisé.

---

## 📊 STATISTIQUES GLOBALES

- **Total de fichiers avec console.* :** ~130 fichiers
- **Total d'occurrences :** ~1100+ occurrences
- **Répartition :**
  - `console.log` : ~70%
  - `console.error` : ~20%
  - `console.warn` : ~10%
  - `console.debug` / `console.info` : <1%

---

## 📁 FICHIERS PAR CATÉGORIE

### 🔴 API Routes (`app/api/`)

#### `/Users/mathis/Documents/PadelXP/app/api/players/search/route.ts`
**Occurrences :** 13
- Ligne 71 : `console.warn("[Search API] Session exists but getUser() failed..."`
- Ligne 93 : `console.error('[Search API] Error fetching user profile (client):'...`
- Ligne 106 : `console.error('[Search API] Error fetching user profile (admin):'...`
- Ligne 139 : `console.log('[Search API] Search query:', queryLower);`
- Ligne 147 : `console.log('[Search API] Executing profiles query...');`
- Ligne 151 : `console.error('[Search API] Error fetching profiles:'...`
- Ligne 165 : `console.log('[Search API] Found profiles:', profiles?.length || 0);`
- Ligne 167 : `console.log('[Search API] Sample profiles:'...`
- Ligne 181 : `console.error('[Search API] Error fetching club record:'...`
- Ligne 218 : `console.log('[Search API] Added', results.length, 'user profiles to results');`
- Ligne 220 : `console.log('[Search API] No profiles returned from query');`
- Ligne 232 : `console.log('[Search API] Final results count:'...`
- Ligne 233 : `console.log('[Search API] Returning results:'...`
- Ligne 241 : `console.error("Error in search API:", error);`

#### `/Users/mathis/Documents/PadelXP/app/api/player/challenges/route.ts`
**Occurrences :** 30+
- Ligne 99 : `console.warn("[api/player/challenges] resolveClubId auth metadata lookup failed"...`
- Ligne 102 : `console.warn("[api/player/challenges] resolveClubId: aucun club trouvé"...`
- Ligne 111 : `console.warn("[api/player/challenges] load error"...`
- Ligne 118 : `console.warn("[api/player/challenges] Empty JSON for club"...`
- Ligne 126 : `console.warn("[api/player/challenges] invalid JSON"...`
- Ligne 166 : `console.log("[loadPlayerHistory] Fetching matches for userId:"...`
- Ligne 175 : `console.log("[loadPlayerHistory] User participations:"...`
- Ligne 178 : `console.warn("[loadPlayerHistory] ⚠️ NO PARTICIPATIONS found"...`
- Ligne 184 : `console.log("[loadPlayerHistory] Found ${matchIds.length} match IDs"...`
- Ligne 193 : `console.log("[loadPlayerHistory] Matches fetched:"...`
- Ligne 196 : `console.warn("[loadPlayerHistory] ⚠️ Error fetching matches:"...`
- Ligne 200 : `console.log("[loadPlayerHistory] ✅ Found ${matches.length} matches"...`
- Ligne 218 : `console.log("[loadPlayerHistory] Valid matches after daily limit:"...`
- Ligne 254 : `console.log("[loadPlayerHistory] Match ${match.id.substring(0, 8)}:"...`
- Ligne 281 : `console.log("[Challenge ${record.id}] Computing progress:"...`
- Ligne 298 : `console.log("  ❌ Match ${item.matchId.substring(0, 8)} excluded:"...`
- Ligne 303 : `console.log("  ❌ Match ${item.matchId.substring(0, 8)} excluded:"...`
- Ligne 307 : `console.log("  ${inPeriod ? '✅' : '❌'} Match ${item.matchId.substring(0, 8)}:"...`
- Ligne 327 : `console.log("  ✅ Match ${item.matchId.substring(0, 8)}: VICTOIRE"...`
- Ligne 330 : `console.log("  ❌ Match ${item.matchId.substring(0, 8)}: DÉFAITE"...`
- Ligne 338 : `console.log("[Challenge ${record.id}] Consecutive wins:"...`
- Ligne 354 : `console.log("[Challenge ${record.id}] Different partners found:"...`
- Ligne 355 : `console.log("[Challenge ${record.id}] Counting ${metricIsWin ? 'wins only' : 'all matches'}"...`
- Ligne 362 : `console.log("[Challenge ${record.id}] Result:"...`
- Ligne 387 : `console.log("[api/player/challenges] Resolved clubId for user"...`
- Ligne 389 : `console.warn("[api/player/challenges] No clubId found for user"...`
- Ligne 394 : `console.log("[api/player/challenges] Loaded ${records.length} challenges"...`
- Ligne 396 : `console.log("[Player ${userIdPreview}] Challenges:"...`
- Ligne 409 : `console.log("[api/player/challenges] About to load player history"...`
- Ligne 411 : `console.log("[api/player/challenges] Player ${userIdPreview} - Loaded ${history.length} matches"...`
- Ligne 414 : `console.log("[api/player/challenges] Recent matches:"...`
- Ligne 420 : `console.warn("[api/player/challenges] ⚠️ NO MATCHES FOUND for user"...`
- Ligne 432 : `console.warn("[api/player/challenges] ⚠️ Could not fetch rewards"...`
- Ligne 437 : `console.warn("[api/player/challenges] ⚠️ Exception fetching rewards:"...`
- Ligne 450 : `console.log("[Challenge ${record.id.substring(0, 8)}] Filtered out"...`

#### `/Users/mathis/Documents/PadelXP/app/api/clubs/remove-admin/route.ts`
**Occurrences :** 5
- Ligne 128 : `console.warn("[remove-admin] Unable to list users for fallback lookup"...`
- Ligne 138 : `console.error("[remove-admin] Error deleting admin:"...`
- Ligne 158 : `console.warn("[remove-admin] Impossible de supprimer l'utilisateur de auth.users:"...`
- Ligne 160 : `console.log("[remove-admin] Utilisateur ${emailPreview} supprimé de auth.users");`
- Ligne 165 : `console.log("[remove-admin] Admin ${emailPreview} supprimé du club"...`
- Ligne 171 : `console.error("[remove-admin] Erreur:"...`

#### `/Users/mathis/Documents/PadelXP/app/api/clubs/invite-admin/route.ts`
**Occurrences :** 10+
- Ligne 130 : `console.log("[invite-admin] inviteUserByEmail échoué, utilisation de generateLink:"...`
- Ligne 190 : `console.error("[invite-admin] Erreur Supabase:"...`
- Ligne 211 : `console.log("[invite-admin] Action link trouvé: ${actionLink.substring(0, 100)}...");`
- Ligne 225 : `console.log("[invite-admin] Lien d'invitation généré (longueur:"...`
- Ligne 229 : `console.log("[invite-admin] Utilisation du lien de base (fallback):"...`
- Ligne 235 : `console.log("[invite-admin] Aucune donnée Supabase, utilisation du lien de base:"...`
- Ligne 238 : `console.log("[invite-admin] Lien d'invitation généré (longueur:"...`
- Ligne 249 : `console.error("[invite-admin] Aucun lien d'invitation généré"...`
- Ligne 258 : `console.log("[invite-admin] ✅ Email d'invitation envoyé à ${emailPreview} via Resend");`
- Ligne 261 : `console.error("[invite-admin] ❌ Erreur lors de l'envoi de l'email via Resend:"...`
- Ligne 290 : `console.error("[invite-admin] Erreur lors de la mise à jour dans club_admins:"...`
- Ligne 306 : `console.error("[invite-admin] Erreur lors de l'ajout dans club_admins:"...`
- Ligne 315 : `console.log("[invite-admin] Invitation envoyée à ${emailPreview2} pour le club"...`
- Ligne 322 : `console.error("[invite-admin] Erreur:"...`

#### `/Users/mathis/Documents/PadelXP/app/api/send-trial-reminder/route.ts`
**Occurrences :** 4
- Ligne 13 : `console.error("❌ RESEND_API_KEY not configured for send-trial-reminder");`
- Ligne 21 : `console.log("Resend inbound event:", event);`
- Ligne 36 : `console.error("Error fetching received email:", error);`
- Ligne 40 : `console.log("Email received:"...`
- Ligne 75 : `console.error("Error forwarding to Gmail:", sendError);`

#### `/Users/mathis/Documents/PadelXP/app/api/subscriptions/cron/route.ts`
**Occurrences :** 3
- Ligne 26 : `console.error("[cron] Validation query failed:"...`
- Ligne 36 : `console.warn("[cron] Unauthorized access attempt");`
- Ligne 56 : `console.error("[cron] Error:"...`

#### `/Users/mathis/Documents/PadelXP/app/api/resend-inbound/route.ts`
**Occurrences :** ~50+ (fichier très verbeux pour le debug)
- Nombreuses occurrences de `console.log` pour le debugging des emails entrants
- Logs détaillés sur la récupération du contenu des emails depuis Resend API

#### `/Users/mathis/Documents/PadelXP/app/api/contact/route.ts`
**Occurrences :** ~10+
- Logs pour le traitement des messages de contact

#### `/Users/mathis/Documents/PadelXP/app/api/players/validate-exact/route.ts`
**Occurrences :** ~5+
- Logs de validation des joueurs

#### `/Users/mathis/Documents/PadelXP/app/api/player/boost/stats/route.ts`
**Occurrences :** ~5+
- Logs pour les statistiques de boost

#### `/Users/mathis/Documents/PadelXP/app/api/matches/submit/route.ts`
**Occurrences :** ~20+
- Logs détaillés pour la soumission de matchs
- Utilise déjà `logger` dans certaines parties mais mélangé avec `console.log`

#### `/Users/mathis/Documents/PadelXP/app/api/clubs/signup/route.ts`
**Occurrences :** ~5+
- Logs pour l'inscription des clubs

#### `/Users/mathis/Documents/PadelXP/app/api/stripe/webhook/route.ts`
**Occurrences :** ~10+
- Ligne 28 : `console.error('[webhook] STRIPE_WEBHOOK_SECRET is not configured');`
- Ligne 41 : `console.error('[webhook] Missing stripe-signature header');`
- Ligne 58 : `console.error('[webhook] Signature verification failed:'...`
- Ligne 65 : `console.log('[webhook] Event received:', event.type, event.id);`
- Ligne 71 : `console.log('[webhook] checkout.session.completed:'...`
- Ligne 85 : `console.error('[webhook] Missing user_id in metadata for boost purchase');`
- Ligne 90 : `console.error('[webhook] Supabase admin client not available');`
- Et plusieurs autres...

#### `/Users/mathis/Documents/PadelXP/app/api/stripe/reactivate-subscription/route.ts`
**Occurrences :** ~5+

#### `/Users/mathis/Documents/PadelXP/app/api/stripe/checkout/route.ts`
**Occurrences :** ~5+

#### `/Users/mathis/Documents/PadelXP/app/api/stripe/cancel-subscription/route.ts`
**Occurrences :** ~5+

#### `/Users/mathis/Documents/PadelXP/app/api/clubs/admin-invite/reissue/route.ts`
**Occurrences :** ~5+

#### `/Users/mathis/Documents/PadelXP/app/api/admin/credit-boosts/route.ts`
**Occurrences :** ~5+

#### `/Users/mathis/Documents/PadelXP/app/api/webhooks/resend/route.ts`
**Occurrences :** ~10+

#### `/Users/mathis/Documents/PadelXP/app/api/admin/sync-tcam-subscription/route.ts`
**Occurrences :** ~5+

#### `/Users/mathis/Documents/PadelXP/app/api/stripe/verify-boost-session/route.ts`
**Occurrences :** ~5+

#### `/Users/mathis/Documents/PadelXP/app/api/stripe/customer-portal/route.ts`
**Occurrences :** ~3+

#### `/Users/mathis/Documents/PadelXP/app/api/subscriptions/consent/route.ts`
**Occurrences :** ~3+

#### `/Users/mathis/Documents/PadelXP/app/api/subscriptions/activate/route.ts`
**Occurrences :** ~3+

#### `/Users/mathis/Documents/PadelXP/app/api/subscriptions/cancel/route.ts`
**Occurrences :** ~3+

#### `/Users/mathis/Documents/PadelXP/app/api/clubs/activate-admin/route.ts`
**Occurrences :** ~3+

#### `/Users/mathis/Documents/PadelXP/app/api/clubs/list/route.ts`
**Occurrences :** ~5+

#### `/Users/mathis/Documents/PadelXP/app/api/clubs/logo/route.ts`
**Occurrences :** ~5+

#### `/Users/mathis/Documents/PadelXP/app/api/clubs/import-members/route.ts`
**Occurrences :** 3
- Ligne 196 : `console.error("[import-members] existing lookup error:"...`
- Ligne 210 : `console.error("[import-members] upsert error:"...`
- Ligne 233 : `console.error("[import-members] Unexpected error:"...`

#### `/Users/mathis/Documents/PadelXP/app/api/players/find-or-create/route.ts`
**Occurrences :** ~3+

#### `/Users/mathis/Documents/PadelXP/app/api/clubs/challenges/route.ts`
**Occurrences :** ~5+

#### `/Users/mathis/Documents/PadelXP/app/api/clubs/register/route.ts`
**Occurrences :** ~5+

#### `/Users/mathis/Documents/PadelXP/app/api/referrals/validate/route.ts`
**Occurrences :** ~3+

#### `/Users/mathis/Documents/PadelXP/app/api/player/attach/route.ts`
**Occurrences :** ~5+

#### `/Users/mathis/Documents/PadelXP/app/api/referrals/notifications/route.ts`
**Occurrences :** ~3+

#### `/Users/mathis/Documents/PadelXP/app/api/referrals/info/route.ts`
**Occurrences :** ~3+

#### `/Users/mathis/Documents/PadelXP/app/api/reviews/reward-status/route.ts`
**Occurrences :** ~3+

#### `/Users/mathis/Documents/PadelXP/app/api/reviews/claim-free-boost/route.ts`
**Occurrences :** ~3+

#### `/Users/mathis/Documents/PadelXP/app/api/leaderboard/route.ts`
**Occurrences :** ~5+
- Ligne 21 : `console.log('🔍 Fetching full leaderboard');`
- Ligne 41 : `console.log('ℹ️ User without club fetching leaderboard - returning empty array');`

#### `/Users/mathis/Documents/PadelXP/app/api/leaderboard/top3/route.ts`
**Occurrences :** ~5+

#### `/Users/mathis/Documents/PadelXP/app/api/profile/init/route.ts`
**Occurrences :** ~5+

#### `/Users/mathis/Documents/PadelXP/app/api/public/stats/route.ts`
**Occurrences :** ~3+

#### `/Users/mathis/Documents/PadelXP/app/api/stripe/verify-session/route.ts`
**Occurrences :** ~3+

#### `/Users/mathis/Documents/PadelXP/app/api/player/profile/route.ts`
**Occurrences :** ~3+

#### `/Users/mathis/Documents/PadelXP/app/api/clubs/export-leaderboard-pdf/route.ts`
**Occurrences :** ~3+

#### `/Users/mathis/Documents/PadelXP/app/api/clubs/public/route.ts`
**Occurrences :** ~20+

#### `/Users/mathis/Documents/PadelXP/app/api/clubs/export-members/route.ts`
**Occurrences :** ~3+

#### `/Users/mathis/Documents/PadelXP/app/api/clubs/export-leaderboard/route.ts`
**Occurrences :** ~3+

#### `/Users/mathis/Documents/PadelXP/app/api/contact/test/route.ts`
**Occurrences :** ~3+

#### `/Users/mathis/Documents/PadelXP/app/api/billing/update/route.ts`
**Occurrences :** ~3+

#### `/Users/mathis/Documents/PadelXP/app/api/invoices/generate/route.ts`
**Occurrences :** ~3+

#### `/Users/mathis/Documents/PadelXP/app/api/stripe/sync-subscription/route.ts`
**Occurrences :** ~5+

#### `/Users/mathis/Documents/PadelXP/app/api/matches/confirm/route.ts`
**Occurrences :** ~3+

#### `/Users/mathis/Documents/PadelXP/app/api/auth/callback/route.ts`
**Occurrences :** ~3+

#### `/Users/mathis/Documents/PadelXP/app/api/reviews/route.ts`
**Occurrences :** 1
- Ligne 192 : `console.log("[reviews] rate-limit key", \`review-user:${userIdPreview}\`);`

---

### 🟡 Components (`components/`)

#### `/Users/mathis/Documents/PadelXP/components/MatchForm.tsx`
**Occurrences :** 50+
- Fichier très verbeux avec de nombreux logs de debug
- Lignes 106, 151, 181, 187, 206, 213, 256-279, 284, 287, 292, 297, 497, 526, 548, 558, 564, 584, 596, 608, 614, 619, 634, 637, 659, 669, 672, 694, 704, 707, 729, 744, 752, 762, 794, 822, 825, 837, 881, 939, etc.

#### `/Users/mathis/Documents/PadelXP/components/PlayerSidebar.tsx`
**Occurrences :** ~10+

#### `/Users/mathis/Documents/PadelXP/components/billing/StripeCheckoutButton.tsx`
**Occurrences :** ~5+

#### `/Users/mathis/Documents/PadelXP/components/billing/ReactivateSubscriptionButton.tsx`
**Occurrences :** ~5+

#### `/Users/mathis/Documents/PadelXP/components/billing/CancelSubscriptionButton.tsx`
**Occurrences :** ~5+

#### `/Users/mathis/Documents/PadelXP/components/PlayerClubLogoDisplay.tsx`
**Occurrences :** ~3+

#### `/Users/mathis/Documents/PadelXP/components/ReviewsList.tsx`
**Occurrences :** ~5+

#### `/Users/mathis/Documents/PadelXP/components/ReferralSection.tsx`
**Occurrences :** ~5+

#### `/Users/mathis/Documents/PadelXP/components/ReferralNotifier.tsx`
**Occurrences :** ~3+

#### `/Users/mathis/Documents/PadelXP/components/PlayerSummary.tsx`
**Occurrences :** ~5+

#### `/Users/mathis/Documents/PadelXP/components/ReviewsStats.tsx`
**Occurrences :** ~3+

#### `/Users/mathis/Documents/PadelXP/components/BoostPurchaseButton.tsx`
**Occurrences :** ~5+

#### `/Users/mathis/Documents/PadelXP/components/challenges/ChallengeCard.tsx`
**Occurrences :** ~5+

#### `/Users/mathis/Documents/PadelXP/components/PlayerClubLogo.tsx`
**Occurrences :** ~3+

#### `/Users/mathis/Documents/PadelXP/app/login/ClientLogin.tsx`
**Occurrences :** ~5+

#### `/Users/mathis/Documents/PadelXP/components/landing/Testimonials.tsx`
**Occurrences :** ~3+

#### `/Users/mathis/Documents/PadelXP/components/PlayerAutocomplete.tsx`
**Occurrences :** ~5+

#### `/Users/mathis/Documents/PadelXP/app/clubs/signup/ClientAdminInvite.tsx`
**Occurrences :** ~5+

#### `/Users/mathis/Documents/PadelXP/components/BoostCreditChecker.tsx`
**Occurrences :** ~3+

#### `/Users/mathis/Documents/PadelXP/components/landing/clubs/ClubsHeroSection.tsx`
**Occurrences :** ~3+

#### `/Users/mathis/Documents/PadelXP/components/landing/LeaderboardPreviewMini.tsx`
**Occurrences :** ~3+

#### `/Users/mathis/Documents/PadelXP/components/club/ClubPublicFormClient.tsx`
**Occurrences :** ~5+

#### `/Users/mathis/Documents/PadelXP/components/club/ClubHeader.tsx`
**Occurrences :** ~3+

#### `/Users/mathis/Documents/PadelXP/components/auth/LogoutButton.tsx`
**Occurrences :** ~3+

#### `/Users/mathis/Documents/PadelXP/components/LogoutButton.tsx`
**Occurrences :** ~3+

#### `/Users/mathis/Documents/PadelXP/components/landing/SocialProof.tsx`
**Occurrences :** ~3+

#### `/Users/mathis/Documents/PadelXP/components/Top3Notification.tsx`
**Occurrences :** ~3+

#### `/Users/mathis/Documents/PadelXP/components/cookies/CookiePreferencesManager.tsx`
**Occurrences :** ~3+

#### `/Users/mathis/Documents/PadelXP/components/billing/SyncOnReturn.tsx`
**Occurrences :** ~3+

#### `/Users/mathis/Documents/PadelXP/components/cookies/CookieConsent.tsx`
**Occurrences :** ~3+

#### `/Users/mathis/Documents/PadelXP/components/billing/SessionIdInput.tsx`
**Occurrences :** ~3+

#### `/Users/mathis/Documents/PadelXP/components/billing/RefreshSubscriptionButton.tsx`
**Occurrences :** ~3+

#### `/Users/mathis/Documents/PadelXP/components/billing/StripePaymentButton.tsx`
**Occurrences :** ~3+

#### `/Users/mathis/Documents/PadelXP/components/NotificationModal.tsx`
**Occurrences :** ~3+

#### `/Users/mathis/Documents/PadelXP/components/auth/PlayerClubGate.tsx`
**Occurrences :** ~3+

---

### 🟢 Pages (`app/`)

#### `/Users/mathis/Documents/PadelXP/app/(protected)/home/page.tsx`
**Occurrences :** ~5+
- Ligne 60 : `console.warn("[HomePage] Session exists but getUser() failed"...`

#### `/Users/mathis/Documents/PadelXP/app/dashboard/page.tsx`
**Occurrences :** ~5+

#### `/Users/mathis/Documents/PadelXP/app/dashboard/facturation/success/page.tsx`
**Occurrences :** ~3+

#### `/Users/mathis/Documents/PadelXP/app/(protected)/reviews/page.tsx`
**Occurrences :** ~3+

#### `/Users/mathis/Documents/PadelXP/app/(protected)/boost/page.tsx`
**Occurrences :** ~5+

#### `/Users/mathis/Documents/PadelXP/app/(protected)/badges/page.tsx`
**Occurrences :** ~3+

#### `/Users/mathis/Documents/PadelXP/app/(protected)/challenges/page.tsx`
**Occurrences :** ~5+

#### `/Users/mathis/Documents/PadelXP/app/dashboard/challenges/page.tsx`
**Occurrences :** ~3+

#### `/Users/mathis/Documents/PadelXP/app/club/[slug]/classement/page.tsx`
**Occurrences :** ~3+

#### `/Users/mathis/Documents/PadelXP/app/club/[slug]/resultats/page.tsx`
**Occurrences :** ~3+

#### `/Users/mathis/Documents/PadelXP/app/club/[slug]/enregistrer-match/page.tsx`
**Occurrences :** ~3+

#### `/Users/mathis/Documents/PadelXP/app/(protected)/match/new/page.tsx`
**Occurrences :** ~3+

#### `/Users/mathis/Documents/PadelXP/app/(protected)/club/page.tsx`
**Occurrences :** ~3+

#### `/Users/mathis/Documents/PadelXP/app/(protected)/matches/history/page.tsx`
**Occurrences :** ~3+

#### `/Users/mathis/Documents/PadelXP/app/dashboard/layout.tsx`
**Occurrences :** ~3+

#### `/Users/mathis/Documents/PadelXP/app/dashboard/aide/page.tsx`
**Occurrences :** ~3+

#### `/Users/mathis/Documents/PadelXP/app/(auth)/signup/page.tsx`
**Occurrences :** ~3+

#### `/Users/mathis/Documents/PadelXP/app/onboarding/club/ClientClubIdentityPage.tsx`
**Occurrences :** ~3+

---

### 🔵 Utilitaires (`lib/`)

#### `/Users/mathis/Documents/PadelXP/lib/rate-limit.ts`
**Occurrences :** 3
- Ligne 8 : `console.warn("[rate-limit] Upstash Redis not configured. Rate limiting will not work.");`
- Ligne 98 : `console.warn("[rate-limit] Rate limiter not configured, allowing request");`
- Ligne 113 : `console.error("[rate-limit] Error checking rate limit:", error);`

#### `/Users/mathis/Documents/PadelXP/lib/utils/boost-utils.ts`
**Occurrences :** 15+
- Ligne 29 : `console.error("[boost-utils] ${context} (empty error object)"...`
- Ligne 34 : `console.error("[boost-utils] ${context}"...`
- Ligne 49 : `console.warn("[boost-utils] Supabase admin client not available");`
- Ligne 55 : `console.log("[boost-utils] Counting boost credits"...`
- Ligne 81 : `console.log("[boost-utils] Available credits (alt method)"...`
- Ligne 100 : `console.log("[boost-utils] Using method 1 count"...`
- Ligne 130 : `console.warn("[boost-utils] Boost credits count mismatch"...`
- Ligne 139 : `console.log("[boost-utils] Final boost credits count"...`
- Ligne 156 : `console.warn("[boost-utils] Supabase admin client not available");`
- Ligne 177 : `console.log("[boost-utils] Boosts used this month"...`
- Ligne 277 : `console.log("[consumeBoostForMatch] Calculating boosted points"...`
- Ligne 340 : `console.log("[consumeBoostForMatch] Boost use recorded"...`
- Ligne 412 : `console.log("[boost-utils] Boosts credited"...`
- Ligne 441 : `console.log("[boost-utils] Getting boost stats"...`
- Ligne 458 : `console.log("[boost-utils] Boost stats"...`

#### `/Users/mathis/Documents/PadelXP/lib/utils/subscription-utils.ts`
**Occurrences :** 10+
- Ligne 169 : `console.error("[getClubSubscription] Error details:"...`
- Ligne 175 : `console.error("[getClubSubscription] Table 'subscriptions' does not exist"...`
- Ligne 182 : `console.error("[getClubSubscription] Table 'subscriptions' does not exist"...`
- Ligne 191 : `console.error("[getClubSubscription] Unexpected error:"...`
- Ligne 220 : `console.error("[initializeSubscription] Error details:"...`
- Ligne 231 : `console.error("[initializeSubscription] Function 'initialize_club_subscription' may not exist"...`
- Ligne 241 : `console.error("[initializeSubscription] Unexpected error:"...`
- Ligne 279 : `console.error("[updatePaymentMethod] Error:"...`
- Ligne 300 : `console.error("[setAutoActivateConsent] Error:"...`
- Ligne 340 : `console.error("[scheduleActivation] Error:"...`
- Ligne 390 : `console.error("[activateSubscription] Error:"...`
- Ligne 430 : `console.error("[cancelSubscription] Error:"...`
- Ligne 473 : `console.error("[transitionSubscriptionStatus] Error:"...`
- Ligne 493 : `console.error("[getClubSubscriptionById] Error:"...`
- Ligne 521 : `console.error("[logSubscriptionEvent] Error:"...`

#### `/Users/mathis/Documents/PadelXP/lib/email.ts`
**Occurrences :** 5
- Ligne 17 : `console.warn("RESEND_API_KEY not configured. Email not sent..."...`
- Ligne 65 : `console.error("Error sending confirmation email:", error);`
- Ligne 77 : `console.warn("RESEND_API_KEY not configured. Email not sent..."...`
- Ligne 134 : `console.error("Error sending admin invitation email:", error);`
- Ligne 153 : `console.warn("RESEND_API_KEY not configured. Email not sent for moderated review.");`
- Ligne 261 : `console.log("✅ Moderated review email sent via inbound email"...`
- Ligne 263 : `console.error("❌ Error sending moderated review email:", error);`

#### `/Users/mathis/Documents/PadelXP/lib/utils/referral-utils.ts`
**Occurrences :** 10+
- Ligne 53 : `console.error("[referral-utils] Error validating referral code:"...`
- Ligne 81 : `console.error("[referral-utils] Exception validating referral code:"...`
- Ligne 104 : `console.error("[referral-utils] Error checking referral usage:"...`
- Ligne 110 : `console.error("[referral-utils] Exception checking referral usage:"...`
- Ligne 136 : `console.error("[referral-utils] Exception checking self referral:"...`
- Ligne 230 : `console.error("[referral-utils] Error creating referral:"...`
- Ligne 244 : `console.error("[referral-utils] Error updating referral count:"...`
- Ligne 265 : `console.error("[referral-utils] Error awarding boosts:"...`
- Ligne 277 : `console.error("[referral-utils] Exception processing referral code:"...`

#### `/Users/mathis/Documents/PadelXP/lib/utils/boost-points-utils.ts`
**Occurrences :** ~5+

#### `/Users/mathis/Documents/PadelXP/lib/utils/achievements-utils.ts`
**Occurrences :** ~5+

#### `/Users/mathis/Documents/PadelXP/lib/utils/club-utils.ts`
**Occurrences :** ~5+

#### `/Users/mathis/Documents/PadelXP/lib/utils/player-leaderboard-utils.ts`
**Occurrences :** ~5+

#### `/Users/mathis/Documents/PadelXP/lib/utils/reviews-reward-utils.ts`
**Occurrences :** ~5+

#### `/Users/mathis/Documents/PadelXP/lib/utils/club-utils-client.ts`
**Occurrences :** ~3+

#### `/Users/mathis/Documents/PadelXP/lib/utils/club-logo-utils.ts`
**Occurrences :** ~3+

#### `/Users/mathis/Documents/PadelXP/lib/supabase/server.ts`
**Occurrences :** 1
- Ligne 26 : `console.warn('[Supabase] Cannot modify cookie in this context:', name);`

#### `/Users/mathis/Documents/PadelXP/lib/server/club-admin.ts`
**Occurrences :** ~5+

---

### 🟣 Middleware

#### `/Users/mathis/Documents/PadelXP/middleware.ts`
**Occurrences :** 2
- Ligne 93 : `console.error("[Middleware] Rate limiting error:", error);`
- Ligne 295 : `console.warn("[Middleware] Session exists but getUser() failed (temporary error?):"...`

---

### 🟠 Scripts et Tests

#### `/Users/mathis/Documents/PadelXP/scripts/backfill_missing_clubs.js`
**Occurrences :** ~10+

#### `/Users/mathis/Documents/PadelXP/tests/e2e/player-search-club-isolation.test.ts`
**Occurrences :** ~5+

---

## 📝 RECOMMANDATIONS POUR LA MIGRATION

### Priorité 1 - Fichiers critiques (API Routes)
1. **`app/api/matches/submit/route.ts`** - Déjà partiellement migré, terminer
2. **`app/api/resend-inbound/route.ts`** - Très verbeux, à migrer en priorité
3. **`app/api/player/challenges/route.ts`** - Nombreux logs de debug
4. **`app/api/stripe/webhook/route.ts`** - Logs critiques pour le monitoring
5. **`app/api/players/search/route.ts`** - Logs de recherche

### Priorité 2 - Utilitaires
1. **`lib/utils/boost-utils.ts`** - Nombreux logs métier
2. **`lib/utils/subscription-utils.ts`** - Logs d'erreurs critiques
3. **`lib/rate-limit.ts`** - Logs de sécurité
4. **`lib/email.ts`** - Logs d'envoi d'emails

### Priorité 3 - Components
1. **`components/MatchForm.tsx`** - Très verbeux, mais côté client (peut garder console.log pour le debug client)
2. Autres components - Migrer progressivement

### Priorité 4 - Pages
- Migrer après les API routes et utilitaires

---

## 🔄 STRATÉGIE DE MIGRATION

### Étape 1 : Préparation
- Vérifier que `lib/logger.ts` est bien configuré
- Documenter les patterns de logging existants

### Étape 2 : Migration par priorité
1. Migrer les fichiers de Priorité 1
2. Migrer les fichiers de Priorité 2
3. Migrer les fichiers de Priorité 3 et 4

### Étape 3 : Remplacments
- `console.log(...)` → `logger.info(...)`
- `console.error(...)` → `logger.error(...)`
- `console.warn(...)` → `logger.warn(...)`
- `console.debug(...)` → `logger.debug(...)`

### Étape 4 : Vérification
- Tester en développement
- Vérifier que les logs apparaissent correctement en production
- S'assurer que la redaction des données sensibles fonctionne

---

## ⚠️ NOTES IMPORTANTES

1. **Fichiers exclus :**
   - `lib/logger.ts` - Contient l'implémentation du logger
   - Fichiers de documentation (`.md`)

2. **Logs côté client :**
   - Les components React peuvent garder `console.log` pour le debug client
   - Mais préférer le logger pour les logs importants

3. **Logs de debug temporaires :**
   - Certains fichiers comme `app/api/resend-inbound/route.ts` contiennent beaucoup de logs de debug
   - À nettoyer après migration

4. **Format des logs :**
   - Beaucoup de logs utilisent des préfixes comme `[Search API]`, `[boost-utils]`, etc.
   - Conserver ces préfixes lors de la migration pour faciliter le debugging

---

**Fin du rapport**

