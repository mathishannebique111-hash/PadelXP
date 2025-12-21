import Link from "next/link";
import Image from "next/image";

type NavKey = "home" | "match" | "history" | "badges" | "club" | "challenges" | "reviews" | "boost";

export default function NavigationBar({ currentPage }: { currentPage?: NavKey }) {
  // Styles de base responsive : plus petits sur mobile, normaux sur desktop
  const base = "inline-flex items-center justify-center gap-1.5 sm:gap-2 rounded-lg sm:rounded-xl px-2.5 sm:px-4 md:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold transition-all backdrop-blur border whitespace-nowrap";
  const inactive = "bg-white/10 text-white/90 hover:bg-white/20 border-white/10 hover:border-white/20 hover:translate-y-[-1px]";
  const active = "bg-blue-600 text-white border-blue-500 shadow-[0_6px_24px_rgba(37,99,235,0.35)]";
  const label = "tracking-wide hidden sm:inline"; // Cache le texte sur mobile très petit, visible sur sm+
  const iconClass = "w-3.5 h-3.5 sm:w-4 sm:h-4 object-contain flex-shrink-0";
  
  return (
    <div className="mb-4 sm:mb-6 flex items-center justify-between gap-2 sm:gap-4 border-b pb-3 sm:pb-4 overflow-x-auto scrollbar-hide" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
      <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 min-w-max -mr-4 sm:mr-0">
        <Link href="/home" className={`${base} ${currentPage === "home" ? active : inactive}`} style={{ letterSpacing: "0.01em" }}>
          <Image src="/images/Profil.png" alt="Profil" width={16} height={16} className={iconClass} unoptimized />
          <span className={label}>Profil</span>
        </Link>
        <Link href="/match/new" className={`${base} ${currentPage === "match" ? active : inactive}`} style={{ letterSpacing: "0.01em" }}>
          <Image 
            src="/images/Enregistrer%20un%20match.png" 
            alt="Enregistrer un match" 
            width={16} 
            height={16} 
            className={iconClass} 
            unoptimized 
          />
          <span className={label}>Enregistrer un match</span>
        </Link>
        <Link href="/matches/history" className={`${base} ${currentPage === "history" ? active : inactive}`} style={{ letterSpacing: "0.01em" }}>
          <Image src="/images/Historique%20des%20matchs%20joueur.png?v=12" alt="Historique des matchs" width={16} height={16} className={iconClass} unoptimized />
          <span className={label}>Historique des matchs</span>
        </Link>
        <Link href="/badges" className={`${base} ${currentPage === "badges" ? active : inactive}`} style={{ letterSpacing: "0.01em" }}>
          <Image src="/images/Badge.png?v=11" alt="Badges" width={16} height={16} className={iconClass} unoptimized />
          <span className={label}>Badges</span>
        </Link>
        <Link href="/club" className={`${base} ${currentPage === "club" ? active : inactive}`} style={{ letterSpacing: "0.01em" }}>
          <Image src="/images/mon-club.png" alt="Mon club" width={14} height={14} className="w-3.5 h-3.5 sm:w-[14px] sm:h-[14px] object-contain flex-shrink-0" unoptimized />
          <span className={label}>Club</span>
        </Link>
        <Link href="/challenges" className={`${base} ${currentPage === "challenges" ? active : inactive}`} style={{ letterSpacing: "0.01em" }}>
          <Image src="/images/Objectif%20page%20avis.png?v=9" alt="Challenges" width={16} height={16} className={iconClass} unoptimized />
          <span className={label}>Challenges</span>
        </Link>
        <Link href="/reviews" className={`${base} ${currentPage === "reviews" ? active : inactive}`} style={{ letterSpacing: "0.01em" }}>
          <Image 
            src="/images/Avis.png?v=9" 
            alt="Avis" 
            width={16} 
            height={16} 
            className={iconClass} 
            unoptimized 
          />
          <span className={label}>Avis</span>
        </Link>
        <Link href="/boost" className={`${base} ${currentPage === "boost" ? active : inactive}`} style={{ letterSpacing: "0.01em" }}>
          <Image src="/images/Boost.png" alt="Boost" width={16} height={16} className={iconClass} unoptimized />
          <span className={label}>Boost</span>
        </Link>
      </div>
    </div>
  );
}

