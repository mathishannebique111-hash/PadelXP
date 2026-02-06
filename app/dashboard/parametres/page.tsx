import { Suspense } from "react";
import ClubSettingsContent from "./ClubSettingsContent";
import PadelLoader from "@/components/ui/PadelLoader";

export const dynamic = 'force-dynamic';

export default function ClubSettingsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[50vh]">
        <PadelLoader />
      </div>
    }>
      <ClubSettingsContent />
    </Suspense>
  );
}
