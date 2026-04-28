"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/hooks/useUser";

interface ToastData {
  id: string;
  title: string;
  message: string;
  path?: string;
  type: string;
}

/**
 * Vinted-style in-app toast notification.
 * Slides down from top, shows briefly, auto-hides.
 * Listens for new coach_message notifications in real-time.
 */
export default function InAppToast() {
  const { user } = useUser();
  const router = useRouter();
  const [toast, setToast] = useState<ToastData | null>(null);
  const [visible, setVisible] = useState(false);
  const supabase = createClient();

  const showToast = useCallback((data: ToastData) => {
    setToast(data);
    setVisible(true);

    // Auto-hide after 5 seconds
    setTimeout(() => {
      setVisible(false);
      setTimeout(() => setToast(null), 300); // Wait for exit animation
    }, 5000);
  }, []);

  const dismiss = useCallback(() => {
    setVisible(false);
    setTimeout(() => setToast(null), 300);
  }, []);

  const handleClick = useCallback(() => {
    if (toast?.path) {
      router.push(toast.path);
    }
    dismiss();
  }, [toast, router, dismiss]);

  // Listen for new notifications in real-time
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`inapp-toast-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload: any) => {
          const notif = payload.new;
          if (!notif) return;

          // Only show toast for coach messages
          const type = notif.type;
          if (type === "coach_message" || type === "coach_debrief") {
            const data = typeof notif.data === "string" ? JSON.parse(notif.data) : notif.data;
            showToast({
              id: notif.id,
              title: notif.title || "Message du coach",
              message: notif.message || "",
              path: data?.path || "/coach",
              type,
            });
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user?.id, supabase, showToast]);

  if (!toast) return null;

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-[99998] px-4 transition-all duration-300 ease-out ${
        visible ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"
      }`}
      style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 8px)" }}
    >
      <button
        onClick={handleClick}
        className="w-full max-w-lg mx-auto flex items-center gap-3 p-3 rounded-2xl bg-[#1a1a2e]/95 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/40 active:scale-[0.98] transition-transform"
      >
        {/* Icon */}
        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-blue-400" />
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0 text-left">
          <p className="text-sm font-semibold text-white truncate">{toast.title}</p>
          <p className="text-xs text-white/50 truncate">{toast.message}</p>
        </div>

        {/* Dismiss */}
        <div className="flex-shrink-0 p-1" onClick={(e) => { e.stopPropagation(); dismiss(); }}>
          <X size={14} className="text-white/30" />
        </div>
      </button>
    </div>
  );
}
