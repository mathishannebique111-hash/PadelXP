import type { Metadata } from "next";
import "./globals.css";
import CookieConsent from "@/components/cookies/CookieConsent";
import SafeAreas from './components/SafeAreas';
import OfflineWrapper from "@/components/OfflineWrapper";
import SplashOverlay from "@/components/SplashOverlay";
import { Toaster } from "sonner";
import { headers } from "next/headers";
import { extractSubdomain, getClubBranding, hexToRgbTriplet } from "@/lib/club-branding";

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers();
  const host = headersList.get('host') || '';
  const subdomain = headersList.get('x-club-subdomain') || extractSubdomain(host);
  const branding = await getClubBranding(subdomain);

  return {
    title: subdomain ? branding.name : "PadelXP",
    description: subdomain ? `Application officielle de ${branding.name}` : "Leaderboards, rangs, badges et ligues pour complexes de padel",
    icons: {
      icon: subdomain && branding.logo_url ? branding.logo_url : "/images/flavicon.png",
      shortcut: subdomain && branding.logo_url ? branding.logo_url : "/images/flavicon.png",
      apple: subdomain && branding.logo_url ? branding.logo_url : "/images/flavicon.png",
    },
  };
}

export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const headersList = await headers();
  const userAgent = headersList.get('user-agent') || '';
  const isApp = userAgent.toLowerCase().includes('padelxpcapacitor') ||
    userAgent.toLowerCase().includes('capacitor');

  // ==========================================
  // WHITE-LABEL: Récupérer le branding du club
  // ==========================================
  const host = headersList.get('host') || '';
  const subdomain = headersList.get('x-club-subdomain') || extractSubdomain(host);
  const branding = await getClubBranding(subdomain);

  // Convertir les couleurs hex en triplets RGB pour les variables CSS
  const accentRgb = hexToRgbTriplet(branding.primary_color);
  const accentHoverRgb = hexToRgbTriplet(branding.secondary_color);
  const bgRgb = hexToRgbTriplet(branding.background_color);

  // CSS dynamique pour le branding du club
  const brandingCSS = subdomain ? `
    :root {
      --theme-accent: ${accentRgb};
      --theme-accent-hover: ${accentHoverRgb};
      --theme-secondary-accent: ${accentHoverRgb};
      --theme-page: ${bgRgb};
      --theme-player-page: ${bgRgb};
      --color-primary: ${branding.primary_color};
    }
  ` : '';

  return (
    <html lang="fr" className={isApp ? 'is-app' : ''} style={{ backgroundColor: '#172554', ...(isApp ? { '--sat': '65px' } : {}) } as any} suppressHydrationWarning>
      <head>
        <meta name="viewport" content="viewport-fit=cover, width=device-width, initial-scale=1.0, minimum-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <meta name="theme-color" content={subdomain ? branding.primary_color : '#172554'} />
        <link rel="manifest" href="/api/manifest" />

        <style
          dangerouslySetInnerHTML={{
            __html: `
              html.is-app [data-hamburger-button],
              body.is-app [data-hamburger-button],
              [data-is-app="true"] [data-hamburger-button] {
                top: calc(0.75rem + 65px) !important;
                position: fixed !important;
                z-index: 100000 !important;
              }
              
              html.is-app, body.is-app {
                --sat: 65px !important;
              }
              
              html, body {
                background-color: #172554 !important;
              }

              ${brandingCSS}
            `,
          }}
        />

        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var isApp = navigator.userAgent.toLowerCase().includes('capacitor') || navigator.userAgent.toLowerCase().includes('padelxp');
                if (isApp && document.documentElement) {
                  document.documentElement.classList.add('is-app');
                  document.documentElement.style.backgroundColor = '#172554';
                }
              })();
            `,
          }}
        />
      </head>
      <body className={`${isApp ? 'is-app' : ''} bg-[#172554] text-white min-h-screen`} style={{ backgroundColor: '#172554' }} data-is-app={isApp ? 'true' : 'false'} data-club-subdomain={subdomain || ''} suppressHydrationWarning>
        <SplashOverlay isApp={isApp} clubLogoUrl={branding.logo_url} clubPrimaryColor={subdomain ? branding.primary_color : null} />
        <SafeAreas />
        <OfflineWrapper />
        {children}
        <Toaster
          position="top-center"
          richColors
          toastOptions={{
            style: { marginTop: isApp ? 'var(--sat, 65px)' : '10px' }
          }}
        />
      </body>
    </html>
  );
}

