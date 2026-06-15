import { headers } from "next/headers";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import DownloadClient from "./DownloadClient";

// Recompute on every request so each visit (= 1 QR scan) is counted.
export const dynamic = "force-dynamic";

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// Filtre les bots / aperçus de lien (WhatsApp, Telegram, crawlers...) pour que
// le compteur reflète des scans humains réels et pas des fetchs automatiques.
const BOT_UA =
  /bot|crawler|spider|crawling|preview|facebookexternalhit|slurp|bingpreview|whatsapp|telegram|discord|headless|monitor|uptime|curl|wget|python-requests|axios/i;

async function recordScan() {
  try {
    const h = await headers();
    const ua = h.get("user-agent") || "";
    if (!ua || BOT_UA.test(ua)) return;

    await supabaseAdmin.from("qr_scans").insert({
      source: "download",
      user_agent: ua.slice(0, 500),
      referer: h.get("referer"),
    });
  } catch {
    // Le suivi ne doit jamais casser la page de téléchargement.
  }
}

export default async function DownloadPage() {
  await recordScan();
  return <DownloadClient />;
}
