"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";

interface ProfilePhotoUploadProps {
  value: File | null;
  onChange: (file: File | null) => void;
  error?: string;
  required?: boolean;
}

export default function ProfilePhotoUpload({
  value,
  onChange,
  error,
  required = false,
}: ProfilePhotoUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);

  const handleFileSelect = (file: File | null) => {
    if (!file) {
      onChange(null);
      setPreview(null);
      setImagePosition({ x: 0, y: 0 });
      return;
    }

    // Vérifier le type de fichier
    if (!file.type.startsWith("image/")) {
      alert("Veuillez sélectionner une image");
      return;
    }

    // Vérifier la taille (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("L'image est trop grande (maximum 5MB)");
      return;
    }

    onChange(file);

    // Créer une preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
      setImagePosition({ x: 0, y: 0 });
    };
    reader.readAsDataURL(file);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    handleFileSelect(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0] || null;
    handleFileSelect(file);
  };

  const handleGalleryClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageMouseDown = (e: React.MouseEvent) => {
    if (!preview) return;
    e.preventDefault();
    setIsDraggingImage(true);
    setDragStart({
      x: e.clientX - imagePosition.x,
      y: e.clientY - imagePosition.y,
    });
  };

  useEffect(() => {
    const handleImageMouseMove = (e: MouseEvent) => {
      if (!isDraggingImage) return;
      
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      
      // Limiter le déplacement (l'image peut être plus grande que le conteneur)
      const maxMove = 50; // Maximum 50px dans chaque direction
      
      setImagePosition({
        x: Math.max(-maxMove, Math.min(maxMove, newX)),
        y: Math.max(-maxMove, Math.min(maxMove, newY)),
      });
    };

    const handleImageMouseUp = () => {
      setIsDraggingImage(false);
    };

    if (isDraggingImage) {
      window.addEventListener('mousemove', handleImageMouseMove);
      window.addEventListener('mouseup', handleImageMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleImageMouseMove);
        window.removeEventListener('mouseup', handleImageMouseUp);
      };
    }
  }, [isDraggingImage, dragStart]);

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-white">
        Photo de profil {required && <span className="text-red-400">*</span>}
      </label>
      
      <div
        className={`relative border-2 border-dashed rounded-lg p-2 transition-colors w-44 mx-auto ${
          isDragging
            ? "border-[#0066FF] bg-[#0066FF]/10"
            : error
            ? "border-red-500/50 bg-red-900/10"
            : "border-white/20 bg-white/5"
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {preview ? (
          <div 
            ref={imageContainerRef}
            className="relative w-20 h-20 mx-auto overflow-hidden rounded-full cursor-move"
            onMouseDown={handleImageMouseDown}
          >
            <div
              className="absolute inset-0"
              style={{
                transform: `translate(${imagePosition.x}px, ${imagePosition.y}px)`,
                transition: isDraggingImage ? 'none' : 'transform 0.1s ease-out',
              }}
            >
              <Image
                src={preview}
                alt="Preview"
                fill
                className="object-cover"
              />
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange(null);
                setPreview(null);
                setImagePosition({ x: 0, y: 0 });
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
              className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center hover:bg-red-600 transition-colors text-xs z-10"
            >
              ×
            </button>
          </div>
        ) : (
          <div className="text-center py-2">
            <div className="mx-auto w-12 h-12 mb-2 flex items-center justify-center rounded-full bg-white/10">
              <svg
                className="w-5 h-5 text-white/60"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <p className="text-[10px] text-white/70 mb-1.5">
              Glissez-déposez ou
            </p>
            <button
              type="button"
              onClick={handleGalleryClick}
              className="px-3 py-1 text-[10px] font-medium text-white bg-white/10 hover:bg-white/20 rounded transition-colors"
            >
              Galerie
            </button>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp"
        onChange={handleInputChange}
        className="hidden"
      />

      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}
    </div>
  );
}
