import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { getUserClubInfo } from "@/lib/utils/club-utils";
import InviteAdminForm from "./InviteAdminForm";
import RemoveAdminButton from "./RemoveAdminButton";
import PageTitle from "../PageTitle";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = SUPABASE_URL && SERVICE_ROLE_KEY
  ? createServiceClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  : null;

type Admin = {
  id: string;
  user_id: string;
  email: string;
  role: "owner" | "admin";
  invited_at: string;
  activated_at: string | null;
};

export default async function RolesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/clubs/login?next=/dashboard/roles");
  }

  const { clubId } = await getUserClubInfo();
  
  if (!clubId) {
    redirect("/dashboard");
  }

  // Récupérer tous les administrateurs du club
  let admins: Admin[] = [];
  if (supabaseAdmin) {
    const { data, error } = await supabaseAdmin
      .from("club_admins")
      .select("id, user_id, email, role, invited_at, activated_at")
      .eq("club_id", clubId)
      .order("role", { ascending: true })
      .order("invited_at", { ascending: true });

    if (!error && data) {
      admins = data as Admin[];
    }
  }
  // Si aucun admin n'est trouvé, créer l'entrée pour le propriétaire actuel
  if (admins.length === 0 && user.email && supabaseAdmin) {
    const { error: insertError } = await supabaseAdmin
      .from("club_admins")
      .insert({
        club_id: clubId,
        user_id: user.id,
        email: user.email,
        role: "owner",
        activated_at: new Date().toISOString(),
      });

    if (!insertError) {
      // Recharger les admins
      const { data } = await supabaseAdmin
        .from("club_admins")
        .select("id, user_id, email, role, invited_at, activated_at")
        .eq("club_id", clubId)
        .order("role", { ascending: true })
        .order("invited_at", { ascending: true });

      if (data) {
        admins = data as Admin[];
      }
    }
  }

  // Séparer les admins actifs des invitations en attente
  const activeAdmins = admins.filter((admin) => admin.activated_at !== null);
  const pendingInvitations = admins.filter((admin) => admin.activated_at === null);
  
  // Vérifier si l'utilisateur connecté est le propriétaire
  const isOwner = admins.some((admin) => admin.user_id === user.id && admin.role === "owner");

  return (
    <div className="space-y-6">
      <PageTitle title="Rôles et accès" />
      
      {/* Administrateurs actifs */}
      <div className="rounded-lg sm:rounded-xl md:rounded-2xl border border-white/80 ring-1 ring-white/10 bg-white/5 p-6">
        <div className="flex items-center gap-2 mb-5">
          <span className="text-xl">👥</span>
          <h2 className="font-bold text-lg">Administrateurs</h2>
        </div>
        <div className="space-y-2 sm:space-y-3">
          {activeAdmins.length > 0 ? (
            [...activeAdmins]
              .sort((a, b) => {
                if (a.role === "owner" && b.role !== "owner") return -1;
                if (b.role === "owner" && a.role !== "owner") return 1;
                const aTime = a.invited_at ? new Date(a.invited_at).getTime() : 0;
                const bTime = b.invited_at ? new Date(b.invited_at).getTime() : 0;
                return aTime - bTime;
              })
              .map((admin) => {
              const isCurrent = admin.user_id === user.id;
              return (
                <div
                  key={admin.id}
                  className={`group relative overflow-hidden rounded-lg sm:rounded-xl md:rounded-2xl border ${
                    isCurrent ? "border-emerald-400/50 shadow-[0_0_25px_rgba(16,185,129,0.35)]" : "border-blue-400/20"
                  } bg-gradient-to-br ${
                    isCurrent
                      ? "from-emerald-500/15 via-teal-500/10 to-blue-600/15"
                      : "from-blue-500/10 via-blue-600/5 to-indigo-600/10"
                  } p-3 sm:p-4 md:p-5 shadow-lg transition-all hover:shadow-xl hover:border-blue-400/40`}
                >
                  {/* Effet de brillance au survol */}
                  <div className="pointer-events-none absolute -inset-full opacity-0 transition-all duration-700 group-hover:opacity-100">
                    <div className="absolute inset-0 translate-x-[-100%] bg-gradient-to-r from-transparent via-white/5 to-transparent group-hover:translate-x-[100%] group-hover:transition-transform group-hover:duration-1000" />
                  </div>

                  <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
                    <div className="flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/30">
                      <span className="text-xl sm:text-2xl">{admin.role === "owner" ? "👑" : "👤"}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1">
                        <div className="text-sm sm:text-base font-bold text-white truncate">{admin.email}</div>
                        {isCurrent && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-semibold text-emerald-200 border border-emerald-400/40 flex-shrink-0">
                            Vous
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] sm:text-xs font-medium ${
                            isCurrent ? "text-emerald-100" : "text-blue-200"
                          }`}
                        >
                          {admin.role === "owner" ? (
                            <>
                              <span>👑</span>
                              <span>Propriétaire du compte</span>
                            </>
                          ) : (
                            <>
                              <span>🔑</span>
                              <span>Administrateur invité</span>
                            </>
                          )}
                        </span>
                      </div>
                    </div>
                    <div className="shrink-0 flex items-center gap-1.5 sm:gap-2 self-start sm:self-auto">
                      <div className="rounded-lg sm:rounded-xl bg-gradient-to-r from-blue-500/30 to-indigo-500/30 border border-blue-400/40 px-2.5 sm:px-4 py-1.5 sm:py-2 text-[10px] sm:text-xs font-bold text-blue-200 shadow-lg backdrop-blur-sm">
                        ADMIN
                      </div>
                      {/* Bouton de suppression uniquement pour le propriétaire et seulement pour les admins invités */}
                      {isOwner && admin.role === "admin" && (
                        <RemoveAdminButton adminId={admin.id} adminEmail={admin.email} />
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="rounded-lg sm:rounded-xl border border-white/10 bg-white/5 px-3 sm:px-4 py-6 sm:py-8 text-center">
              <div className="text-2xl sm:text-3xl mb-2 opacity-30">👤</div>
              <div className="text-xs sm:text-sm text-white/60">Aucun administrateur</div>
            </div>
          )}
        </div>
      </div>

      {/* Formulaire d'invitation */}
      <InviteAdminForm />

      {/* Invitations en attente */}
      <div className="rounded-lg sm:rounded-xl md:rounded-2xl border border-white/80 ring-1 ring-white/10 bg-white/5 p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-3 sm:mb-4">
          <span className="text-lg sm:text-xl">⏳</span>
          <h2 className="font-semibold text-sm sm:text-base">Invitations en attente</h2>
        </div>
        {pendingInvitations.length > 0 ? (
          <div className="space-y-2">
            {pendingInvitations.map((invitation) => (
              <div
                key={invitation.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between rounded-lg border border-white/15 bg-white/5 px-3 sm:px-4 py-2.5 sm:py-3 gap-2 sm:gap-0"
              >
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <div className="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/20">
                    <span className="text-base sm:text-lg">✉️</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs sm:text-sm font-medium text-white truncate">{invitation.email}</div>
                    <div className="text-[10px] sm:text-xs text-white/60">
                      Invité le {new Date(invitation.invited_at).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2 self-start sm:self-auto">
                  <div className="rounded-lg bg-white/10 border border-white/20 px-2 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs font-medium text-white/80">
                    En attente
                  </div>
                  {/* Bouton de suppression pour les invitations en attente */}
                  {isOwner && (
                    <RemoveAdminButton adminId={invitation.id} adminEmail={invitation.email} isPending={true} />
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-white/15 bg-white/5 px-3 sm:px-4 py-4 sm:py-6 text-center text-xs sm:text-sm text-white/70">
            Aucune invitation en attente.
          </div>
        )}
        <p className="mt-2 sm:mt-3 text-[10px] sm:text-xs text-white/50">
          Ces administrateurs ont été invités mais n'ont pas encore confirmé leur mot de passe.
        </p>
      </div>
    </div>
  );
}


