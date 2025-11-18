import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const supabase = createClient();
    await supabase.auth.signOut();
    
    // Supprimer le cookie last_activity lors de la déconnexion
    // Retourner un JSON pour que le client gère la redirection
    const response = NextResponse.json({ success: true });
    response.cookies.set("last_activity", "", { expires: new Date(0), path: "/" });
    
    return response;
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "signout_failed" }, { status: 500 });
  }
}


