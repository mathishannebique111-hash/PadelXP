import { Suspense } from "react";
import MatchConfirmForm from "./MatchConfirmForm";
import PadelLoader from "@/components/ui/PadelLoader";

export const dynamic = 'force-dynamic';

export default function MatchConfirmPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <PadelLoader />
      </div>
    }>
      <MatchConfirmForm />
    </Suspense>
  );
}
