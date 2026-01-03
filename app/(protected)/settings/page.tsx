import { Suspense } from "react";
import SettingsContent from "./SettingsContent";

export const dynamic = 'force-dynamic';

export default function SettingsPage() {
  return (
    <Suspense fallback={<div>Chargement...</div>}>
      <SettingsContent />
    </Suspense>
  );
}

