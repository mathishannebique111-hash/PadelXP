/**
 * Constantes typographiques pour uniformiser toutes les pages du compte joueur
 * 
 * Basées sur les styles globaux définis dans app/globals.css
 */

export const TYPOGRAPHY = {
  // Titres principaux de page (h1)
  h1: "text-3xl font-bold text-white",
  
  // Sous-titres (h2)
  h2: "text-2xl font-semibold text-white",
  
  // Titres de section (h3)
  h3: "text-xl font-semibold text-white",
  
  // Paragraphes principaux
  p: "text-sm text-white/70 font-normal",
  
  // Paragraphes secondaires / petits textes
  pSmall: "text-xs text-white/60 font-normal",
  
  // Labels pour les statistiques
  label: "text-xs font-normal",
  
  // Nombres / statistiques
  number: "text-2xl font-bold tabular-nums",
  
  // Texte de description
  description: "text-sm text-white/70 font-normal",
  
  // Messages d'erreur / info
  message: "text-sm text-white/70 font-normal",
} as const;


