import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET() {
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Get last 10 matches
    const { data: matches, error: matchError } = await supabase
        .from("matches")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);

    if (matchError) return NextResponse.json({ error: matchError });

    let html = `
    <html>
      <head>
        <title>Debug Ranking PadelXP</title>
        <style>
          body { font-family: system-ui, sans-serif; padding: 20px; background: #f0f2f5; }
          .card { background: white; padding: 20px; border-radius: 12px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          h1 { color: #071554; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { text-align: left; padding: 10px; border-bottom: 1px solid #eee; }
          th { background: #f8f9fa; }
          .badge { padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
          .confirmed { background: #dcfce7; color: #166534; }
          .pending { background: #fef9c3; color: #854d0e; }
          button { background: #0066FF; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: bold; }
          button:hover { background: #0052cc; }
          .error { color: red; background: #fee2e2; padding: 10px; border-radius: 6px; }
        </style>
      </head>
      <body>
        <h1>🛠️ Debug Ranking System V3 (Fix Redirect)</h1>
        <p>Les colonnes "Avant", "Après" et "Variation" montrent si le calcul a fonctionné.</p>
  `;

    for (const match of matches) {
        const { data: participants } = await supabase
            .from("match_participants")
            .select(`
        user_id, team, player_type, 
        level_before, level_after, level_change,
        profiles ( id, display_name, niveau_padel, matchs_joues )
      `)
            .eq("match_id", match.id);

        html += `
      <div class="card">
        <div style="display:flex; justify-content:space-between; align-items:center;">
            <div>
                <h3>Match ${match.id.substring(0, 8)}...</h3>
                <span class="badge ${match.status}">${match.status}</span>
                <span style="color:#666; font-size:14px; margin-left:10px;">${new Date(match.created_at).toLocaleString()}</span>
                <div style="font-size:12px; margin-top:4px; color:#555;">
                   Winner Team (Enum): <strong>${match.winner_team || 'NULL'}</strong> | 
                   Winner ID: <strong>${match.winner_team_id || 'NULL'}</strong>
                </div>
            </div>
            <form method="POST">
                <input type="hidden" name="match_id" value="${match.id}" />
                <button type="submit">🔄 Forcer le Recalcul (Trigger)</button>
            </form>
        </div>
        
        <table>
            <thead>
                <tr>
                    <th>Joueur</th>
                    <th>Équipe</th>
                    <th>Niveau Actuel</th>
                    <th>Matchs Totaux</th>
                    <th>Avant Match</th>
                    <th>Après Match</th>
                    <th>Variation</th>
                </tr>
            </thead>
            <tbody>
    `;

        participants?.forEach(p => {
            const profile = (p.profiles as any) || {};
            html += `
            <tr>
                <td>${profile.display_name || 'N/A'}</td>
                <td>${p.team}</td>
                <td>${profile.niveau_padel || '-'}</td>
                <td>${profile.matchs_joues || 0}</td>
                <td>${p.level_before ?? '<span style="color:#ccc">null</span>'}</td>
                <td>${p.level_after ?? '<span style="color:#ccc">null</span>'}</td>
                <td>
                    ${p.level_change
                    ? (p.level_change > 0 ? '+' + p.level_change : p.level_change)
                    : '<span style="color:red">Pas calculé</span>'
                }
                </td>
            </tr>
        `;
        });

        html += `
            </tbody>
        </table>
      </div>
    `;
    }

    html += `</body></html>`;

    return new NextResponse(html, { headers: { "Content-Type": "text/html" } });
}

export async function POST(req: Request) {
    const supabase = createClient(supabaseUrl, supabaseKey);

    try {
        const formData = await req.formData();
        const matchId = formData.get("match_id") as string;

        if (!matchId) return NextResponse.json({ error: "No match ID" });

        // 1. Reset to pending
        await supabase.from("matches").update({ status: 'pending' }).eq("id", matchId);

        // 2. Set back to confirmed (triggers logic)
        await new Promise(r => setTimeout(r, 500));

        const { error } = await supabase.from("matches").update({ status: 'confirmed' }).eq("id", matchId);

        if (error) throw error;

        // USE 303 to force GET, preventing infinite loop
        return NextResponse.redirect(new URL("/api/debug-ranking", req.url), 303);

    } catch (e) {
        return NextResponse.json({ error: (e as Error).message });
    }
}
