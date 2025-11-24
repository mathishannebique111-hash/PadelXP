import Link from "next/link";
import BadgeIcon from "../icons/BadgeIcon";
import BadgeIconDisplay from "../BadgeIconDisplay";
import Image from "next/image";

type NavKey = "home" | "match" | "history" | "badges" | "club" | "challenges" | "reviews";

export default function NavigationBar({ currentPage }: { currentPage?: NavKey }) {
  const base = "inline-flex items-center justify-between rounded-xl px-5 py-2.5 text-sm font-semibold transition-all backdrop-blur border";
  const inactive = "bg-white/10 text-white/90 hover:bg-white/20 border-white/10 hover:border-white/20 hover:translate-y-[-1px]";
  const active = "bg-blue-600 text-white border-blue-500 shadow-[0_6px_24px_rgba(37,99,235,0.35)]";
  const label = "tracking-wide";
  const icon = "ml-2 text-base opacity-90";
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b pb-4" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/home" className={`${base} ${currentPage === "home" ? active : inactive}`} style={{ letterSpacing: "0.01em" }}>
          <span className={label}>Profil</span>
          <span className={icon}>👤</span>
        </Link>
        <Link href="/match/new" className={`${base} ${currentPage === "match" ? active : inactive}`} style={{ letterSpacing: "0.01em" }}>
          <span className={label}>Enregistrer un match</span>
          <BadgeIconDisplay icon="🎾" size={18} className={icon} />
        </Link>
        <Link href="/matches/history" className={`${base} ${currentPage === "history" ? active : inactive}`} style={{ letterSpacing: "0.01em" }}>
          <span className={label}>Historique des matchs</span>
          <span className={icon}>📊</span>
        </Link>
        <Link href="/badges" className={`${base} ${currentPage === "badges" ? active : inactive}`} style={{ letterSpacing: "0.01em" }}>
          <span className={label}>Badges</span>
          <BadgeIcon size={18} className="ml-2 opacity-90" />
        </Link>
        <Link href="/club" className={`${base} ${currentPage === "club" ? active : inactive}`} style={{ letterSpacing: "0.01em" }}>
          <span className={label}>Club</span>
          <span className={icon}>🏢</span>
        </Link>
        <Link href="/challenges" className={`${base} ${currentPage === "challenges" ? active : inactive}`} style={{ letterSpacing: "0.01em" }}>
          <span className={label}>Challenges</span>
          <Image
            src="/images/Trophée page badges.png"
            alt="Challenges"
            width={18}
            height={18}
            className={`${icon} w-[18px] h-[18px] object-contain flex-shrink-0`}
            unoptimized
          />
        </Link>
        <Link href="/reviews" className={`${base} ${currentPage === "reviews" ? active : inactive}`} style={{ letterSpacing: "0.01em" }}>
          <span className={label}>Avis</span>
          <Image
            src="/images/Étoile points challenges.png"
            alt="Étoile"
            width={16}
            height={16}
            className={`${icon} object-contain`}
          />
        </Link>
      </div>
    </div>
  );
}
