import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendPushNotification } from "@/lib/notifications/send-push";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const isVercelCron = req.headers.get("x-vercel-cron") === "1";
  const secret = req.nextUrl.searchParams.get("secret");
  const isAuthorized = secret === process.env.CRON_SECRET || secret === process.env.SUBSCRIPTION_CRON_SECRET;

  if (!isVercelCron && !isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { emails, title, message } = body;

  if (!emails || !title || !message) {
    return NextResponse.json({ error: "Missing emails, title or message" }, { status: 400 });
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const results: { email: string; status: string }[] = [];

  for (const email of emails) {
    // Find user by email via profiles table (auth.admin.listUsers paginates at 50)
    const { data: profile } = await admin
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (!profile) {
      results.push({ email, status: "user_not_found" });
      continue;
    }

    const user = { id: profile.id };

    // Create in-app notification
    const { error: notifError } = await admin.from("notifications").insert({
      user_id: user.id,
      type: "system",
      title,
      message,
      data: { type: "personal_message" },
      is_read: false,
    });

    if (notifError) {
      results.push({ email, status: `notif_error: ${notifError.message}` });
      continue;
    }

    // Send push
    await sendPushNotification(user.id, title, message, { type: "personal_message" }).catch(() => {});

    results.push({ email, status: "sent" });
  }

  return NextResponse.json({ results });
}
