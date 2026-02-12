
-- DIAGNOSTIC SCRIPT
-- Run this to reveal the ACTUAL state of the database.

SELECT '--- FUNCTION DEFINITION ---' as section;
SELECT pg_get_functiondef('public.handle_new_user'::regproc);

SELECT '--- TRIGGERS ON AUTH.USERS ---' as section;
SELECT trigger_name, action_statement 
FROM information_schema.triggers 
WHERE event_object_table = 'users' 
AND event_object_schema = 'auth';

SELECT '--- TRIGGERS ON PUBLIC.PROFILES ---' as section;
SELECT trigger_name, action_statement 
FROM information_schema.triggers 
WHERE event_object_table = 'profiles' 
AND event_object_schema = 'public';

SELECT '--- CONSTRAINTS ON PUBLIC.PROFILES ---' as section;
SELECT conname, pg_get_constraintdef(c.oid)
FROM pg_constraint c
JOIN pg_class t ON c.conrelid = t.oid
WHERE t.relname = 'profiles';
