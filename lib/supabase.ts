"use client";

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import type { Database } from "./types_db";

export function supabaseClient() {
  return createClientComponentClient<Database>();
}
