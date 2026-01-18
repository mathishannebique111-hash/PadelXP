"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Star, ChevronDown, ChevronUp, Loader2, Send } from "lucide-react";
import { logger } from "@/lib/logger";

interface Review {
    id: string;
    rating: number;
    comment: string;
    created_at: string;
    user_id: string;
    profiles?: { display_name: string } | null;
}

export default function ReviewsSection() {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const [isExpanded, setIsExpanded] = useState(false);
    const [hasUserReview, setHasUserReview] = useState(false);
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [comment, setComment] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [averageRating, setAverageRating] = useState(0);
    const supabase = createClient();

    useEffect(() => {
        const loadReviews = async () => {
            try {
                setLoading(true);
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                // Get reviews
                const { data: reviewsData } = await supabase
                    .from("reviews")
                    .select("id, rating, comment, created_at, user_id")
                    .eq("is_hidden", false)
                    .order("created_at", { ascending: false })
                    .limit(10);

                if (reviewsData) {
                    setReviews(reviewsData);
                    const avg = reviewsData.length > 0
                        ? reviewsData.reduce((sum, r) => sum + (r.rating || 0), 0) / reviewsData.length
                        : 0;
                    setAverageRating(avg);
                }

                // Check if user has reviewed
                const { count } = await supabase
                    .from("reviews")
                    .select("id", { count: "exact", head: true })
                    .eq("user_id", user.id);

                setHasUserReview((count || 0) > 0);
            } catch (error) {
                logger.error("[ReviewsSection] Error:", error);
            } finally {
                setLoading(false);
            }
        };

        loadReviews();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (rating === 0 || submitting) return;

        setSubmitting(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from("reviews")
                .insert({ user_id: user.id, rating, comment: comment.trim() || null })
                .select()
                .single();

            if (error) throw error;

            if (data) {
                setReviews([data, ...reviews]);
                setHasUserReview(true);
                setRating(0);
                setComment("");
                alert("Merci pour votre avis !");
            }
        } catch (error) {
            logger.error("[ReviewsSection] Submit error:", error);
            alert("Erreur lors de l'envoi de l'avis.");
        } finally {
            setSubmitting(false);
        }
    };

    const renderStars = (value: number, interactive = false) => {
        return (
            <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                    <button
                        key={star}
                        type={interactive ? "button" : undefined}
                        disabled={!interactive}
                        onMouseEnter={() => interactive && setHoverRating(star)}
                        onMouseLeave={() => interactive && setHoverRating(0)}
                        onClick={() => interactive && setRating(star)}
                        className={interactive ? "cursor-pointer transition-transform hover:scale-110" : "cursor-default"}
                    >
                        <Star
                            size={interactive ? 24 : 14}
                            className={`${(interactive ? (hoverRating || rating) : value) >= star ? "text-yellow-400 fill-yellow-400" : "text-gray-500"}`}
                        />
                    </button>
                ))}
            </div>
        );
    };

    return (
        <div className="rounded-lg sm:rounded-xl md:rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5 md:p-6">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between text-left"
            >
                <div className="flex items-center gap-3">
                    <Star className="w-5 h-5 text-yellow-400" />
                    <div>
                        <h2 className="text-lg sm:text-xl font-semibold text-white">Avis et Notes</h2>
                        <p className="text-xs text-white/60">
                            {averageRating > 0 ? `${averageRating.toFixed(1)}/5 · ${reviews.length} avis` : "Donnez votre avis sur PadelXP"}
                        </p>
                    </div>
                </div>
                {isExpanded ? <ChevronUp className="text-white/60" /> : <ChevronDown className="text-white/60" />}
            </button>

            {isExpanded && (
                <div className="mt-4 pt-4 border-t border-white/10">
                    {loading ? (
                        <div className="flex items-center gap-2 py-4 justify-center">
                            <Loader2 className="animate-spin text-blue-500" size={20} />
                            <span className="text-sm text-gray-400">Chargement...</span>
                        </div>
                    ) : (
                        <>
                            {/* Form for new review */}
                            {!hasUserReview && (
                                <form onSubmit={handleSubmit} className="mb-4 p-3 rounded-lg bg-white/5 border border-white/10">
                                    <p className="text-xs text-green-400 mb-2">🎁 10 points offerts pour votre premier avis !</p>
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-xs text-white/60">Votre note :</span>
                                        {renderStars(rating, true)}
                                    </div>
                                    <textarea
                                        value={comment}
                                        onChange={(e) => setComment(e.target.value)}
                                        placeholder="Votre commentaire (optionnel)..."
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
                                        rows={2}
                                    />
                                    <button
                                        type="submit"
                                        disabled={rating === 0 || submitting}
                                        className="mt-2 w-full bg-blue-500 text-white rounded-lg px-4 py-2 text-sm hover:bg-blue-600 disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {submitting ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
                                        Envoyer mon avis
                                    </button>
                                </form>
                            )}

                            {/* Recent reviews */}
                            <div className="space-y-3 max-h-48 overflow-y-auto">
                                {reviews.length === 0 ? (
                                    <p className="text-center text-xs text-gray-400 py-4">Aucun avis pour le moment.</p>
                                ) : (
                                    reviews.slice(0, 5).map((review) => (
                                        <div key={review.id} className="flex items-start gap-2 p-2 rounded-lg bg-white/5">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    {renderStars(review.rating)}
                                                    <span className="text-[10px] text-gray-400">
                                                        {new Date(review.created_at).toLocaleDateString("fr-FR")}
                                                    </span>
                                                </div>
                                                {review.comment && (
                                                    <p className="text-xs text-white/70 mt-1 line-clamp-2">{review.comment}</p>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
