import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  const { userIds } = await req.json() as { userIds: string[] };
  
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  
  if (!serviceKey || !supabaseUrl) {
    return NextResponse.json({ error: "Configuration manquante" }, { status: 500 });
  }
  
  const serviceSupabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false }
  });
  
  // Vérifier quels IDs existent dans auth.users
  const ghostStatus: Record<string, boolean> = {};
  
  for (const userId of userIds) {
    try {
      const { data } = await serviceSupabase.auth.admin.getUserById(userId);
      ghostStatus[userId] = !data?.user; // Si pas d'utilisateur, c'est un ghost
    } catch {
      ghostStatus[userId] = true; // Erreur = probablement un ghost
    }
  }
  
  return NextResponse.json({ ghostStatus });
}

