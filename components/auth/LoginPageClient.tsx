"use client";

import { useState } from "react";
import EmailLoginForm from "@/components/auth/EmailLoginForm";
import LoginIntro from "@/components/auth/LoginIntro";

export default function LoginPageClient() {
  const [showLogin, setShowLogin] = useState(false);

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <LoginIntro onShowLogin={() => setShowLogin(true)} />

        {showLogin && (
          <div id="email-form" className="mt-12 w-full max-w-md rounded-2xl bg-white/5 p-6 border border-white/10">
            <div className="text-sm text-white/70 mb-4">Connexion</div>
            <EmailLoginForm />
          </div>
        )}
      </div>
    </div>
  );
}



