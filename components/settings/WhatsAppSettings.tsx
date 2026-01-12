"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Trash2, Loader2 } from "lucide-react";
import { showToast } from "@/components/ui/Toast";

export default function WhatsAppSettings() {
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  const [isLoadingPhone, setIsLoadingPhone] = useState(false);
  const [isDeletingPhone, setIsDeletingPhone] = useState(false);
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

      setPhoneNumber(data?.phone_number || null);
    } catch (error) {
      console.error("[WhatsAppSettings] Erreur inattendue", error);
    } finally {
      setIsLoadingPhone(false);
    }
  };

  const formatWhatsappNumber = (raw: string | null): string => {
    if (!raw) return "Non renseigné";
    // Format français : +33 6 XX XX XX XX
    if (raw.startsWith("+33")) {
      const digits = raw.replace(/[^0-9]/g, "").slice(2); // Enlever +33
      if (digits.length === 9) {
        return `+33 ${digits.slice(0, 1)} ${digits.slice(1, 3)} ${digits.slice(3, 5)} ${digits.slice(5, 7)} ${digits.slice(7, 9)}`;
      }
    }
    // Format générique : masquer les chiffres sauf les 2 derniers
    const digits = raw.replace(/[^0-9]/g, "");
    if (digits.length >= 2) {
      const masked = "•".repeat(Math.max(0, digits.length - 2)) + digits.slice(-2);
      return `+${raw.replace(/[^0-9+]/g, "").replace(/^\+/, "").slice(0, -digits.length)}${masked}`;
    }
    return raw;
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
        console.error("[WhatsAppSettings] Erreur suppression", error);
        showToast("Impossible de supprimer le numéro", "error");
        return;
      }

      setPhoneNumber(null);
      showToast("Numéro supprimé", "success");

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("profileUpdated"));
      }
    } catch (error) {
      console.error("[WhatsAppSettings] Erreur inattendue", error);
      showToast("Erreur lors de la suppression", "error");
    } finally {
      setIsDeletingPhone(false);
    }
  };

  return (
    <div className="rounded-lg sm:rounded-xl md:rounded-2xl border border-white/30 bg-white/5 p-4 sm:p-5 md:p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="inline-flex items-center justify-center w-10 h-10">
          <svg
            className="w-6 h-6"
            viewBox="0 0 24 24"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
          </svg>
        </div>
        <div className="flex-1">
          <h2 className="text-lg sm:text-xl font-semibold text-white mb-1">
            Coordination WhatsApp
          </h2>
          <p className="text-xs sm:text-sm text-white/60">
            Gérez votre numéro de téléphone pour coordonner vos matchs
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-4">
        <div className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50 border border-white/10">
          <div>
            <p className="text-xs text-white/50 uppercase tracking-wider font-medium mb-1.5">
              Numéro WhatsApp
            </p>
            <p className="text-sm text-white/80">
              <span className="font-semibold">
                {isLoadingPhone ? "Chargement..." : formatWhatsappNumber(phoneNumber)}
              </span>
            </p>
          </div>
          {phoneNumber && !isLoadingPhone && (
            <button
              type="button"
              onClick={handleDeletePhone}
              disabled={isDeletingPhone}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-[11px] font-medium text-red-200 hover:bg-red-500/20 disabled:opacity-60 transition-colors"
            >
              {isDeletingPhone ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Trash2 className="w-3.5 h-3.5" />
              )}
              <span>Supprimer</span>
            </button>
          )}
        </div>
        {!phoneNumber && !isLoadingPhone && (
          <p className="text-xs text-slate-300/80">
            Vous pouvez activer votre numéro lors de l&apos;envoi d&apos;une invitation à jouer.
          </p>
        )}
      </div>
    </div>
  );
}
