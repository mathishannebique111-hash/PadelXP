import { NextRequest, NextResponse } from 'next/server';
import PDFDocument from 'pdfkit';
import { createClient } from '@/lib/supabase/server';
import { getUserClubInfo } from '@/lib/utils/club-utils';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { logger } from '@/lib/logger';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-12-18.acacia',
});

const supabaseAdmin = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: { autoRefreshToken: false, persistSession: false }
      }
    )
  : null;

export const dynamic = 'force-dynamic';

/**
 * API de génération de factures PDF conformes aux obligations légales françaises
 * 
 * Mentions obligatoires incluses :
 * - Numéro de facture unique
 * - Date d'émission et date de prestation
 * - Identité vendeur et client
 * - Numéro SIREN du client (obligatoire B2B depuis 2024)
 * - Nature de l'opération (obligatoire depuis 2024)
 * - Prix HT, TVA, TTC
 * - Conditions de paiement
 * - Mentions légales (pénalités de retard, indemnité forfaitaire)
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = createClient();
    
    // Vérifier l'authentification
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Non autorisé. Vous devez être connecté.' },
        { status: 401 }
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Configuration serveur manquante' },
        { status: 500 }
      );
    }

    // Récupérer le club de l'utilisateur
    const { clubId } = await getUserClubInfo();
    if (!clubId) {
      return NextResponse.json(
        { error: 'Club non trouvé' },
        { status: 404 }
      );
    }

    // Récupérer le numéro de facture depuis les query params
    const { searchParams } = new URL(req.url);
    const invoiceNumber = searchParams.get('invoiceNumber');
    const stripeInvoiceId = searchParams.get('stripeInvoiceId');

    if (!invoiceNumber && !stripeInvoiceId) {
      return NextResponse.json(
        { error: 'invoiceNumber ou stripeInvoiceId requis' },
        { status: 400 }
      );
    }

    // Récupérer les informations du club
    const { data: club } = await supabaseAdmin
      .from('clubs')
      .select('*')
      .eq('id', clubId)
      .maybeSingle();

    if (!club) {
      return NextResponse.json(
        { error: 'Club non trouvé' },
        { status: 404 }
      );
    }

    // Récupérer l'abonnement
    const { data: subscription } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('club_id', clubId)
      .maybeSingle();

    if (!subscription) {
      return NextResponse.json(
        { error: 'Abonnement non trouvé' },
        { status: 404 }
      );
    }

    // Récupérer la facture Stripe si disponible
    let stripeInvoice: Stripe.Invoice | null = null;
    if (stripeInvoiceId) {
      try {
        stripeInvoice = await stripe.invoices.retrieve(stripeInvoiceId);
      } catch (error) {
        logger.error({ error: error instanceof Error ? error.message : String(error), userId: user.id.substring(0, 8) + "…", clubId: clubId.substring(0, 8) + "…", stripeInvoiceId: stripeInvoiceId?.substring(0, 8) + "…" }, '[Invoice] Erreur récupération facture Stripe:');
      }
    }

    // Informations du prestataire (à compléter avec vos informations)
    const provider = {
      name: 'PadelXP / PadelLeague',
      siret: process.env.SIRET_NUMBER || '[À compléter]',
      siren: process.env.SIREN_NUMBER || '[À compléter]',
      vatNumber: process.env.VAT_NUMBER || '[À compléter]',
      address: '[Adresse complète à compléter]',
      email: 'contact@padelxp.com',
      phone: '[À compléter]',
    };

    // Informations du client
    const customer = {
      name: club.name || '[Nom du club]',
      address: club.address || '[Adresse à compléter]',
      siren: club.siren || null, // Obligatoire pour B2B depuis 2024
      email: user.email || '',
    };

    // Calculer les dates de période facturée
    const invoiceDate = new Date();
    const serviceStartDate = subscription.current_period_start
      ? new Date(subscription.current_period_start)
      : invoiceDate;
    const serviceEndDate = subscription.next_renewal_at
      ? new Date(subscription.next_renewal_at)
      : new Date(serviceStartDate.getTime() + 30 * 24 * 60 * 60 * 1000); // +30 jours par défaut

    // Prix (à récupérer depuis Stripe ou subscription)
    const amountHT = stripeInvoice?.subtotal 
      ? (stripeInvoice.subtotal / 100) * 0.8333 // Approx HT si TTC
      : subscription.price || 40.83;
    const amountTVA = amountHT * 0.20; // TVA 20%
    const amountTTC = amountHT + amountTVA;

    // Nature de l'opération (obligatoire depuis 2024)
    let planType = '';
    if (subscription.plan_cycle === 'monthly') planType = 'Mensuel';
    else if (subscription.plan_cycle === 'quarterly') planType = 'Trimestriel';
    else if (subscription.plan_cycle === 'annual') planType = 'Annuel';
    
    const natureOperation = `Abonnement SaaS - Formule ${planType}`;

    // Créer le PDF
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => {});

    // En-tête
    doc.fontSize(20).font('Helvetica-Bold').text('FACTURE', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(14).font('Helvetica-Bold').text(`N° ${invoiceNumber || stripeInvoice?.number || 'FACT-' + Date.now()}`, { align: 'center' });
    doc.moveDown();

    // Dates
    doc.fontSize(10).font('Helvetica').text(`Date d'émission : ${invoiceDate.toLocaleDateString('fr-FR')}`);
    doc.text(`Période : ${serviceStartDate.toLocaleDateString('fr-FR')} - ${serviceEndDate.toLocaleDateString('fr-FR')}`);
    doc.moveDown();

    // Séparateur
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown();

    // Prestataire
    doc.fontSize(12).font('Helvetica-Bold').text('PRESTATAIRE :');
    doc.fontSize(10).font('Helvetica');
    doc.text(provider.name);
    doc.text(provider.address);
    doc.text(`SIRET : ${provider.siret}`);
    if (provider.vatNumber) {
      doc.text(`TVA Intracommunautaire : ${provider.vatNumber}`);
    }
    doc.text(`Email : ${provider.email}`);
    doc.moveDown();

    // Client
    doc.fontSize(12).font('Helvetica-Bold').text('CLIENT :');
    doc.fontSize(10).font('Helvetica');
    doc.text(customer.name);
    if (customer.address) {
      doc.text(customer.address);
    }
    if (customer.siren) {
      doc.font('Helvetica-Bold').text(`SIREN : ${customer.siren}`, { continued: false });
    } else {
      doc.font('Helvetica').text('SIREN : [Non renseigné]', { continued: false });
    }
    doc.font('Helvetica');
    doc.text(`Email : ${customer.email}`);
    doc.moveDown();

    // Séparateur
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown();

    // Désignation
    doc.fontSize(12).font('Helvetica-Bold').text('DÉSIGNATION');
    doc.moveDown(0.3);
    doc.fontSize(10).font('Helvetica');
    doc.text(`Nature de l'opération : ${natureOperation}`);
    doc.text(`Période : ${serviceStartDate.toLocaleDateString('fr-FR')} - ${serviceEndDate.toLocaleDateString('fr-FR')}`);
    doc.text('Quantité : 1');
    doc.moveDown();

    // Tableau des montants
    const tableTop = doc.y;
    const itemHeight = 20;
    
    doc.font('Helvetica-Bold');
    doc.text('Prix unitaire HT', 50, tableTop);
    doc.text('Taux TVA', 350, tableTop);
    doc.text('Montant HT', 400, tableTop);
    doc.text('Montant TVA', 470, tableTop);
    doc.moveDown(0.5);
    
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.5);
    
    doc.font('Helvetica');
    doc.text(`${amountHT.toFixed(2)} €`, 50);
    doc.text('20,00%', 350);
    doc.text(`${amountHT.toFixed(2)} €`, 400);
    doc.text(`${amountTVA.toFixed(2)} €`, 470);
    doc.moveDown();
    
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.5);
    
    doc.font('Helvetica-Bold').fontSize(11);
    doc.text('MONTANT TTC', 50);
    doc.text(`${amountTTC.toFixed(2)} €`, 470);
    doc.moveDown();

    // Séparateur
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown();

    // Conditions de paiement
    doc.fontSize(11).font('Helvetica-Bold').text('Conditions de paiement :');
    doc.fontSize(10).font('Helvetica');
    doc.text(`Prélèvement automatique par carte bancaire`);
    if (stripeInvoice?.paid) {
      doc.text(`Paiement effectué le ${new Date(stripeInvoice.created * 1000).toLocaleDateString('fr-FR')}`);
    }
    doc.moveDown();

    // Mentions légales
    doc.fontSize(10).font('Helvetica-Bold').text('Mentions légales :');
    doc.font('Helvetica');
    doc.text('• TVA due au titre de l\'article 259 B du CGI', { indent: 10 });
    doc.text('• En cas de retard de paiement :', { indent: 10 });
    doc.text('  - Pénalités de retard : 3 fois le taux d\'intérêt légal', { indent: 20 });
    doc.text('  - Indemnité forfaitaire pour frais de recouvrement : 40 €', { indent: 20 });
    doc.moveDown();

    // Fin du document
    doc.end();

    // Attendre que le PDF soit généré
    await new Promise<void>((resolve) => {
      doc.on('end', resolve);
    });

    const pdfBuffer = Buffer.concat(chunks);

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="facture-${invoiceNumber || Date.now()}.pdf"`,
      },
    });

  } catch (error: any) {
    logger.error({ error: error?.message || String(error), stack: error?.stack, userId: user?.id?.substring(0, 8) + "…" }, '[Invoice] Erreur génération PDF:');
    return NextResponse.json(
      { error: `Erreur lors de la génération de la facture: ${error.message}` },
      { status: 500 }
    );
  }
}

