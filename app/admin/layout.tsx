'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Building2, MessageSquare, Settings, Search, Bell, Users, Trophy } from 'lucide-react';
import { isAdmin } from '@/lib/admin-auth';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import LogoutButton from '@/components/LogoutButton';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  // NOUVEAU : Exclure la page de récupération du layout protégé
  if (pathname === '/admin/access') {
    return <>{children}</>;
  }

  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    let isMounted = true;
    let retryCount = 0;
    const MAX_RETRIES = 3;

    async function checkAdmin() {
      try {
        const supabase = createClient();

        // D'abord vérifier la session
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          // Pas de session = rediriger vers login
          if (isMounted) {
            router.push('/login');
          }
          return;
        }

        // Ensuite récupérer l'utilisateur
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        // Si erreur temporaire, réessayer jusqu'à MAX_RETRIES fois
        if (userError && retryCount < MAX_RETRIES) {
          retryCount++;
          console.warn(`[AdminLayout] getUser() failed, retry ${retryCount}/${MAX_RETRIES}:`, userError);
          // Attendre un peu avant de réessayer
          await new Promise(resolve => setTimeout(resolve, 500));
          if (isMounted) {
            return checkAdmin();
          }
          return;
        }

        if (!user) {
          // Pas d'utilisateur après tous les essais = rediriger vers login
          if (isMounted) {
            router.push('/login');
          }
          return;
        }

        // Vérifier si admin via la base de données (plus fiable que juste l'email)
        const { data: profile } = await supabase
          .from("profiles")
          .select("is_admin")
          .eq("id", user.id)
          .maybeSingle();

        const userIsAdmin = profile?.is_admin || isAdmin(user.email);

        if (!userIsAdmin) {
          // Utilisateur non-admin = rediriger vers home
          if (isMounted) {
            router.push('/home');
          }
          return;
        }

        // Tout est OK, autoriser l'accès
        if (isMounted) {
          setUser(user);
          setIsAuthorized(true);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('[AdminLayout] Error checking admin status:', error);
        // En cas d'erreur, ne pas rediriger immédiatement
        // Attendre un peu et réessayer une dernière fois
        if (retryCount < MAX_RETRIES && isMounted) {
          retryCount++;
          await new Promise(resolve => setTimeout(resolve, 1000));
          if (isMounted) {
            return checkAdmin();
          }
        } else if (isMounted) {
          // Après tous les essais, rediriger vers login
          router.push('/login');
        }
      }
    }

    checkAdmin();

    return () => {
      isMounted = false;
    };
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#BFFF00] mx-auto mb-4"></div>
          <p className="text-gray-400">Chargement de l'interface admin...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  const navItems = [
    { href: '/admin/dashboard', icon: Home, label: 'Tableau de bord' },
    { href: '/admin/clubs', icon: Building2, label: 'Clubs & Complexes' },
    { href: '/admin/players', icon: Users, label: 'Joueurs' },
    { href: '/admin/challenges', icon: Trophy, label: 'Challenges' },
    { href: '/admin/messages', icon: MessageSquare, label: 'Messagerie' },
    { href: '/admin/settings', icon: Settings, label: 'Paramètres' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-100 flex relative overflow-hidden">

      {/* Background Decorative Blurs */}
      <div className="absolute top-0 -left-20 w-96 h-96 bg-blue-600/20 rounded-full blur-[128px] pointer-events-none" />
      <div className="absolute bottom-0 -right-20 w-96 h-96 bg-indigo-600/10 rounded-full blur-[128px] pointer-events-none" />

      {/* Sidebar */}
      <aside
        className={`${sidebarOpen ? 'w-72' : 'w-20'
          } bg-slate-900/60 backdrop-blur-xl border-r border-white/5 transition-all duration-300 flex flex-col fixed h-screen z-40 shadow-2xl`}
      >
        {/* Logo */}
        <div className="h-24 flex justify-center items-center px-4 border-b border-white/5 bg-white/5 shrink-0">
          <div className="relative w-full h-full flex items-center justify-center">
            <img
              src="/images/padel-xp-logo-transparent.png"
              alt="PadelXP Logo"
              className={`object-contain transition-all duration-300 ${sidebarOpen ? 'w-48' : 'w-12'}`}
            />
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-6 space-y-2 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href ||
              (item.href !== '/admin/dashboard' && pathname?.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-300 group ${isActive
                  ? 'bg-gradient-to-r from-blue-600/20 to-indigo-600/10 border border-blue-500/20 text-white shadow-lg shadow-blue-900/20'
                  : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                  }`}
              >
                <div className={`p-1.5 rounded-lg transition-colors ${isActive ? 'bg-blue-500/20 text-blue-400' : 'bg-transparent text-slate-500 group-hover:text-slate-300 group-hover:bg-slate-800'}`}>
                  <Icon className="w-5 h-5" />
                </div>
                {sidebarOpen && (
                  <span className={`text-sm font-medium ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`}>
                    {item.label}
                  </span>
                )}

                {/* Active Indicator */}
                {sidebarOpen && isActive && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)]" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom section */}
        <div className="border-t border-white/5 p-4 bg-black/20">
          {sidebarOpen ? (
            <div className="space-y-3">
              <div className="flex justify-center">
                <div title="Déconnexion">
                  <LogoutButton variant="dark" />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <div title="Déconnexion">
                <LogoutButton variant="dark" />
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main content */}
      <div className={`flex-1 ${sidebarOpen ? 'ml-72' : 'ml-20'} transition-all duration-300 flex flex-col h-screen overflow-y-auto relative z-10 custom-scrollbar`}>


        {/* Page content */}
        <main className="p-8 flex-1 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
