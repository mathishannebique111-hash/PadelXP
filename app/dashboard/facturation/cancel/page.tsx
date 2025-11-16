import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

async function CancelContent() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/clubs/login?next=/dashboard/facturation');
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-8">
      <div className="max-w-md w-full space-y-6 text-center">
        <div className="text-6xl mb-4">❌</div>
        <h1 className="text-3xl font-bold text-white">Paiement annulé</h1>
        <p className="text-white/70 text-lg">
          Le paiement a été annulé. Votre abonnement n'a pas été modifié. Vous pouvez réessayer à tout moment.
        </p>
        <div className="flex flex-col gap-3 pt-4">
          <Link
            href="/dashboard/facturation"
            className="inline-flex items-center justify-center rounded-xl px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-indigo-600 border border-blue-400/50 shadow-[0_6px_20px_rgba(59,130,246,0.3)] hover:shadow-[0_8px_24px_rgba(59,130,246,0.4)] hover:scale-105 active:scale-100 transition-all duration-300"
          >
            Retour à la page de facturation
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-xl px-6 py-3 text-sm font-semibold text-white bg-white/10 border border-white/20 hover:bg-white/20 transition-colors"
          >
            Aller au tableau de bord
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function CancelPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black text-white flex items-center justify-center">
          <div className="text-white">Chargement...</div>
        </div>
      }
    >
      <CancelContent />
    </Suspense>
  );
}




