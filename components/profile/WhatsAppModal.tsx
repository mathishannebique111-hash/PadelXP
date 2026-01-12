"use client";

import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X } from "lucide-react";
import { openWhatsApp } from "@/lib/utils/whatsapp";

interface WhatsAppModalProps {
  isOpen: boolean;
  playerName: string;
  phoneNumber: string;
  onClose: () => void;
  onOpenWhatsApp: () => void;
}

export default function WhatsAppModal({
  isOpen,
  playerName,
  phoneNumber,
  onClose,
  onOpenWhatsApp,
}: WhatsAppModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative z-10 w-full max-w-md bg-slate-800 rounded-2xl border border-white/20 shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <h3 className="text-lg font-bold text-white">Invitation acceptée</h3>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/20 mb-4">
                <MessageCircle className="w-8 h-8 text-emerald-400" />
              </div>
              <p className="text-base text-white/90 mb-2">
                Vous pouvez maintenant discuter sur WhatsApp avec
              </p>
              <p className="text-lg font-semibold text-white">{playerName}</p>
            </div>

            {/* WhatsApp Button */}
            <button
              type="button"
              onClick={() => {
                openWhatsApp(phoneNumber, "Salut ! C'est parti pour notre match de padel 🎾");
                onClose();
              }}
              className="w-full inline-flex items-center justify-center gap-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 px-6 py-4 text-base font-semibold text-white transition-colors shadow-lg"
            >
              <MessageCircle className="w-5 h-5" />
              <span>Ouvrir WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-full mt-3 text-sm text-white/60 hover:text-white/80 transition-colors"
            >
              Plus tard
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
