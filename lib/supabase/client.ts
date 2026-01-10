"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/types_db";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
  
  if (!url || !anon) {
    throw new Error("Supabase env vars are missing (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY)");
  }

  return createBrowserClient<Database>(url, anon);
}
