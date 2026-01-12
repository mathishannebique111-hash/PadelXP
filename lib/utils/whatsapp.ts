/**
 * Ouvre WhatsApp avec un numéro de téléphone
 * Si WhatsApp n'est pas installé, redirige vers App Store (iOS) ou Play Store (Android)
 */
export function openWhatsApp(phoneNumber: string, message?: string): void {
  if (typeof window === "undefined") return;
  
  // Nettoyer le numéro (garder uniquement les chiffres)
  const cleanPhone = phoneNumber.replace(/[^0-9]/g, "");
  
  if (!cleanPhone) {
    console.error("[openWhatsApp] Numéro invalide");
    return;
  }

  // Construire l'URL WhatsApp web
  const messageParam = message ? `?text=${encodeURIComponent(message)}` : "";
  const whatsappUrl = `https://wa.me/${cleanPhone}${messageParam}`;

  // Détecter la plateforme
  const userAgent = navigator.userAgent || navigator.platform || "";
  const isIOS = /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream;
  const isAndroid = /Android/.test(userAgent);

  if (isIOS) {
    // Sur iOS, essayer d'abord le schéma natif WhatsApp
    const iosWhatsAppUrl = `whatsapp://send?phone=${cleanPhone}${message ? `&text=${encodeURIComponent(message)}` : ""}`;
    
    // Utiliser window.location pour forcer la navigation
    // Si WhatsApp n'est pas installé, Safari affichera une erreur et on pourra rediriger
    window.location.href = iosWhatsAppUrl;
    
    // Fallback vers App Store après un délai (si WhatsApp n'est pas installé)
    setTimeout(() => {
      // Si on est toujours sur la page, WhatsApp n'est probablement pas installé
      window.location.href = "https://apps.apple.com/app/whatsapp-messenger/id310633997";
    }, 1000);
  } else if (isAndroid) {
    // Sur Android, utiliser wa.me qui redirige automatiquement
    // Si WhatsApp n'est pas installé, le navigateur peut rediriger vers Play Store
    // Utiliser window.location.href pour forcer la navigation
    window.location.href = whatsappUrl;
    
    // Fallback vers Play Store après un délai
    setTimeout(() => {
      window.location.href = "https://play.google.com/store/apps/details?id=com.whatsapp";
    }, 2000);
  } else {
    // Sur desktop/web, ouvrir dans un nouvel onglet
    // Si window.open() est bloqué, essayer window.location.href
    const newWindow = window.open(whatsappUrl, "_blank", "noopener,noreferrer");
    
    // Si window.open() a été bloqué (popup blocker), utiliser window.location.href
    if (!newWindow || newWindow.closed || typeof newWindow.closed === "undefined") {
      window.location.href = whatsappUrl;
    }
  }
}
