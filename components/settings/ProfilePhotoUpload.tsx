"use client";

import { useState, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";
import { Camera, Loader2, Check, Trash2 } from "lucide-react";

export default function ProfilePhotoUpload() {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Charger la photo de profil actuelle
    const loadProfile = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("avatar_url")
          .eq("id", user.id)
          .maybeSingle();
        
        if (profile?.avatar_url) {
          setAvatarUrl(profile.avatar_url);
        }
      }
    };

    loadProfile();
  }, []);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Vérifier le type de fichier
    if (!file.type.startsWith("image/")) {
      setError("Veuillez sélectionner une image");
      return;
    }

    // Vérifier la taille (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("L'image est trop grande (max 5MB)");
      return;
    }

    setIsUploading(true);
    setError(null);
    setUploadSuccess(false);

    try {
      // Convertir l'image en base64
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
              filename: file.name,
              mime: file.type,
            },
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Erreur lors de l'upload");
        }

        // Mettre à jour l'URL de l'avatar
        if (data.photo_url) {
          setAvatarUrl(data.photo_url);
        }

        setUploadSuccess(true);
        setIsUploading(false);

        // Recharger la page après 1 seconde pour mettre à jour partout
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      };

      reader.onerror = () => {
        setError("Erreur lors de la lecture du fichier");
        setIsUploading(false);
      };

      reader.readAsDataURL(file);
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'upload");
      setIsUploading(false);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleDelete = async () => {
    if (!avatarUrl) return;

    if (!confirm("Êtes-vous sûr de vouloir supprimer votre photo de profil ?")) {
      return;
    }

    setIsDeleting(true);
    setError(null);
    setDeleteSuccess(false);

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

      // Recharger la page après 1 seconde pour mettre à jour partout
      setTimeout(() => {
        window.location.reload();
      }, 1000);
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
              <Image
                src={avatarUrl}
                alt="Photo de profil"
                fill
                className="object-cover"
                unoptimized
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
                  <span>{avatarUrl ? "Changer la photo" : "Ajouter une photo"}</span>
                </>
              )}
            </button>

            {avatarUrl && (
              <button
                onClick={handleDelete}
                disabled={isUploading || isDeleting}
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
                    <span>Supprimer la photo</span>
                  </>
                )}
              </button>
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
    </div>
  );
}

