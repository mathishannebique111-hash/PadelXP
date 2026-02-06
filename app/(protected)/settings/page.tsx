import { Suspense } from "react";
import SettingsContent from "./SettingsContent";

export default function SettingsPage() {
  return (
    <Suspense fallback={null}>
      <SettingsContent />
    </Suspense>
  );
}

