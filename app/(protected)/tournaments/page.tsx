
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Image from "next/image";

export const dynamic = 'force-dynamic';

export default async function PublicTournamentsPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return redirect("/login?redirect=/tournaments");
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="w-full max-w-5xl overflow-hidden rounded-3xl bg-[#0a0f2c] shadow-2xl ring-1 ring-white/10">
        <div className="flex flex-col md:flex-row">
          {/* Left Content */}
          <div className="flex-1 p-8 md:p-12 lg:p-16 flex flex-col justify-center relative overflow-hidden">
            {/* Background Glow */}
            <div className="absolute top-0 left-0 w-64 h-64 bg-green-500/10 blur-[100px] -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none" />

            {/* Badge */}
            <div className="relative inline-flex items-center gap-2 self-start rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-[10px] md:text-xs font-bold tracking-widest uppercase text-white shadow-inner mb-6 md:mb-8 backdrop-blur-sm">
              <span className="text-gray-400">TOURNOIS</span>
              <span className="text-[#BFFF00]">ARRIVE BIENTÔT</span>
            </div>

            {/* Title */}
            <h1 className="relative text-3xl md:text-4xl lg:text-5xl font-extrabold text-white leading-[1.1] mb-6 md:mb-8">
              Rejoignez les tournois de votre club <span className="text-[#BFFF00]">en 2 clics</span>
            </h1>

            {/* Features List */}
            <div className="relative space-y-4 md:space-y-6">
              <p className="text-gray-400 text-sm md:text-base leading-relaxed">
                Bientôt, vous pourrez vous inscrire aux tournois officiels ou amicaux directement depuis votre application : tableaux automatiques, suivi en temps réel et intégration complète avec le classement du club.
              </p>

              <ul className="space-y-3 md:space-y-4 text-sm md:text-base text-gray-300">
                <li className="flex items-start gap-3">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[#BFFF00] flex-shrink-0 shadow-[0_0_8px_#BFFF00]" />
                  <span>Inscription simple et rapide aux tournois</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[#BFFF00] flex-shrink-0 shadow-[0_0_8px_#BFFF00]" />
                  <span>Suivi des résultats et tableaux en temps réel</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[#BFFF00] flex-shrink-0 shadow-[0_0_8px_#BFFF00]" />
                  <span>Notifications de matchs et planning centralisé</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Right Content - Visual */}
          <div className="relative md:w-5/12 lg:w-1/2 bg-gradient-to-br from-[#1a237e]/40 to-[#0a0f2c] min-h-[300px] md:min-h-auto flex items-center justify-center p-8 md:p-12 overflow-hidden">
            {/* Glow Effects */}
            <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-[#0066FF]/20 blur-[80px] -translate-x-1/2 -translate-y-1/2 rounded-full" />

            {/* Logo Layout */}
            <div className="relative z-10 transform transition-transform duration-700 hover:scale-105">
              <div className="relative w-64 h-24 md:w-80 md:h-32">
                <Image
                  src="/images/logo.png"
                  alt="PadelXP Logo"
                  fill
                  className="object-contain drop-shadow-[0_0_25px_rgba(0,102,255,0.3)]"
                  priority
                />
              </div>
            </div>

            {/* Overlay Patterns */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_80%)]" />
          </div>
        </div>
      </div>
    </div>
  );
}
