"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { logger } from '@/lib/logger';

function buildInvitationCode(name: string, postal: string) {
  const upper = name
    .normalize("NFD").replace(/\p{Diacritic}/gu, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "");
  return (upper + (postal || "")).trim();
}

export default function PlayerClubGate({
  onValidChange,
  onChange,
  showInvalidState = false,
}: {
  onValidChange?: (valid: boolean) => void;
  onChange?: (v: { name: string; slug: string; invitationCode: string; code: string }) => void;
  showInvalidState?: boolean;
}) {
  const [clubs, setClubs] = useState<Array<{ name: string; slug: string; code_invitation: string }>>([]);
  const [selectedSlug, setSelectedSlug] = useState<string>("");
  const [code, setCode] = useState<string>("");

  useEffect(() => {
    setClubs([]);
    (async () => {
      // Utiliser directement l'API publique pour éviter les problèmes RLS
      try {
        logger.info("[PlayerClubGate] Loading clubs via API...");
        const apiRes = await fetch('/api/clubs/list', {
          cache: 'no-store',
          next: { revalidate: 0 },
        });
        
        if (!apiRes.ok) {
          const errorText = await apiRes.text();
          logger.error("[PlayerClubGate] API error response:", apiRes.status, errorText);
          throw new Error(`API returned ${apiRes.status}: ${errorText}`);
        }
        
        const apiData = await apiRes.json();
        logger.info("[PlayerClubGate] API response:", apiData);
        
        if (apiData.error) {
          logger.error("[PlayerClubGate] API returned error:", apiData.error);
          // Essayer la requête directe en fallback
          await loadClubsDirect();
        } else if (apiData.clubs && Array.isArray(apiData.clubs)) {
          logger.info("[PlayerClubGate] API returned", apiData.clubs.length, "clubs");
          setClubs(apiData.clubs);
        } else {
          logger.warn("[PlayerClubGate] API returned empty clubs array");
          setClubs([]);
        }
      } catch (apiErr: any) {
        logger.error("[PlayerClubGate] API fetch failed, trying direct query...", apiErr);
        await loadClubsDirect();
      }
      
      setSelectedSlug("");
      setCode("");
      
      // Fonction helper pour charger directement depuis Supabase
      async function loadClubsDirect() {
        try {
          const supabase = createClient();
          const result = await supabase
            .from("clubs")
            .select("*")
            .order("name", { ascending: true });
          
          logger.info("[PlayerClubGate] Direct query result:", { data: result.data, error: result.error });
          
          if (!result.error && result.data) {
            const filtered = result.data.filter((club: any) => {
              const status = club?.status ?? null;
              if (status && status !== "active") return false;
              return true;
            });

            const normalizedClubs = filtered.map((club: any) => ({
              name: club.name || club.club_name || "Club sans nom",
              slug: club.slug || club.club_slug || (club.name ? club.name.toLowerCase().replace(/[^a-z0-9]+/g, '') : ''),
              code_invitation: club.code_invitation || club.invitation_code || club.code || '',
            })).filter((club: any) => club.name && club.slug && club.code_invitation);
            
            logger.info("[PlayerClubGate] Loaded clubs via direct query:", normalizedClubs.length);
            setClubs(normalizedClubs);
            return;
          }
        } catch (directErr) {
          logger.error("[PlayerClubGate] Direct query also failed:", directErr);
        }
        
        // Dernier recours : fallback TCAM
        logger.warn("[PlayerClubGate] All methods failed, returning empty list");
        setClubs([]);
      }
    })();
  }, []);

  const selectedClub = useMemo(() => clubs.find(c => c.slug === selectedSlug) || null, [clubs, selectedSlug]);
  const expectedCode = selectedClub?.code_invitation || "";
  const normalizedInput = useMemo(() => code.normalize("NFD").replace(/\p{Diacritic}/gu, "").toUpperCase().replace(/[^A-Z0-9]+/g, "").trim(), [code]);
  const isValid = selectedClub ? (normalizedInput === (expectedCode || "").toUpperCase()) : false;

  useEffect(() => { 
    onValidChange?.(isValid); 
    onChange?.({ name: selectedClub?.name || "", slug: selectedClub?.slug || "", invitationCode: expectedCode, code }); 
  }, [isValid, onValidChange, onChange, selectedClub, expectedCode, code]);

  return (
    <div className="space-y-3">
      <label className="block text-xs text-white/70 mb-1">
        Club / complexe <span className="text-red-400">*</span>
      </label>
      <div className="relative">
        <select
          value={selectedSlug}
          onChange={(e) => {
            const slug = e.target.value;
            setSelectedSlug(slug);
          }}
          className="w-full appearance-none rounded-md bg-white/5 border border-white px-3 pr-10 py-2 text-white"
        >
          <option value="">Sélectionnez votre club / complexe</option>
          {clubs.map((c) => (
            <option key={c.slug} value={c.slug}>{c.name}</option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-white/70">
          ▼
        </div>
      </div>

      <label className="block text-xs text-white/70 mb-1">
        Code d'invitation <span className="text-red-400">*</span>
      </label>
      <input
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="Saisir le code reçu"
        className={`w-full rounded-md px-3 py-2 text-white placeholder-white/40 border ${
          isValid ? 'bg-white/5 border-white/10' : showInvalidState ? 'bg-white/5 border-red-400' : 'bg-white/5 border-white/10'
        }`}
      />
      {!isValid && code.length > 0 && selectedSlug && showInvalidState && (
        <div className="text-xs mt-1 text-red-400">Le code ne correspond pas au club sélectionné.</div>
      )}
    </div>
  );
}


