import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'PadelXP <onboarding@resend.dev>';

    if (!apiKey) {
      return NextResponse.json({ 
        error: 'RESEND_API_KEY not configured',
        hasApiKey: false 
      }, { status: 500 });
    }

    const resend = new Resend(apiKey);

    logger.info({ hasApiKey: !!apiKey, apiKeyPrefix: apiKey.substring(0, 10) + '...', fromEmail }, '[contact-test] Testing Resend:');

    // Test simple d'envoi
    const testResult = await resend.emails.send({
      from: fromEmail,
      to: 'contactpadelxp@gmail.com',
      subject: 'Test email from PadelXP contact form',
      html: '<p>Ceci est un email de test pour vérifier que Resend fonctionne.</p>',
    });

    if (testResult.error) {
      logger.error({ error: testResult.error }, '[contact-test] Resend error:');
      return NextResponse.json({ 
        error: 'Resend API error',
        details: testResult.error,
        hasApiKey: true 
      }, { status: 500 });
    }

    logger.info({ emailId: testResult.data?.id }, '[contact-test] Email sent successfully:');

    return NextResponse.json({ 
      success: true,
      emailId: testResult.data?.id,
      hasApiKey: true,
      fromEmail 
    });
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined }, '[contact-test] Unexpected error:');
    return NextResponse.json({ 
      error: 'Unexpected error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

