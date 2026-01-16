import { Suspense } from "react";
import ClubSettingsContent from "./ClubSettingsContent";

export const dynamic = 'force-dynamic';

export default function ClubSettingsPage() {
  return (
    <Suspense fallback={<div className="text-white/60">Chargement...</div>}>
      <ClubSettingsContent />
    </Suspense>
  );
}
