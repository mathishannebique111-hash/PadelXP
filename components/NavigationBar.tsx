import Link from "next/link";
import Image from "next/image";

type NavKey = "home" | "match" | "history" | "badges" | "club" | "challenges" | "reviews" | "boost";

export default function NavigationBar({ currentPage }: { currentPage?: NavKey }) {
  const base = "inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all backdrop-blur border whitespace-nowrap";
  const inactive = "bg-white/10 text-white/90 hover:bg-white/20 border-white/10 hover:border-white/20 hover:translate-y-[-1px]";
  const active = "bg-blue-600 text-white border-blue-500 shadow-[0_6px_24px_rgba(37,99,235,0.35)]";
  const label = "tracking-wide";
  const iconClass = "w-4 h-4 object-contain flex-shrink-0";
  
  return (
    <div className="mb-6 flex items-center justify-between gap-4 border-b pb-4 overflow-x-auto" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
      <div className="flex items-center gap-3 min-w-max">
        <Link href="/home" className={`${base} ${currentPage === "home" ? active : inactive}`} style={{ letterSpacing: "0.01em" }}>
          <span className={label}>Profil</span>
          <Image src="/images/Profil.png" alt="Profil" width={16} height={16} className={iconClass} style={{ filter: 'brightness(0) invert(1)' }} />
        </Link>
        <Link href="/match/new" className={`${base} ${currentPage === "match" ? active : inactive}`} style={{ letterSpacing: "0.01em" }}>
          <span className={label}>Enregistrer un match</span>
          <Image src="/images/Enregistrer un match.png" alt="Enregistrer un match" width={16} height={16} className={iconClass} style={{ filter: 'brightness(0) invert(1)' }} />
        </Link>
        <Link href="/matches/history" className={`${base} ${currentPage === "history" ? active : inactive}`} style={{ letterSpacing: "0.01em" }}>
          <span className={label}>Historique des matchs</span>
          <Image src="/images/Historique des matchs.png" alt="Historique des matchs" width={16} height={16} className={iconClass} style={{ filter: 'brightness(0) invert(1)' }} />
        </Link>
        <Link href="/badges" className={`${base} ${currentPage === "badges" ? active : inactive}`} style={{ letterSpacing: "0.01em" }}>
          <span className={label}>Badges</span>
          <Image src="/images/Badges.png" alt="Badges" width={16} height={16} className={iconClass} style={{ filter: 'brightness(0) invert(1)' }} />
        </Link>
        <Link href="/club" className={`${base} ${currentPage === "club" ? active : inactive}`} style={{ letterSpacing: "0.01em" }}>
          <span className={label}>Club</span>
          <Image src="/images/Club.png" alt="Club" width={16} height={16} className={iconClass} style={{ filter: 'brightness(0) invert(1)' }} />
        </Link>
        <Link href="/challenges" className={`${base} ${currentPage === "challenges" ? active : inactive}`} style={{ letterSpacing: "0.01em" }}>
          <span className={label}>Challenges</span>
          <Image src="/images/Challenges.png" alt="Challenges" width={16} height={16} className={iconClass} style={{ filter: 'brightness(0) invert(1)' }} />
        </Link>
        <Link href="/reviews" className={`${base} ${currentPage === "reviews" ? active : inactive}`} style={{ letterSpacing: "0.01em" }}>
          <span className={label}>Avis</span>
          <Image src="/images/Avis.png" alt="Avis" width={16} height={16} className={iconClass} style={{ filter: 'brightness(0) invert(1)' }} />
        </Link>
        <Link href="/boost" className={`${base} ${currentPage === "boost" ? active : inactive}`} style={{ letterSpacing: "0.01em" }}>
          <span className={label}>Boost</span>
          <Image src="/images/Boost.png" alt="Boost" width={16} height={16} className={iconClass} style={{ filter: 'brightness(0) invert(1)' }} />
        </Link>
      </div>
    </div>
  );
}

