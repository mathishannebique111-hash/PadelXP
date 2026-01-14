"use client";

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
import { logger } from "@/lib/logger";

export type PopupType = "badge" | "level_up";

export interface BadgePopupData {
  type: "badge";
  icon: string;
  title: string;
  description: string;
  badgeId: string;
}

export interface LevelUpPopupData {
  type: "level_up";
  tier: string;
  previousTier?: string;
}

export type PopupData = BadgePopupData | LevelUpPopupData;

interface PopupQueueContextType {
  enqueuePopup: (popup: PopupData) => void;
  currentPopup: PopupData | null;
  isShowing: boolean;
  closeCurrentPopup: () => void;
}

const PopupQueueContext = createContext<PopupQueueContextType | undefined>(undefined);

const STORAGE_KEY_PREFIX = "padelleague.popup.shown.";

/**
 * Vérifie si un popup a déjà été affiché
 */
function hasBeenShown(popup: PopupData): boolean {
  if (typeof window === "undefined") return false;

  try {
    let key: string;
    let value: string;

    if (popup.type === "badge") {
      key = `${STORAGE_KEY_PREFIX}badge.${popup.badgeId}`;
      value = `${popup.icon}|${popup.title}`;
    } else {
      key = `${STORAGE_KEY_PREFIX}level.${popup.tier}`;
      value = popup.tier;
    }

    const stored = localStorage.getItem(key);
    return stored === value;
  } catch (error) {
    logger.error("Error checking if popup has been shown", { error });
    return false;
  }
}

/**
 * Marque un popup comme affiché
 */
function markAsShown(popup: PopupData): void {
  if (typeof window === "undefined") return;

  try {
    let key: string;
    let value: string;

    if (popup.type === "badge") {
      key = `${STORAGE_KEY_PREFIX}badge.${popup.badgeId}`;
      value = `${popup.icon}|${popup.title}`;
    } else {
      key = `${STORAGE_KEY_PREFIX}level.${popup.tier}`;
      value = popup.tier;
    }

    localStorage.setItem(key, value);
  } catch (error) {
    logger.error("Error marking popup as shown", { error });
  }
}

export function PopupQueueProvider({ children }: { children: React.ReactNode }) {
  const [queue, setQueue] = useState<PopupData[]>([]);
  const [currentPopup, setCurrentPopup] = useState<PopupData | null>(null);
  const [isShowing, setIsShowing] = useState(false);
  const processingRef = useRef(false);

  /**
   * Traite la file d'attente séquentiellement
   */
  const processQueue = useCallback(() => {
    if (processingRef.current || isShowing) return;

    if (queue.length === 0) {
      setCurrentPopup(null);
      return;
    }

    const nextPopup = queue[0];

    // Vérifier si ce popup a déjà été affiché
    if (hasBeenShown(nextPopup)) {
      logger.info("Popup déjà affiché, ignoré", { popup: nextPopup });
      setQueue((prev) => prev.slice(1));
      setTimeout(() => processQueue(), 0);
      return;
    }

    // Afficher le popup
    processingRef.current = true;
    setIsShowing(true);
    setCurrentPopup(nextPopup);
    markAsShown(nextPopup);

    // Retirer de la file
    setQueue((prev) => prev.slice(1));
  }, [queue, isShowing]);

  // Traiter la file quand elle change
  useEffect(() => {
    if (!isShowing && queue.length > 0) {
      processQueue();
    }
  }, [queue, isShowing, processQueue]);

  /**
   * Ajoute un popup à la file d'attente
   */
  const enqueuePopup = useCallback((popup: PopupData) => {
    // Vérifier immédiatement si déjà affiché
    if (hasBeenShown(popup)) {
      logger.info("Popup déjà affiché, ignoré lors de l'ajout", { popup });
      return;
    }

    // Vérifier si déjà dans la file
    setQueue((prev) => {
      const isDuplicate = prev.some((p) => {
        if (p.type === "badge" && popup.type === "badge") {
          return p.badgeId === popup.badgeId;
        }
        if (p.type === "level_up" && popup.type === "level_up") {
          return p.tier === popup.tier;
        }
        return false;
      });

      if (isDuplicate) {
        logger.info("Popup déjà dans la file, ignoré", { popup });
        return prev;
      }

      return [...prev, popup];
    });
  }, []);

  /**
   * Ferme le popup actuel et passe au suivant
   */
  const closeCurrentPopup = useCallback(() => {
    setIsShowing(false);
    processingRef.current = false;
    setCurrentPopup(null);
    setTimeout(() => {
      processQueue();
    }, 300);
  }, [processQueue]);

  return (
    <PopupQueueContext.Provider
      value={{
        enqueuePopup,
        currentPopup,
        isShowing,
        closeCurrentPopup,
      }}
    >
      {children}
    </PopupQueueContext.Provider>
  );
}

export function usePopupQueue() {
  const context = useContext(PopupQueueContext);
  if (context === undefined) {
    throw new Error("usePopupQueue must be used within a PopupQueueProvider");
  }
  return context;
}
