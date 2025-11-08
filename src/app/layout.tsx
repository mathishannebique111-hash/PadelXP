import type { Metadata } from "next";
import "../../app/globals.css";

export const metadata: Metadata = {
  title: "PadelLeague",
  description: "Leaderboards, rangs, badges et ligues pour complexes de padel",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
