"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Trash2, Loader2, Check, Phone } from "lucide-react";
import { showToast } from "@/components/ui/Toast";

export default function WhatsAppSettings() {
  const [phoneNumber, setPhoneNumber] = useState<string>("");
  const [savedPhoneNumber, setSavedPhoneNumber] = useState<string | null>(null);
  const [isLoadingPhone, setIsLoadingPhone] = useState(false);
  const [isSavingPhone, setIsSavingPhone] = useState(false);
  const [isDeletingPhone, setIsDeletingPhone] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    loadPhoneSettings();
  }, []);

  const loadPhoneSettings = async () => {
    try {
      setIsLoadingPhone(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("phone_number")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        console.error("[WhatsAppSettings] Erreur chargement", error);
        return;
      }

      const phone = data?.phone_number || "";
      setPhoneNumber(phone);
      setSavedPhoneNumber(phone || null);
    } catch (error) {
      console.error("[WhatsAppSettings] Erreur inattendue", error);
    } finally {
      setIsLoadingPhone(false);
    }
  };

  const handleSavePhone = async () => {
    // Validation basique
    if (!phoneNumber.trim()) {
      showToast("Veuillez saisir un numéro", "error");
      return;
    }

    // Nettoyer le numéro (garder seulement les chiffres et le +)
    let cleaned = phoneNumber.replace(/[^0-9+]/g, "");

    // Si ça commence par 0, on assume France (+33)
    if (cleaned.startsWith("0")) {
      cleaned = "+33" + cleaned.slice(1);
    }

    // Vérifier si ça ressemble à un numéro
    if (cleaned.length < 8) {
      showToast("Numéro invalide", "error");
      return;
    }

    try {
      setIsSavingPhone(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("profiles")
        .update({
          phone_number: cleaned,
          whatsapp_enabled: true,
          phone_consent_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (error) {
        showToast("Erreur lors de l'enregistrement", "error");
        return;
      }

      setSavedPhoneNumber(cleaned);
      setPhoneNumber(cleaned);
      setIsEditing(false);
      showToast("Numéro enregistré", "success");

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("profileUpdated"));
      }
    } catch (error) {
      showToast("Erreur inattendue", "error");
    } finally {
      setIsSavingPhone(false);
    }
  };

  const handleDeletePhone = async () => {
    try {
      setIsDeletingPhone(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("profiles")
        .update({
          phone_number: null,
          whatsapp_enabled: false,
          phone_consent_at: null,
        })
        .eq("id", user.id);

      if (error) {
        showToast("Impossible de supprimer le numéro", "error");
        return;
      }

      setPhoneNumber("");
      setSavedPhoneNumber(null);
      showToast("Numéro supprimé", "success");

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("profileUpdated"));
      }
    } catch (error) {
      showToast("Erreur lors de la suppression", "error");
    } finally {
      setIsDeletingPhone(false);
    }
  };

  return (
    <div className="rounded-lg sm:rounded-xl md:rounded-2xl border border-white/30 bg-white/5 p-4 sm:p-5 md:p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="inline-flex items-center justify-center w-10 h-10 text-green-500">
          <svg
            className="w-8 h-8"
            viewBox="0 0 24 24"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
          </svg>
        </div>
        <div className="flex-1">
          <h2 className="text-lg sm:text-xl font-semibold text-white mb-1">
            WhatsApp
          </h2>
          <p className="text-xs sm:text-sm text-white/60">
            {savedPhoneNumber
              ? "Gérez votre numéro pour coordonner vos matchs"
              : "Ajoutez votre numéro pour coordonner vos matchs"}
          </p>
        </div>
      </div>

      <div className="mt-4">
        {isLoadingPhone ? (
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center gap-2 text-white/50 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            Chargement...
          </div>
        ) : !savedPhoneNumber || isEditing ? (
          <div className="space-y-4">
            <div className="relative">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="Votre numéro (ex: 06 12 34 56 78)"
                className="w-full bg-white/5 border border-white/20 rounded-xl pl-11 pr-4 py-3.5 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-green-500/50 transition-all"
              />
            </div>
            <div className="flex gap-2">
              {isEditing && (
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setPhoneNumber(savedPhoneNumber || "");
                  }}
                  className="flex-1 py-3 rounded-xl border border-white/10 text-white/70 font-medium hover:bg-white/5 transition-colors"
                >
                  Annuler
                </button>
              )}
              <button
                onClick={handleSavePhone}
                disabled={isSavingPhone || !phoneNumber.trim()}
                className="flex-[2] bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl shadow-lg shadow-green-600/20 transition-all flex items-center justify-center gap-2"
              >
                {isSavingPhone ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Check className="w-5 h-5" />
                )}
                {isEditing ? "Mettre à jour" : "Ajouter mon numéro"}
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-between group">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                <Phone className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-[10px] text-green-500 font-bold uppercase tracking-wider">
                  Numéro actif
                </p>
                <p className="text-white font-medium">{savedPhoneNumber}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsEditing(true)}
                className="p-2 rounded-lg bg-white/5 border border-white/10 text-white/70 hover:text-white hover:bg-white/10 transition-all"
                title="Modifier"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
              <button
                onClick={handleDeletePhone}
                disabled={isDeletingPhone}
                className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20 transition-all"
                title="Supprimer"
              >
                {isDeletingPhone ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
