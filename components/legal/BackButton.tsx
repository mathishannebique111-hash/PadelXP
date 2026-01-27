"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Suspense } from "react";

function BackButtonContent() {
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo");

  const defaultHref = "/#pricing";

  return (
    <Link
      href={returnTo || defaultHref}
      className="text-white/60 hover:text-white transition-colors text-sm"
    >
      ← Retour à l'accueil
    </Link>
  );
}

export default function BackButton() {
  return (
    <Suspense fallback={
      <Link
        href="/#pricing"
        className="text-white/60 hover:text-white transition-colors text-sm"
      >
        ← Retour à l'accueil
      </Link>
    }>
      <BackButtonContent />
    </Suspense>
  );
}

