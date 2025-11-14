import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types_db";

/**
 * Crée un client Supabase avec les privilèges admin (Service Role)
 * Utilisé pour bypass RLS et effectuer des opérations administratives
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Supabase service client requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
    );
  }

  return createClient<Database>(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

