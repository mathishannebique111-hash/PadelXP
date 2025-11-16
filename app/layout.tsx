import type { Metadata } from "next";
import "./globals.css";
import CookieConsent from "@/components/cookies/CookieConsent";

export const metadata: Metadata = {
  title: "PadelLeague",
  description: "Leaderboards, rangs, badges et ligues pour complexes de padel",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className="bg-black">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        {/* Preload hero racket image for better LCP */}
        <link rel="preload" as="image" href="/images/padel-racket.jpg" />
      </head>
      <body className="bg-black text-white min-h-screen">
        {children}
        <CookieConsent />
      </body>
    </html>
  );
}

