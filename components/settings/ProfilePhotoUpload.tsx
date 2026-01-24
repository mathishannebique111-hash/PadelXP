"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Camera, Loader2, Check, Trash2 } from "lucide-react";
import ProfilePhotoCrop from "@/components/auth/ProfilePhotoCrop";

export default function ProfilePhotoUpload() {
  const pathname = usePathname();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageKeyRef = useRef(0); // Référence pour forcer le rechargement de l'image

  // Effet pour faire disparaître le message de succès après 5 secondes
  useEffect(() => {
    if (uploadSuccess) {
      const timer = setTimeout(() => {
        setUploadSuccess(false);
      }, 5000); // 5 secondes

      return () => clearTimeout(timer);
    }
  }, [uploadSuccess]);

  // Effet pour faire disparaître le message de suppression après 5 secondes
  useEffect(() => {
    if (deleteSuccess) {
      const timer = setTimeout(() => {
        setDeleteSuccess(false);
      }, 5000); // 5 secondes

      return () => clearTimeout(timer);
    }
  }, [deleteSuccess]);

  // SOLUTION COMPLÈTE : Charger la photo de profil à chaque montage et à chaque retour sur la page
  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        const supabase = createClient();
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
          console.warn("[ProfilePhotoUpload] Pas d'utilisateur connecté:", userError?.message || "Aucun utilisateur");
          setAvatarUrl(null);
          return;
        }

        console.log("[ProfilePhotoUpload] Chargement du profil pour l'utilisateur:", user.id.substring(0, 8));

        // Récupérer l'URL de la photo depuis la base de données
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("avatar_url")
          .eq("id", user.id)
          .maybeSingle();

        // Gérer les erreurs de manière plus détaillée
        if (profileError) {
          // Vérifier si c'est une erreur "not found" (profil n'existe pas encore) ou une vraie erreur
          if (profileError.code === "PGRST116" || profileError.message?.includes("No rows")) {
            // Le profil n'existe pas encore, c'est normal pour un nouvel utilisateur
            console.log("[ProfilePhotoUpload] Profil n'existe pas encore, c'est normal");
            setAvatarUrl(null);
            return;
          }

          // C'est une vraie erreur (RLS, permissions, etc.)
          console.error("[ProfilePhotoUpload] Erreur lors de la récupération du profil:", {
            code: profileError.code,
            message: profileError.message,
            details: profileError.details,
            hint: profileError.hint
          });
          setAvatarUrl(null);
          return;
        }

        // Si une photo existe, l'afficher
        if (profile?.avatar_url) {
          const url = profile.avatar_url.trim();
          if (url && url.length > 0) {
            console.log("[ProfilePhotoUpload] Photo trouvée, mise à jour de l'URL:", url.substring(0, 60) + "...");
            setAvatarUrl(url);
            // Incrémenter la clé pour forcer le rechargement de l'image
            imageKeyRef.current += 1;
          } else {
            console.log("[ProfilePhotoUpload] URL de photo vide");
            setAvatarUrl(null);
          }
        } else {
          console.log("[ProfilePhotoUpload] Pas de photo dans le profil");
          setAvatarUrl(null);
        }
      } catch (err: any) {
        // Gérer les erreurs inattendues
        console.error("[ProfilePhotoUpload] Erreur inattendue lors du chargement du profil:", {
          message: err?.message,
          stack: err?.stack,
          error: err
        });
        setAvatarUrl(null);
      }
    };

    // Charger immédiatement au montage
    loadUserProfile();

    // Recharger aussi quand on arrive sur la page settings (au cas où le composant serait mis en cache)
    if (pathname === "/settings") {
      // Petit délai pour s'assurer que le composant est bien monté
      const timer = setTimeout(() => {
        loadUserProfile();
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [pathname]); // Recharger quand le pathname change (navigation)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    // Si aucun fichier n'est sélectionné, cela peut être dû à :
    // 1. L'utilisateur a annulé la sélection
    // 2. Les permissions ont été refusées (iOS/Android)
    // 3. L'utilisateur a cliqué sur le bouton annuler
    if (!file) {
      // Ne pas afficher de message d'erreur si l'utilisateur a simplement annulé
      // Mais réinitialiser l'input pour permettre une nouvelle sélection
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    // Vérifier le type de fichier
    if (!file.type.startsWith("image/")) {
      setError("Veuillez sélectionner une image (JPG, PNG ou WebP)");
      return;
    }

    // Vérifier la taille (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("L'image est trop grande (max 5MB). Veuillez choisir une image plus petite.");
      return;
    }

    setError(null);
    setUploadSuccess(false);

    // Afficher le modal de recadrage avec gestion d'erreur
    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        try {
          const imageSrc = reader.result as string;
          if (!imageSrc || imageSrc.length === 0) {
            setError("Impossible de lire l'image. Veuillez réessayer.");
            return;
          }
          setImageToCrop(imageSrc);
          setShowCropModal(true);
        } catch (e) {
          console.error("[ProfilePhotoUpload] Error processing image result:", e);
          setError("Erreur lors du traitement de l'image. Veuillez réessayer.");
        }
      };
      reader.onerror = () => {
        console.error("[ProfilePhotoUpload] FileReader error");
        setError("Impossible de lire le fichier. Vérifiez que l'application a accès à vos photos dans les Réglages.");
      };
      reader.readAsDataURL(file);
    } catch (e) {
      console.error("[ProfilePhotoUpload] Error reading file:", e);
      setError("Erreur lors de la lecture du fichier. Veuillez réessayer.");
    }
  };

  const handleCropComplete = async (croppedImageBlob: Blob) => {
    setIsUploading(true);
    setError(null);
    setUploadSuccess(false);
    setShowCropModal(false);
    setImageToCrop(null);

    try {
      // Convertir le Blob en base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Data = reader.result as string;
        const base64Content = base64Data.split(",")[1]; // Enlever le préfixe data:image/...

        // Envoyer à l'API
        const response = await fetch("/api/player/profile-photo", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            photo_payload: {
              data: base64Content,
              filename: "profile-photo.png",
              mime: "image/png",
            },
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Erreur lors de l'upload");
        }

        // Mettre à jour l'URL de l'avatar immédiatement
        // L'URL retournée par l'API est déjà l'URL publique complète stockée dans la DB
        if (data.photo_url) {
          const photoUrl = data.photo_url.trim();
          if (photoUrl && photoUrl.length > 0) {
            // Utiliser l'URL directement (sans timestamp) car elle est déjà persistée dans la DB
            setAvatarUrl(photoUrl);
            imageKeyRef.current += 1; // Forcer le rechargement de l'image
            console.log("[ProfilePhotoUpload] Photo uploadée avec succès, URL mise à jour");
          }
        }

        setUploadSuccess(true);
        setIsUploading(false);

        // Ne pas recharger la page automatiquement - laisser l'utilisateur voir sa photo en permanence
      };

      reader.onerror = () => {
        setError("Erreur lors de la lecture du fichier");
        setIsUploading(false);
      };

      reader.readAsDataURL(croppedImageBlob);
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'upload");
      setIsUploading(false);
    }
  };

  const handleCropCancel = () => {
    setShowCropModal(false);
    setImageToCrop(null);
    // Réinitialiser l'input file
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleDeleteClick = () => {
    if (!avatarUrl) return;
    setShowDeleteConfirm(true);
    setError(null);
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false);
  };

  const handleDeleteConfirm = async () => {
    if (!avatarUrl) return;

    setIsDeleting(true);
    setError(null);
    setDeleteSuccess(false);
    setShowDeleteConfirm(false);

    try {
      const response = await fetch("/api/player/profile-photo", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erreur lors de la suppression");
      }

      setAvatarUrl(null);
      setDeleteSuccess(true);
      setIsDeleting(false);

      // Ne pas recharger automatiquement - la photo est déjà supprimée visuellement
    } catch (err: any) {
      setError(err.message || "Erreur lors de la suppression");
      setIsDeleting(false);
    }
  };

  return (
    <div className="rounded-lg sm:rounded-xl md:rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5 md:p-6">
      <h2 className="text-lg sm:text-xl font-semibold text-white mb-4 sm:mb-6">
        Photo de profil
      </h2>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
        {/* Aperçu de la photo */}
        <div className="relative">
          <div className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden border-2 border-white/20 bg-white/5">
            {avatarUrl ? (
              // Utiliser une balise img native pour éviter les problèmes de cache de Next.js Image
              <img
                key={`avatar-${imageKeyRef.current}`} // Clé unique pour forcer le rechargement
                src={avatarUrl}
                alt="Photo de profil"
                className="w-full h-full object-cover"
                loading="eager" // Charger immédiatement sans lazy loading
                onError={async (e) => {
                  // En cas d'erreur de chargement, réessayer de charger depuis la DB
                  console.error("[ProfilePhotoUpload] Erreur de chargement de l'image, rechargement depuis la DB...");
                  try {
                    const supabase = createClient();
                    const { data: { user } } = await supabase.auth.getUser();
                    if (user) {
                      const { data: profile } = await supabase
                        .from("profiles")
                        .select("avatar_url")
                        .eq("id", user.id)
                        .maybeSingle();

                      if (profile?.avatar_url) {
                        const url = profile.avatar_url.trim();
                        if (url && url.length > 0) {
                          // Recharger avec l'URL de la DB
                          setAvatarUrl(url);
                          imageKeyRef.current += 1;
                          console.log("[ProfilePhotoUpload] Photo rechargée depuis la DB après erreur");
                        } else {
                          setAvatarUrl(null);
                        }
                      } else {
                        // Pas de photo dans la DB, réinitialiser
                        console.warn("[ProfilePhotoUpload] Pas de photo trouvée dans la DB");
                        setAvatarUrl(null);
                      }
                    }
                  } catch (err) {
                    console.error("[ProfilePhotoUpload] Erreur lors du rechargement de la photo:", err);
                  }
                }}
                onLoad={() => {
                  // Image chargée avec succès
                  console.log("[ProfilePhotoUpload] Photo chargée avec succès");
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500/20 to-purple-500/20">
                <Camera className="w-8 h-8 sm:w-10 sm:h-10 text-white/40" />
              </div>
            )}
          </div>
          {isUploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
              <Loader2 className="w-6 h-6 text-white animate-spin" />
            </div>
          )}
          {uploadSuccess && (
            <div className="absolute -top-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center">
              <Check className="w-4 h-4 text-white" />
            </div>
          )}
        </div>

        {/* Bouton et informations */}
        <div className="flex-1 space-y-3">
          <div>
            <p className="text-sm text-white/70 mb-2">
              {avatarUrl
                ? "Changez votre photo de profil en cliquant sur le bouton ci-dessous."
                : "Ajoutez une photo de profil pour personnaliser votre compte."}
            </p>
            <p className="text-xs text-white/50">
              Formats acceptés : JPG, PNG, WebP (max 5MB)
            </p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            onChange={handleFileSelect}
            className="hidden"
            disabled={isUploading}
          />

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleClick}
              disabled={isUploading || isDeleting}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Upload en cours...</span>
                </>
              ) : (
                <>
                  <Camera className="w-4 h-4" />
                  <span>{avatarUrl ? "Modifier la photo" : "Ajouter une photo"}</span>
                </>
              )}
            </button>

            {avatarUrl && !showDeleteConfirm && (
              <button
                onClick={handleDeleteClick}
                disabled={isUploading || isDeleting}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 className="w-4 h-4" />
                <span>Supprimer la photo</span>
              </button>
            )}

            {showDeleteConfirm && (
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                <div className="flex-1">
                  <p className="text-sm text-white/90 mb-2 font-medium">
                    Êtes-vous sûr de vouloir supprimer votre photo de profil ?
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleDeleteCancel}
                    disabled={isDeleting}
                    className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-white/20"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleDeleteConfirm}
                    disabled={isDeleting}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isDeleting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Suppression...</span>
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" />
                        <span>Confirmer</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          {uploadSuccess && (
            <div className="text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
              Photo mise à jour avec succès !
            </div>
          )}

          {deleteSuccess && (
            <div className="text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
              Photo supprimée avec succès !
            </div>
          )}
        </div>
      </div>

      {/* Modal de recadrage */}
      {showCropModal && imageToCrop && (
        <ProfilePhotoCrop
          imageSrc={imageToCrop}
          onCropComplete={handleCropComplete}
          onCancel={handleCropCancel}
        />
      )}
    </div>
  );
}

