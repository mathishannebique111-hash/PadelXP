"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, AlertCircle, X } from "lucide-react";

export type ToastType = "success" | "error" | "info";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastProps {
  toast: Toast;
  onClose: (id: string) => void;
}

function ToastItem({ toast, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(toast.id);
    }, 4000);

    return () => clearTimeout(timer);
  }, [toast.id, onClose]);

  const icons = {
    success: CheckCircle2,
    error: XCircle,
    info: AlertCircle,
  };

  const colors = {
    success: "bg-emerald-500/90 border-emerald-400/50",
    error: "bg-red-500/90 border-red-400/50",
    info: "bg-blue-500/90 border-blue-400/50",
  };

  const Icon = icons[toast.type];
  const colorClass = colors[toast.type];

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={`relative flex items-center gap-3 rounded-xl ${colorClass} border px-4 py-3.5 shadow-lg backdrop-blur-sm min-w-[280px] max-w-[calc(100vw-2rem)]`}
    >
      <Icon className="w-5 h-5 text-white flex-shrink-0" />
      <p className="flex-1 text-sm font-medium text-white pr-6">
        {toast.message}
      </p>
      <button
        type="button"
        onClick={() => onClose(toast.id)}
        className="absolute top-2 right-2 p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/20 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  );
}

let toastIdCounter = 0;
const toastListeners = new Set<(toast: Toast) => void>();

export function showToast(message: string, type: ToastType = "info") {
  const id = `toast-${++toastIdCounter}`;
  const toast: Toast = { id, message, type };
  toastListeners.forEach((listener) => listener(toast));
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const listener = (toast: Toast) => {
      setToasts((prev) => [...prev, toast]);
    };
    toastListeners.add(listener);
    return () => {
      toastListeners.delete(listener);
    };
  }, []);

  const handleClose = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[100] pointer-events-none">
      <div className="flex flex-col gap-2 items-center">
        <AnimatePresence mode="popLayout">
          {toasts.map((toast) => (
            <div key={toast.id} className="pointer-events-auto">
              <ToastItem toast={toast} onClose={handleClose} />
            </div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
