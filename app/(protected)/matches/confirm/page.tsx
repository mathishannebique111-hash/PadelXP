import { Suspense } from "react";
import MatchConfirmForm from "./MatchConfirmForm";

export const dynamic = 'force-dynamic';

export default function MatchConfirmPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-white">Chargement...</div>
      </div>
    }>
      <MatchConfirmForm />
    </Suspense>
  );
}
