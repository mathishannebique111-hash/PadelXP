"use client";

import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
      // Force WSS (WebSocket Secure) en production pour éviter les erreurs d'insécurité sur HTTPS
      ...(typeof window !== 'undefined' && window.location.protocol === 'https:' ? {
        global: {
          headers: {
            'X-WebSocket-Protocol': 'wss'
          }
        }
      } : {})
    }
  );
}
