import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserClubInfo } from "@/lib/utils/club-utils";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";
import { validateRequest } from "@/lib/validate";
import { BillingDetailsSchema } from "@/lib/validations/schemas";
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-12-18.acacia' as any, // Cast to any to avoid version mismatch TS error
});

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = SUPABASE_URL && SERVICE_ROLE_KEY
  ? createServiceClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  })
  : null;

// Helper to normalize country to ISO 2-char code
function normalizeCountryCode(country: string | undefined): string | null {
  if (!country) return null;
  const c = country.trim().toUpperCase();
  if (c.length === 2) return c; // Already ISO

  const map: Record<string, string> = {
    'FRANCE': 'FR',
    'BELGIQUE': 'BE',
    'BELGIUM': 'BE',
    'SUISSE': 'CH',
    'SWITZERLAND': 'CH',
    'ESPAGNE': 'ES',
    'SPAIN': 'ES',
    'ITALIE': 'IT',
    'ITALY': 'IT',
    'ALLEMAGNE': 'DE',
    'GERMANY': 'DE',
    'ROYAUME-UNI': 'GB',
    'UNITED KINGDOM': 'GB',
    'UK': 'GB',
    'PORTUGAL': 'PT',
    'LUXEMBOURG': 'LU',
  };
  return map[c] || null;
}

export async function POST(req: Request) {
  let userIdForLog: string | undefined;

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }
    userIdForLog = user.id;

    const { clubId } = await getUserClubInfo();
    if (!clubId) {
      return NextResponse.json({ error: "Aucun club associé" }, { status: 400 });
    }

    const body = await req.json();

    // Validation des données
    const validation = validateRequest(BillingDetailsSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // Utiliser les données validées
    const { billingEmail, billingAddress, vatNumber } = validation.data;

    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Configuration serveur manquante" }, { status: 500 });
    }

    // Récupérer l'abonnement actuel
    const { data: subscription, error: subError } = await supabaseAdmin
      .from("subscriptions")
      .select("id, stripe_customer_id")
      .eq("club_id", clubId)
      .maybeSingle();

    if (subError && subError.code !== 'PGRST116') {
      logger.error("[update-billing] Error fetching subscription", { error: subError, userId: user.id, clubId });
      return NextResponse.json({ error: "Erreur lors de la récupération de l'abonnement" }, { status: 500 });
    }

    // Préparer les données à mettre à jour en DB
    const updateData: any = {};
    if (billingEmail !== undefined) updateData.billing_email = billingEmail || null;
    if (billingAddress !== undefined) updateData.billing_address = billingAddress || null;
    if (vatNumber !== undefined) updateData.vat_number = vatNumber || null;

    let updateResult;
    if (subscription) {
      // Mettre à jour l'abonnement existant
      updateResult = await supabaseAdmin
        .from("subscriptions")
        .update(updateData)
        .eq("id", subscription.id);
    } else {
      // Créer un enregistrement si aucun abonnement n'existe
      updateResult = await supabaseAdmin
        .from("subscriptions")
        .insert({
          club_id: clubId,
          status: "trialing",
          ...updateData,
        });
    }

    if (updateResult.error) {
      logger.error("[update-billing] Error updating billing info", { error: updateResult.error, userId: user.id, clubId });
      return NextResponse.json(
        { error: "Erreur lors de la mise à jour des informations de facturation" },
        { status: 500 }
      );
    }

    // SYNC WITH STRIPE
    // Si nous avons un customer ID, nous mettons à jour les infos chez Stripe
    if (subscription?.stripe_customer_id && process.env.STRIPE_SECRET_KEY) {
      try {
        const stripeUpdateParams: Stripe.CustomerUpdateParams = {};

        // Sync Email
        if (billingEmail) {
          stripeUpdateParams.email = billingEmail;
        }

        // Sync Address
        if (billingAddress) {
          if (typeof billingAddress === 'string') {
            stripeUpdateParams.address = { line1: billingAddress };
          } else {
            const countryCode = normalizeCountryCode(billingAddress.country);
            // Stripe requires at least one address field if address is passed.
            // And country must be ISO code if present.
            // We only send address if we have at least a street or city or zip.
            if (billingAddress.street || billingAddress.postal || billingAddress.city || countryCode) {
              stripeUpdateParams.address = {
                line1: billingAddress.street || '',
                postal_code: billingAddress.postal || '',
                city: billingAddress.city || '',
                country: countryCode || undefined, // undefined prevents sending invalid code
              };
            }
          }
        }

        if (Object.keys(stripeUpdateParams).length > 0) {
          await stripe.customers.update(subscription.stripe_customer_id, stripeUpdateParams);
          logger.info('[update-billing] Synced billing info to Stripe', { customerId: subscription.stripe_customer_id });
        }

      } catch (stripeError: any) {
        // En cas d'erreur Stripe, on loggue mais on ne fait pas échouer la requête utilisateur
        // car la DB locale est à jour.
        logger.error('[update-billing] Error syncing to Stripe', { error: stripeError.message });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    logger.error("[update-billing] Unexpected error", { error: error?.message || String(error), userId: userIdForLog || 'unknown' });
    return NextResponse.json(
      { error: error.message || "Erreur inattendue" },
      { status: 500 }
    );
  }
}
