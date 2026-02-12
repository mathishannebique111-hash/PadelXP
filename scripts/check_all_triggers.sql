
-- CHECK ALL TRIGGERS (Users + Profiles)
-- We need to see if "Nuclear" script actually removed the conflicting triggers.

SELECT '--- TRIGGERS ON AUTH.USERS (Signup) ---' as section;
SELECT 
    trigger_schema, 
    trigger_name, 
    action_timing, 
    event_manipulation, 
    action_statement 
FROM information_schema.triggers 
WHERE event_object_table = 'users' 
AND event_object_schema = 'auth';

SELECT '--- TRIGGERS ON PUBLIC.PROFILES (Cascade) ---' as section;
SELECT 
    trigger_schema, 
    trigger_name, 
    action_timing, 
    event_manipulation, 
    action_statement 
FROM information_schema.triggers 
WHERE event_object_table = 'profiles' 
AND event_object_schema = 'public';
