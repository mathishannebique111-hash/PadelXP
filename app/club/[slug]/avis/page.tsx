"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Review = { id: string; user_id: string; rating: number; comment: string | null; created_at: string };

export default function ClubReviewsPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug || "";
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const supabase = createClient();
        // Récupérer club_id pour filtrer les avis
        const { data: club } = await supabase.from("clubs").select("id").eq("slug", slug).single();
        if (!club) { setReviews([]); setLoading(false); return; }

        const { data, error } = await supabase
          .from("reviews")
          .select("id, user_id, rating, comment, created_at, club_id")
          .eq("club_id", club.id)
          .order("created_at", { ascending: false });
        if (error || !data) setReviews([]); else setReviews(data as any);
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  return (
    <div className="min-h-screen bg-black text-white px-6 py-10">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-extrabold mb-2">Avis — {slug.toUpperCase()}</h1>
        <div className="rounded-xl border border-white/10 bg-white/5 divide-y divide-white/10">
          {loading ? (
            <div className="px-4 py-6 text-white/60 text-sm">Chargement…</div>
          ) : reviews.length === 0 ? (
            <div className="px-4 py-6 text-white/60 text-sm">Aucun avis pour le moment.</div>
          ) : (
            reviews.map(r => (
              <div key={r.id} className="px-4 py-4">
                <div className="flex items-center justify-between mb-1">
                  <div className="text-sm text-white/60">{new Date(r.created_at).toLocaleDateString("fr-FR")}</div>
                  <div className="text-yellow-400">{"★".repeat(r.rating)}<span className="text-white/30">{"★".repeat(Math.max(0, 5 - r.rating))}</span></div>
                </div>
                <div className="text-sm">{r.comment || ""}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}




