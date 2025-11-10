"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function InviteAdminForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      setMessage({ type: "error", text: "Veuillez entrer un email" });
      return;
    }

    // Validation basique de l'email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setMessage({ type: "error", text: "Email invalide" });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/clubs/invite-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erreur lors de l'invitation");
      }

      setMessage({
        type: "success",
        text: `Invitation envoyée à ${email} avec succès !`
      });
      setEmail("");
      router.refresh();
    } catch (error: any) {
      setMessage({ 
        type: "error", 
        text: error.message || "Erreur lors de l'envoi de l'invitation" 
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-5">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">✉️</span>
        <h2 className="font-semibold">Inviter un administrateur</h2>
      </div>
      
      <form onSubmit={handleSubmit}>
        <div className="flex gap-2 mb-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@exemple.com"
            className="flex-1 px-4 py-2 rounded-lg bg-white/10 border border-white/15 text-white placeholder-white/40 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/40 disabled:opacity-50"
            disabled={isLoading}
            required
          />
          <button
            type="submit"
            disabled={isLoading}
            className="px-5 py-2 rounded-lg bg-blue-500 hover:bg-blue-400 border border-blue-400 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Envoi..." : "Inviter"}
          </button>
        </div>

        {message && (
          <div
            className={`rounded-lg px-4 py-3 text-sm ${
              message.type === "success"
                ? "bg-green-500/20 border border-green-400/30 text-green-200"
                : "bg-red-500/20 border border-red-400/30 text-red-200"
            }`}
          >
            {message.text}
          </div>
        )}
      </form>

      <p className="mt-3 text-xs text-white/50">
        L'administrateur invité aura accès à toutes les fonctionnalités du compte club
      </p>
    </div>
  );
}

