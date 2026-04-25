import { NextResponse } from "next/server";

// DISABLED: This endpoint was activating premium without payment verification.
// Premium activation is now handled exclusively by:
// - Apple IAP validation (app/actions/apple.ts)
// - Android validation (app/actions/android.ts)
// - Stripe webhooks (app/api/webhooks/stripe/route.ts)
export async function POST() {
    return NextResponse.json(
        { error: "Cette route est désactivée. Utilisez le système de paiement." },
        { status: 403 }
    );
}
