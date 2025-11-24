"use client";

import { useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import Image from "next/image";

interface ReviewFormProps {
  onSubmit?: () => void;
  initialReview?: {
    id: string;
    rating: number;
    comment: string | null;
    created_at: string;
    updated_at?: string;
  } | null;
}

export default function ReviewForm({ onSubmit, initialReview }: ReviewFormProps) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showThankYouModal, setShowThankYouModal] = useState(false);
  const [badgeInfo, setBadgeInfo] = useState<{ isFirstReviewForUser: boolean } | null>(null);
  const [submittedReview, setSubmittedReview] = useState<{
    rating: number;
    comment: string | null;
    created_at: string;
  } | null>(null);
  const [showNewReviewForm, setShowNewReviewForm] = useState(false);
  const supabase = createClientComponentClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: 'include',
        body: JSON.stringify({ rating, comment: comment.trim() || undefined }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Ne pas afficher "Unauthorized" brut - utiliser un message plus user-friendly
        const errorMessage = data.error === "Unauthorized" || data.error?.includes("Unauthorized")
          ? "Vous devez être connecté pour laisser un avis"
          : data.error || "Erreur lors de l'envoi de l'avis";
        throw new Error(errorMessage);
      }

      setSuccess(true);
      
      // Afficher le pop-up "10 points" seulement si c'est le premier avis valide pour le bonus
      const isFirstValidReview = data.isFirstValidReviewForBonus === true;
      
      setBadgeInfo({
        isFirstReviewForUser: isFirstValidReview
      });
      
      // Sauvegarder l'avis soumis pour l'afficher en lecture seule
      setSubmittedReview({
        rating: rating,
        comment: comment.trim() || null,
        created_at: data.review.created_at || new Date().toISOString()
      });
      
      // Réinitialiser le formulaire pour permettre un nouvel avis
      setRating(5);
      setComment("");
      setShowNewReviewForm(false);
      
      // Si c'est le premier avis valide, afficher le pop-up spécial
      if (isFirstValidReview) {
        // Premier avis valide détecté - pop-up spécial sera affiché
      } else if (rating === 5) {
        // Confetti simple pour 5 étoiles
        const el = document.createElement("div");
        el.className = "fixed inset-0 pointer-events-none z-[9998] flex items-center justify-center";
        el.innerHTML = "<div class='text-5xl animate-bounce'>🎉</div>";
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 1200);
      }
      
      // Afficher le pop-up de remerciement
      // Forcer l'affichage du pop-up immédiatement
      setShowThankYouModal(true);
      
      // Attendre un peu pour s'assurer que l'insertion est bien terminée
      // puis déclencher l'événement pour mettre à jour les avis sans recharger la page
      setTimeout(() => {
        const event = new CustomEvent("reviewSubmitted", { 
          detail: { review: data.review },
          bubbles: true,
          cancelable: true
        });
        window.dispatchEvent(event);
      }, 800);
      
      // Appeler le callback si fourni
      if (onSubmit) {
        setTimeout(() => {
          onSubmit();
        }, 100);
      }
    } catch (err: any) {
      setError(err.message || "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  // useEffect supprimé pour éviter les erreurs d'affichage

  // Si un avis a été soumis, l'afficher en lecture seule
  // MAIS garder le pop-up visible même après la soumission
  if (submittedReview && !showNewReviewForm) {
    return (
      <>
        <div className="space-y-5">
        {/* Avis soumis en lecture seule */}
        <div className="rounded-xl sm:rounded-2xl bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200/60 p-5 sm:p-6 shadow-md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-900">Votre avis</h3>
            <span className="text-xs text-slate-500">
              {new Date(submittedReview.created_at).toLocaleDateString('fr-FR', { 
                day: 'numeric', 
                month: 'long', 
                year: 'numeric' 
              })}
            </span>
          </div>
          
          <div className="mb-4">
            <div className="flex gap-1.5 mb-3">
              {[1, 2, 3, 4, 5].map((star) => (
                <span
                  key={star}
                  className={`text-xl sm:text-2xl ${
                    star <= submittedReview.rating 
                      ? "text-[#FFD700] drop-shadow-[0_0_4px_rgba(255,215,0,0.6)]" 
                      : "text-slate-300"
                  }`}
                >
                  ★
                </span>
              ))}
            </div>
            {submittedReview.comment && (
              <p className="text-slate-700 text-sm leading-relaxed">{submittedReview.comment}</p>
            )}
          </div>
        </div>

        {/* Bouton pour laisser un nouvel avis */}
        <button
          type="button"
          onClick={() => {
            setShowNewReviewForm(true);
            setSuccess(false);
          }}
          className="w-full px-6 py-3.5 rounded-xl text-white font-semibold transition-all active:scale-[0.98] hover:scale-105"
          style={{ background: "linear-gradient(135deg,#0052CC,#003D99)", boxShadow: "0 0 25px rgba(0,82,204,0.7)" }}
        >
          Laisser un nouvel avis
        </button>
      </div>
      {/* Pop-up de remerciement - Style cohérent avec les autres pop-ups du site */}
      {showThankYouModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <button
              aria-label="Fermer"
              onClick={() => setShowThankYouModal(false)}
              className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
            
            {badgeInfo?.isFirstReviewForUser ? (
              // Pop-up spécial pour le premier avis
              <>
                <h3 className="mb-1 text-center text-xl font-extrabold text-gray-900">Félicitations !</h3>
                <p className="mb-4 text-center text-sm text-gray-600">
                  Vous avez laissé votre premier avis
                </p>
                
                {/* Section Badge + Points */}
                <div className="mx-auto mt-3 flex w-full max-w-sm flex-col items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <Image 
                    src="/images/Badge.png" 
                    alt="Badge Contributeur" 
                    width={48} 
                    height={48} 
                    className="flex-shrink-0"
                    unoptimized
                  />
                  <div className="text-center">
                    <div className="text-base font-bold text-gray-900">Badge Contributeur débloqué !</div>
                  </div>
                  
                  {/* Section Points */}
                  <div className="mt-2 w-full rounded-lg bg-gradient-to-r from-emerald-500 to-green-600 p-3 shadow-md">
                    <div className="flex items-center justify-center gap-2">
                      <Image 
                        src="/images/Étoile points challenges.png" 
                        alt="Points" 
                        width={24} 
                        height={24} 
                        className="flex-shrink-0"
                        unoptimized
                      />
                      <div className="text-left">
                        <div className="text-xs text-emerald-100 uppercase tracking-wide mb-0.5 font-semibold">
                          Bonus gagné
                        </div>
                        <div className="text-xl font-extrabold text-white">
                          +10 points
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <p className="mt-4 text-center text-xs text-gray-500">
                  Votre avis sera visible par toute la communauté.
                </p>
                
                <button
                  className="mt-6 w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow hover:shadow-md"
                  onClick={() => setShowThankYouModal(false)}
                >
                  Parfait
                </button>
              </>
            ) : (
              // Pop-up standard pour les autres avis
              <>
                <div className="mb-3 text-center text-5xl">🎉</div>
                <h3 className="mb-1 text-center text-xl font-extrabold text-gray-900">Merci pour votre avis !</h3>
                <p className="mb-6 text-center text-gray-700">
                  Votre avis a été enregistré et sera visible par toute la communauté.
                </p>
                <button
                  className="mt-6 w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow hover:shadow-md"
                  onClick={() => setShowThankYouModal(false)}
                >
                  Parfait
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-3">Note</label>
        <div className="flex gap-2 sm:gap-3">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              aria-label={`Donner ${star} étoile${star>1?"s":""}`}
              onClick={() => setRating(star)}
              className={`text-[36px] sm:text-[40px] leading-none transition-all duration-150 ${
                star <= rating 
                  ? "text-[#FFD700] drop-shadow-[0_0_8px_rgba(255,215,0,0.7)] scale-105" 
                  : "text-slate-300"
              } hover:scale-110 hover:text-[#FFD700] hover:drop-shadow-[0_0_10px_rgba(255,215,0,0.8)] active:scale-95`}
            >
              ★
            </button>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="comment" className="block text-sm font-medium text-slate-700 mb-2">
          Commentaire (optionnel)
        </label>
        <div className="relative">
          <textarea
            id="comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={500}
            rows={5}
            className="w-full px-4 py-3 rounded-xl bg-slate-800/90 text-white border border-slate-600/50 focus:outline-none focus:ring-2 focus:ring-[#0066FF] focus:border-[#0066FF] transition-all resize-none"
          />
          {!comment && (
            <div className="absolute top-3 left-4 pointer-events-none flex items-center gap-1.5 text-slate-400 text-sm">
              <span>Comment trouvez-vous PadelXP ? Dites-nous tout...</span>
              <Image 
                src="/images/Commentaire page avis.png" 
                alt="Commentaire" 
                width={16} 
                height={16} 
                className="flex-shrink-0"
                style={{ filter: 'brightness(0) saturate(100%) invert(1)', mixBlendMode: 'screen' }}
                unoptimized
              />
              <Image 
                src="/images/Éclair page avis.png" 
                alt="Éclair" 
                width={16} 
                height={16} 
                className="flex-shrink-0"
                unoptimized
              />
            </div>
          )}
          <div className="absolute bottom-2.5 right-3 text-xs text-slate-400 tabular-nums">{comment.length}/500</div>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">
          Merci pour votre avis !
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full px-6 py-3.5 rounded-xl text-white font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] text-base hover:scale-105"
        style={{ background: "linear-gradient(135deg,#0052CC,#003D99)", boxShadow: "0 0 25px rgba(0,82,204,0.7)" }}
      >
        {loading ? "Envoi..." : "Envoyer l'avis"}
      </button>

      {/* Pop-up de remerciement - Style cohérent avec les autres pop-ups du site */}
      {showThankYouModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <button
              aria-label="Fermer"
              onClick={() => setShowThankYouModal(false)}
              className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
            
            {badgeInfo?.isFirstReviewForUser ? (
              // Pop-up spécial pour le premier avis
              <>
                <h3 className="mb-1 text-center text-xl font-extrabold text-gray-900">Félicitations !</h3>
                <p className="mb-4 text-center text-sm text-gray-600">
                  Vous avez laissé votre premier avis
                </p>
                
                {/* Section Badge + Points */}
                <div className="mx-auto mt-3 flex w-full max-w-sm flex-col items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <Image 
                    src="/images/Badge.png" 
                    alt="Badge Contributeur" 
                    width={48} 
                    height={48} 
                    className="flex-shrink-0"
                    unoptimized
                  />
                  <div className="text-center">
                    <div className="text-base font-bold text-gray-900">Badge Contributeur débloqué !</div>
                  </div>
                  
                  {/* Section Points */}
                  <div className="mt-2 w-full rounded-lg bg-gradient-to-r from-emerald-500 to-green-600 p-3 shadow-md">
                    <div className="flex items-center justify-center gap-2">
                      <Image 
                        src="/images/Étoile points challenges.png" 
                        alt="Points" 
                        width={24} 
                        height={24} 
                        className="flex-shrink-0"
                        unoptimized
                      />
                      <div className="text-left">
                        <div className="text-xs text-emerald-100 uppercase tracking-wide mb-0.5 font-semibold">
                          Bonus gagné
                        </div>
                        <div className="text-xl font-extrabold text-white">
                          +10 points
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <p className="mt-4 text-center text-xs text-gray-500">
                  Votre avis sera visible par toute la communauté.
                </p>
                
                <button
                  className="mt-6 w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow hover:shadow-md"
                  onClick={() => setShowThankYouModal(false)}
                >
                  Parfait
                </button>
              </>
            ) : (
              // Pop-up standard pour les autres avis
              <>
                <div className="mb-3 text-center text-5xl">🎉</div>
                <h3 className="mb-1 text-center text-xl font-extrabold text-gray-900">Merci pour votre avis !</h3>
                <p className="mb-6 text-center text-gray-700">
                  Votre avis a été enregistré et sera visible par toute la communauté.
                </p>
                <button
                  className="mt-6 w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow hover:shadow-md"
                  onClick={() => setShowThankYouModal(false)}
                >
                  Parfait
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </form>
  );
}

