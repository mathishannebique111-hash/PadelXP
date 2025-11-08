"use client";
import { useState } from "react";
import EmailLoginForm from "@/components/auth/EmailLoginForm";
import PlayerClubGate from "@/components/auth/PlayerClubGate";

export default function ClientGateWrapper() {
  const [valid, setValid] = useState(false);
  const [club, setClub] = useState<{ slug?: string; code?: string }>({});
  return (
    <div className="w-full max-w-md rounded-2xl bg-white/5 border border-white/10 p-8">
      <h1 className="text-2xl font-extrabold mb-2">Connexion joueur</h1>
      <p className="text-white/60 mb-6 text-sm">Sélectionnez votre club / complexe puis saisissez votre code d’invitation.</p>
      <PlayerClubGate onValidChange={setValid} onValidChange={(ok)=>setValid(ok)} />
      <div className="mt-6">
        <EmailLoginForm />
      </div>
    </div>
  );
}



