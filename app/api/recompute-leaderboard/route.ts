import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.SUBSCRIPTION_CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return NextResponse.json({ success: false }, { status: 500 });

  const edgeUrl = `${url}/functions/v1/recompute_leaderboard`;
  const resp = await fetch(edgeUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
    cache: "no-store",
  });

  if (!resp.ok) return NextResponse.json({ success: false }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function HEAD() { return NextResponse.json({ ok: true }); }
