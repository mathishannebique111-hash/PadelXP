-- Migration : Mettre à jour handle_new_user() pour être compatible avec le système de parrainage
-- Date : 2025-01-XX
-- À exécuter après create_referral_system.sql

-- Mettre à jour la fonction handle_new_user() pour qu'elle laisse le trigger générer le code de parrainage
-- Le trigger trigger_set_referral_code s'exécutera automatiquement et générera un code si referral_code est NULL
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Ne pas créer de profil joueur si c'est un compte club (role = 'owner')
  IF NEW.raw_user_meta_data->>'role' = 'owner' THEN
    -- C'est un compte club, on ne crée pas de profil joueur
    RETURN NEW;
  END IF;
  
  -- Sinon, créer le profil joueur comme d'habitude
  -- Le champ referral_code sera NULL, et le trigger trigger_set_referral_code générera automatiquement un code
  INSERT INTO public.profiles (id, display_name, email, first_name, last_name, referral_code)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      SPLIT_PART(NEW.email, '@', 1),
      'Joueur'
    ),
    NEW.email,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    NULL -- Le trigger générera automatiquement un code de parrainage
  )
  ON CONFLICT (id) DO UPDATE SET
    display_name = COALESCE(EXCLUDED.display_name, profiles.display_name),
    email = COALESCE(EXCLUDED.email, profiles.email),
    first_name = COALESCE(EXCLUDED.first_name, profiles.first_name),
    last_name = COALESCE(EXCLUDED.last_name, profiles.last_name),
    -- Ne pas écraser le referral_code existant lors d'un UPDATE
    referral_code = COALESCE(profiles.referral_code, EXCLUDED.referral_code);
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- En cas d'erreur (par exemple si le trigger de génération de code échoue),
    -- logger l'erreur mais ne pas bloquer la création de l'utilisateur
    -- Le profil pourra être créé manuellement plus tard via /api/player/attach
    RAISE WARNING 'Erreur lors de la création automatique du profil pour l''utilisateur %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Vérifier que le trigger existe toujours
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'on_auth_user_created' 
    AND tgrelid = 'auth.users'::regclass
  ) THEN
    -- Recréer le trigger s'il n'existe pas
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_new_user();
  END IF;
END $$;

