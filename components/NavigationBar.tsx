import Link from "next/link";
import Image from "next/image";

type NavKey = "home" | "match" | "challenges" | "reviews" | "boost";

export default function NavigationBar({ currentPage }: { currentPage?: NavKey }) {
  // Styles de base responsive : plus petits sur mobile, normaux sur desktop
  const base = "inline-flex items-center justify-center gap-1.5 sm:gap-2 rounded-lg sm:rounded-xl px-2.5 sm:px-4 md:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold transition-all backdrop-blur border whitespace-nowrap";
  const inactive = "bg-white/10 text-black hover:bg-white/20 border-white/10 hover:border-white/20 hover:translate-y-[-1px]";
  const active = "bg-blue-600 text-white border-blue-500 shadow-[0_6px_24px_rgba(37,99,235,0.35)]";
  const label = "tracking-wide hidden sm:inline"; // Cache le texte sur mobile très petit, visible sur sm+
  const iconClass = "w-3.5 h-3.5 sm:w-4 sm:h-4 object-contain flex-shrink-0";

  const isClub = typeof window !== 'undefined' && !!document.body.dataset.clubSubdomain;

  const clubInactive = "bg-white/10 text-black hover:bg-white/20 border-white/10 hover:border-white/20";
  const finalInactive = isClub ? clubInactive : inactive;

  return (
    <div className="mb-4 sm:mb-6 flex items-center justify-between gap-2 sm:gap-4 border-b pb-3 sm:pb-4 overflow-x-auto scrollbar-hide" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
      <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 min-w-max -mr-4 sm:mr-0">
        <Link href="/home" className={`${base} ${currentPage === "home" ? active : finalInactive}`} style={{ letterSpacing: "0.01em", ...(currentPage === "home" ? (isClub ? { backgroundColor: 'rgb(var(--theme-accent))', borderColor: 'rgb(var(--theme-accent))', color: '#000000' } : { backgroundColor: 'rgb(var(--theme-accent, 37, 99, 235))', borderColor: 'rgb(var(--theme-accent, 59, 130, 246))' }) : (isClub ? { color: '#000000' } : {})) }}>
          <div className={iconClass} style={{ backgroundColor: 'currentColor', WebkitMaskImage: 'url("/images/Profil.png")', WebkitMaskSize: 'contain', WebkitMaskRepeat: 'no-repeat', WebkitMaskPosition: 'center', maskImage: 'url("/images/Profil.png")', maskSize: 'contain', maskRepeat: 'no-repeat', maskPosition: 'center' }} />
          <span className={label}>Profil</span>
        </Link>
        <Link href="/match/new" className={`${base} ${currentPage === "match" ? active : finalInactive}`} style={{ letterSpacing: "0.01em", ...(currentPage === "match" ? (isClub ? { backgroundColor: 'rgb(var(--theme-accent))', borderColor: 'rgb(var(--theme-accent))', color: '#000000' } : { backgroundColor: 'rgb(var(--theme-accent, 37, 99, 235))', borderColor: 'rgb(var(--theme-accent, 59, 130, 246))' }) : (isClub ? { color: '#000000' } : {})) }}>
          <div className={iconClass} style={{ backgroundColor: 'currentColor', WebkitMaskImage: 'url("/images/Enregistrer%20un%20match.png")', WebkitMaskSize: 'contain', WebkitMaskRepeat: 'no-repeat', WebkitMaskPosition: 'center', maskImage: 'url("/images/Enregistrer%20un%20match.png")', maskSize: 'contain', maskRepeat: 'no-repeat', maskPosition: 'center' }} />
          <span className={label}>Enregistrer un match</span>
        </Link>
        <Link href="/challenges" className={`${base} ${currentPage === "challenges" ? active : finalInactive}`} style={{ letterSpacing: "0.01em", ...(currentPage === "challenges" ? (isClub ? { backgroundColor: 'rgb(var(--theme-accent))', borderColor: 'rgb(var(--theme-accent))', color: '#000000' } : { backgroundColor: 'rgb(var(--theme-accent, 37, 99, 235))', borderColor: 'rgb(var(--theme-accent, 59, 130, 246))' }) : (isClub ? { color: '#000000' } : {})) }}>
          <div className={iconClass} style={{ backgroundColor: 'currentColor', WebkitMaskImage: 'url("/images/Objectif%20page%20avis.png?v=9")', WebkitMaskSize: 'contain', WebkitMaskRepeat: 'no-repeat', WebkitMaskPosition: 'center', maskImage: 'url("/images/Objectif%20page%20avis.png?v=9")', maskSize: 'contain', maskRepeat: 'no-repeat', maskPosition: 'center' }} />
          <span className={label}>Challenges</span>
        </Link>
        <Link href="/reviews" className={`${base} ${currentPage === "reviews" ? active : finalInactive}`} style={{ letterSpacing: "0.01em", ...(currentPage === "reviews" ? (isClub ? { backgroundColor: 'rgb(var(--theme-accent))', borderColor: 'rgb(var(--theme-accent))', color: '#000000' } : { backgroundColor: 'rgb(var(--theme-accent, 37, 99, 235))', borderColor: 'rgb(var(--theme-accent, 59, 130, 246))' }) : (isClub ? { color: '#000000' } : {})) }}>
          <div className={iconClass} style={{ backgroundColor: 'currentColor', WebkitMaskImage: 'url("/images/Avis.png?v=9")', WebkitMaskSize: 'contain', WebkitMaskRepeat: 'no-repeat', WebkitMaskPosition: 'center', maskImage: 'url("/images/Avis.png?v=9")', maskSize: 'contain', maskRepeat: 'no-repeat', maskPosition: 'center' }} />
          <span className={label}>Avis</span>
        </Link>
        <Link href="/boost" className={`${base} ${currentPage === "boost" ? active : finalInactive}`} style={{ letterSpacing: "0.01em", ...(currentPage === "boost" ? (isClub ? { backgroundColor: 'rgb(var(--theme-accent))', borderColor: 'rgb(var(--theme-accent))', color: '#000000' } : { backgroundColor: 'rgb(var(--theme-accent, 37, 99, 235))', borderColor: 'rgb(var(--theme-accent, 59, 130, 246))' }) : (isClub ? { color: '#000000' } : {})) }}>
          <div className={iconClass} style={{ backgroundColor: 'currentColor', WebkitMaskImage: 'url("/images/Boost.png")', WebkitMaskSize: 'contain', WebkitMaskRepeat: 'no-repeat', WebkitMaskPosition: 'center', maskImage: 'url("/images/Boost.png")', maskSize: 'contain', maskRepeat: 'no-repeat', maskPosition: 'center' }} />
          <span className={label}>Boost</span>
        </Link>
      </div>
    </div>
  );
}

