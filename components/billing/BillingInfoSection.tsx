"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import EditBillingAddress from "./EditBillingAddress";
import EditVatNumber from "./EditVatNumber";
import EditBillingEmail from "./EditBillingEmail";

interface BillingAddress {
  street?: string;
  postal?: string;
  city?: string;
  country?: string;
}

interface BillingInfoSectionProps {
  legalName: string;
  billingAddress: BillingAddress | null | string;
  vatNumber: string | null;
  billingEmail: string;
  adminContact: string;
  paymentMethod: {
    type: string;
    last4: string;
    brand: string;
    expiry: string;
  } | null;
  hasInvoicePreference?: boolean;
  onInvoicePreferenceChange?: (enabled: boolean) => void;
}

export default function BillingInfoSection({
  legalName,
  billingAddress,
  vatNumber,
  billingEmail,
  adminContact,
  paymentMethod,
  hasInvoicePreference = true,
  onInvoicePreferenceChange,
}: BillingInfoSectionProps) {
  const router = useRouter();
  const [showEditAddress, setShowEditAddress] = useState(false);
  const [showEditVat, setShowEditVat] = useState(false);
  const [showEditEmail, setShowEditEmail] = useState(false);
  const [loading, setLoading] = useState(false);
  const [invoicePreference, setInvoicePreference] = useState(hasInvoicePreference);

  const formatAddress = (address: BillingAddress | null | string): string => {
    if (!address) return "—";
    
    // Si c'est une chaîne, la retourner telle quelle
    if (typeof address === "string") {
      return address || "—";
    }
    
    // Si c'est un objet, formater les parties
    const parts = [
      address.street,
      address.postal && address.city ? `${address.postal} ${address.city}` : address.city || address.postal,
      address.country,
    ].filter(Boolean);
    return parts.join(", ") || "—";
  };

  const handleUpdateBilling = async (data: {
    billingEmail?: string;
    billingAddress?: BillingAddress | null;
    vatNumber?: string;
  }) => {
    setLoading(true);
    try {
      const response = await fetch("/api/billing/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Erreur lors de la mise à jour");
      }

      router.refresh();
    } catch (error: any) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const handleManagePaymentMethod = async () => {
    try {
      const response = await fetch("/api/stripe/customer-portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await response.json();
      if (response.ok && data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || "Erreur lors de l'ouverture du portail de gestion");
      }
    } catch (error: any) {
      alert(error.message || "Erreur lors de l'ouverture du portail de gestion");
    }
  };

  const handleInvoicePreferenceChange = (enabled: boolean) => {
    setInvoicePreference(enabled);
    // Sauvegarder dans localStorage ou via API
    if (typeof window !== "undefined") {
      localStorage.setItem("invoice_email_preference", JSON.stringify(enabled));
    }
    onInvoicePreferenceChange?.(enabled);
  };

  useEffect(() => {
    // Charger la préférence depuis localStorage
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("invoice_email_preference");
      if (saved !== null) {
        try {
          setInvoicePreference(JSON.parse(saved));
        } catch (e) {
          // Ignorer les erreurs de parsing
        }
      }
    }
  }, []);

  return (
    <>
      {/* Dénomination légale */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="text-xs text-white/60 mb-1">Dénomination légale</div>
        <div className="text-sm text-white">{legalName || "—"}</div>
        <p className="text-xs text-white/50 mt-2">
          Cette information provient de votre profil club et ne peut pas être modifiée ici.
        </p>
      </div>

      {/* Adresse de facturation */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <div className="text-xs text-white/60 mb-1">Adresse de facturation</div>
            <div className="text-sm text-white">{formatAddress(billingAddress)}</div>
          </div>
        </div>
        <button
          onClick={() => setShowEditAddress(true)}
          className="mt-2 text-xs text-blue-400 hover:text-blue-300 underline transition-colors"
          disabled={loading}
        >
          {billingAddress ? "Modifier" : "Ajouter une adresse"}
        </button>
      </div>

      {/* TVA */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <div className="text-xs text-white/60 mb-1">TVA (optionnel)</div>
            <div className="text-sm text-white">{vatNumber || "—"}</div>
          </div>
        </div>
        <button
          onClick={() => setShowEditVat(true)}
          className="mt-2 text-xs text-blue-400 hover:text-blue-300 underline transition-colors"
          disabled={loading}
        >
          {vatNumber ? "Modifier" : "Ajouter"}
        </button>
      </div>

      {/* Email de facturation */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <div className="text-xs text-white/60 mb-1">Email de facturation</div>
            <div className="text-sm text-white">{billingEmail || "—"}</div>
          </div>
        </div>
        <button
          onClick={() => setShowEditEmail(true)}
          className="mt-2 text-xs text-blue-400 hover:text-blue-300 underline transition-colors"
          disabled={loading}
        >
          Modifier
        </button>
      </div>

      {/* Contact administratif */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="text-xs text-white/60 mb-1">Contact administratif</div>
        <div className="text-sm text-white">{adminContact || "—"}</div>
        <p className="text-xs text-white/50 mt-2">
          Email du compte administrateur connecté
        </p>
      </div>

      {/* Moyen de paiement */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="text-xs text-white/60 mb-1">Moyen de paiement</div>
        {paymentMethod ? (
          <div className="space-y-2">
            <div className="text-sm text-white">
              {paymentMethod.type} — •••• {paymentMethod.last4} — {paymentMethod.expiry}
            </div>
            <button
              onClick={handleManagePaymentMethod}
              className="text-xs text-blue-400 hover:text-blue-300 underline transition-colors"
            >
              Gérer via le portail Stripe
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="text-sm text-white/60">Aucun moyen de paiement enregistré</div>
            <button
              onClick={handleManagePaymentMethod}
              className="text-xs text-blue-400 hover:text-blue-300 underline transition-colors"
            >
              Ajouter un moyen de paiement
            </button>
          </div>
        )}
      </div>

      {/* Préférences */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="text-xs text-white/60 mb-3">Préférences</div>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-white">Factures PDF par email</div>
              <div className="text-xs text-white/60">Recevoir automatiquement vos factures par email</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={invoicePreference}
                onChange={(e) => handleInvoicePreferenceChange(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-white/10 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500/40 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showEditAddress && (
        <EditBillingAddress
          currentAddress={typeof billingAddress === "string" ? null : billingAddress}
          onSave={async (address) => {
            await handleUpdateBilling({ billingAddress: address });
          }}
          onClose={() => setShowEditAddress(false)}
        />
      )}

      {showEditVat && (
        <EditVatNumber
          currentVatNumber={vatNumber}
          onSave={async (vat) => {
            await handleUpdateBilling({ vatNumber: vat });
          }}
          onClose={() => setShowEditVat(false)}
        />
      )}

      {showEditEmail && (
        <EditBillingEmail
          currentEmail={billingEmail}
          onSave={async (email) => {
            await handleUpdateBilling({ billingEmail: email });
          }}
          onClose={() => setShowEditEmail(false)}
        />
      )}
    </>
  );
}

