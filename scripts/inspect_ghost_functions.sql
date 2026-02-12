
-- INSPECT REMAINING TRIGGERS
-- These functions were not found in the migration files, so they might be legacy code causing issues.

SELECT '--- SET REFERRAL CODE ---' as section;
SELECT pg_get_functiondef('public.set_referral_code_if_null'::regproc);

SELECT '--- UPDATE CLUB PLAYERS COUNT ---' as section;
SELECT pg_get_functiondef('public.update_club_players_count'::regproc);
