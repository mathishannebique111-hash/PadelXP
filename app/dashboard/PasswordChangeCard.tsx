"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { logger } from "@/lib/logger";
import { KeyRound, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function PasswordChangeCard() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const supabase = createClient();

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword || !newPassword) return;
    if (newPassword.length < 8) {
      setErrorMessage("Le nouveau mot de passe doit contenir au moins 8 caractères.");
      setStatus("error");
      return;
    }

    setIsLoading(true);
    setStatus("idle");
    setErrorMessage("");

    try {
      // 1. Re-authentifier pour vérifier l'ancien mot de passe
      const { error: reauthError } = await supabase.auth.reauthenticate({
        password: oldPassword,
      });

      if (reauthError) {
        if (reauthError.message.includes("invalid claim") || reauthError.message.includes("Invalid login credentials")) {
          throw new Error("L'ancien mot de passe est incorrect.");
        }
        throw reauthError;
      }

      // 2. Mettre à jour avec le nouveau mot de passe
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) throw updateError;

      setStatus("success");
      setOldPassword("");
      setNewPassword("");
      toast.success("Mot de passe modifié avec succès");
      
      // Refermer après un court délai
      setTimeout(() => {
        setIsExpanded(false);
        setStatus("idle");
      }, 3000);

    } catch (err: any) {
      logger.error("[PasswordChangeCard] Error updating password", err);
      setErrorMessage(err.message || "Une erreur est survenue lors de la modification du mot de passe.");
      setStatus("error");
      toast.error(err.message || "Erreur lors de la modification");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur-sm">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
          <KeyRound className="w-5 h-5 text-blue-400" />
        </div>
        <h2 className="text-xl font-semibold text-white">Modifier mon mot de passe</h2>
      </div>

      {!isExpanded ? (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-white/60">
            Pour sécuriser votre compte, nous vous recommandons de changer régulièrement votre mot de passe.
          </p>
          <button
            onClick={() => setIsExpanded(true)}
            className="w-full sm:w-auto px-6 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-white font-semibold transition-all"
          >
            Modifier
          </button>
        </div>
      ) : (
        <form onSubmit={handleUpdate} className="space-y-5 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="space-y-4">
            <div className="relative">
              <label className="block text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">
                Ancien mot de passe
              </label>
              <div className="relative">
                <input
                  type={showOldPassword ? "text" : "password"}
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full rounded-xl bg-white/5 border border-white/10 pl-4 pr-12 py-3 text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowOldPassword(!showOldPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60 transition-colors"
                >
                  {showOldPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="relative">
              <label className="block text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">
                Nouveau mot de passe
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min. 8 caractères"
                  required
                  minLength={8}
                  className="w-full rounded-xl bg-white/5 border border-white/10 pl-4 pr-12 py-3 text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60 transition-colors"
                >
                  {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          </div>

          {status === "error" && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm">
              <AlertCircle size={16} className="flex-shrink-0" />
              <p>{errorMessage}</p>
            </div>
          )}

          {status === "success" && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm">
              <CheckCircle2 size={16} className="flex-shrink-0" />
              <p>Mot de passe mis à jour avec succès !</p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="submit"
              disabled={isLoading || !oldPassword || !newPassword}
              className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:shadow-none transition-all flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Mise à jour...
                </>
              ) : (
                "Modifier"
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsExpanded(false);
                setStatus("idle");
                setErrorMessage("");
              }}
              disabled={isLoading}
              className="px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white font-semibold transition-all"
            >
              Annuler
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
