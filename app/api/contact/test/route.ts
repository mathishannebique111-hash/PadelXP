import { NextResponse } from 'next/server';
import { Resend } from 'resend';

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

    console.log('[contact-test] Testing Resend:', {
      hasApiKey: !!apiKey,
      apiKeyPrefix: apiKey.substring(0, 10) + '...',
      fromEmail,
    });

    // Test simple d'envoi
    const testResult = await resend.emails.send({
      from: fromEmail,
      to: 'contactpadelxp@gmail.com',
      subject: 'Test email from PadelXP contact form',
      html: '<p>Ceci est un email de test pour vérifier que Resend fonctionne.</p>',
    });

    if (testResult.error) {
      console.error('[contact-test] Resend error:', testResult.error);
      return NextResponse.json({ 
        error: 'Resend API error',
        details: testResult.error,
        hasApiKey: true 
      }, { status: 500 });
    }

    console.log('[contact-test] Email sent successfully:', testResult.data);

    return NextResponse.json({ 
      success: true,
      emailId: testResult.data?.id,
      hasApiKey: true,
      fromEmail 
    });
  } catch (error) {
    console.error('[contact-test] Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Unexpected error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

