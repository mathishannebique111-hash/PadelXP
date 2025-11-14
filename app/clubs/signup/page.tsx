import { Suspense } from "react";
import ClientAdminInvite from "./ClientAdminInvite";

// Forcer le rendu dynamique pour éviter les erreurs de prerender
export const dynamic = 'force-dynamic';

export default function ClubInvitePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-white">Chargement...</div>
      </div>
    }>
      <ClientAdminInvite />
    </Suspense>
  );
}

