import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import Link from "next/link";
import ClubHeader from "@/components/club/ClubHeader";
import { getClubPublicExtras } from "@/lib/utils/club-utils";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = SUPABASE_URL && SERVICE_ROLE_KEY
  ? createServiceClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  : null;

async function getClubData(slug: string) {
  const supabase = createClient();
  
  // Essayer d'abord avec admin client
  if (supabaseAdmin) {
    const { data: club } = await supabaseAdmin
      .from("clubs")
      .select("id, name, logo_url")
      .eq("slug", slug)
      .maybeSingle();
    
    if (club) {
      return {
        id: club.id as string,
        name: (club.name as string) || slug.toUpperCase(),
        logo_url: club.logo_url as string | null,
      };
    }
  }

  // Fallback avec client standard
  const { data: club } = await supabase
    .from("clubs")
    .select("id, name, logo_url")
    .eq("slug", slug)
    .maybeSingle();

  if (club) {
    return {
      id: club.id as string,
      name: (club.name as string) || slug.toUpperCase(),
      logo_url: club.logo_url as string | null,
    };
  }

  return {
    id: null,
    name: slug.toUpperCase(),
    logo_url: null,
  };
}

export default async function ClubHomePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const slugValue = slug || "";
  const clubData = await getClubData(slugValue);
  const extras = clubData.id ? await getClubPublicExtras(clubData.id) : null;

  const sections = [
    {
      title: "Classement",
      description: "Consultez le classement des membres de votre club",
      href: `/club/${slugValue}/classement`,
      icon: "🏆",
      color: "from-yellow-500 to-orange-500"
    },
    {
      title: "Résultats",
      description: "Historique des matchs joués par les membres",
      href: `/club/${slugValue}/resultats`,
      icon: "📊",
      color: "from-blue-500 to-cyan-500"
    }
  ];

  return (
    <div className="min-h-screen bg-black text-white px-6 py-10">
      <div className="max-w-6xl mx-auto">
        <ClubHeader 
          name={clubData.name}
          logoUrl={clubData.logo_url}
          description={extras?.description ?? null}
        />
        <p className="text-white/60 mb-8 text-sm mt-4">Bienvenue dans l'espace de votre club</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sections.map((section) => (
            <Link
              key={section.href}
              href={section.href}
              className="group relative rounded-xl border border-white/10 bg-white/5 p-6 hover:bg-white/10 transition-all hover:scale-105"
            >
              <div className={`text-4xl mb-4 bg-gradient-to-br ${section.color} bg-clip-text text-transparent`}>
                {section.icon}
              </div>
              <h2 className="text-xl font-bold mb-2">{section.title}</h2>
              <p className="text-white/60 text-sm">{section.description}</p>
              <div className="mt-4 text-sm font-medium text-blue-400 group-hover:text-blue-300">
                Accéder →
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

