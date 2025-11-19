import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/lib/types_db";

export async function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
  if (!url || !anon) {
    throw new Error("Supabase env vars are missing (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY)");
  }

  const cookieStore = await cookies();
  return createServerClient<Database>(url, anon, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: any) {
        try {
          cookieStore.set(name, value, options);
        } catch (error) {
          // Silently fail if cookies can't be modified (e.g., in Server Components)
          // Cookies can only be modified in Server Actions or Route Handlers
          // This is expected behavior in Next.js 15
          if (process.env.NODE_ENV === 'development') {
            console.warn('[Supabase] Cannot modify cookie in this context:', name);
          }
        }
      },
      remove(name: string, options: any) {
        try {
          cookieStore.set(name, "", { ...options, expires: new Date(0) });
        } catch (error) {
          // Silently fail if cookies can't be modified (e.g., in Server Components)
          // Cookies can only be modified in Server Actions or Route Handlers
          // This is expected behavior in Next.js 15
          if (process.env.NODE_ENV === 'development') {
            console.warn('[Supabase] Cannot remove cookie in this context:', name);
          }
        }
      },
    },
  });
}


