"use client";

import { useParams } from "next/navigation";
import Link from "next/link";

export default function ClubHomePage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug || "";

  const sections = [
    {
      title: "Classement",
      description: "Consultez le classement des membres de votre club",
      href: `/club/${slug}/classement`,
      icon: "🏆",
      color: "from-yellow-500 to-orange-500"
    },
    {
      title: "Résultats",
      description: "Historique des matchs joués par les membres",
      href: `/club/${slug}/resultats`,
      icon: "📊",
      color: "from-blue-500 to-cyan-500"
    }
  ];

  return (
    <div className="min-h-screen bg-black text-white px-6 py-10">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-extrabold mb-2">Club {slug.toUpperCase()}</h1>
        <p className="text-white/60 mb-8 text-sm">Bienvenue dans l'espace de votre club</p>

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

