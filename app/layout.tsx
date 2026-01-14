import type { Metadata } from "next";
import "./globals.css";
import CookieConsent from "@/components/cookies/CookieConsent";
import SafeAreas from './components/SafeAreas';

export const metadata: Metadata = {
  title: "PadelXP",
  description: "Leaderboards, rangs, badges et ligues pour complexes de padel",
  icons: {
    icon: "/images/flavicon.png",
    shortcut: "/images/flavicon.png",
    apple: "/images/flavicon.png",
  },
};

import { headers } from "next/headers";

export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const headersList = await headers();
  const userAgent = headersList.get('user-agent') || '';
  const isApp = userAgent.toLowerCase().includes('padelxpcapacitor') ||
    userAgent.toLowerCase().includes('capacitor');

  return (
    <html lang="fr" className={isApp ? 'is-app' : ''} style={{ backgroundColor: '#172554', ...(isApp ? { '--sat': '65px' } : {}) } as any} suppressHydrationWarning>
      <head>
        <meta name="viewport" content="viewport-fit=cover, width=device-width, initial-scale=1.0, minimum-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <meta name="theme-color" content="#172554" />

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
      <body className={`${isApp ? 'is-app' : ''} bg-[#172554] text-white min-h-screen`} style={{ backgroundColor: '#172554' }} data-is-app={isApp ? 'true' : 'false'} suppressHydrationWarning>
        <SafeAreas />
        {children}
        <CookieConsent />
      </body>
    </html>
  );
}
