interface RankBadgeProps {
  rank: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export default function RankBadge({ rank, size = "md", className = "" }: RankBadgeProps) {
  const sizeClasses = {
    sm: "h-8 w-8 text-xs",
    md: "h-9 w-9 text-sm",
    lg: "h-10 w-10 text-base",
  };

  const rankConfig = {
    1: {
      gradient: "from-yellow-400 via-amber-300 to-yellow-500",
      border: "border-yellow-400/50",
      glow: "shadow-[0_0_20px_rgba(234,179,8,0.5)]",
      bgPattern: "bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.6),transparent_50%)]",
      shadowColor: "rgba(234,179,8,0.5)",
    },
    2: {
      gradient: "from-gray-300 via-gray-200 to-gray-400",
      border: "border-gray-400/50",
      glow: "shadow-[0_0_15px_rgba(156,163,175,0.4)]",
      bgPattern: "bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.5),transparent_50%)]",
      shadowColor: "rgba(156,163,175,0.4)",
    },
    3: {
      gradient: "from-orange-500 via-orange-400 to-orange-600",
      border: "border-orange-400/50",
      glow: "shadow-[0_0_15px_rgba(249,115,22,0.4)]",
      bgPattern: "bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.3),transparent_50%)]",
      shadowColor: "rgba(249,115,22,0.4)",
    },
    default: {
      gradient: "from-gray-900 via-gray-800 to-black",
      border: "border-gray-700/50",
      glow: "shadow-[0_0_15px_rgba(0,0,0,0.5)]",
      bgPattern: "bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.2),transparent_50%)]",
      shadowColor: "rgba(0,0,0,0.5)",
    },
  };

  const config = rank === 1 ? rankConfig[1] : rank === 2 ? rankConfig[2] : rank === 3 ? rankConfig[3] : rankConfig.default;

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full font-bold text-white border-2 backdrop-blur-sm relative overflow-hidden transition-all duration-300 hover:scale-105 ${sizeClasses[size]} bg-gradient-to-r ${config.gradient} border ${config.border} ${config.glow} ${className}`}
      style={{
        textShadow: "0 2px 6px rgba(0,0,0,0.6), 0 0 10px rgba(255,255,255,0.5)",
        boxShadow: `0 2px 12px ${config.shadowColor}, 0 0 0 1px rgba(255,255,255,0.15) inset`,
      }}
    >
      <div className={`absolute inset-0 ${config.bgPattern} opacity-70`} />
      <div className="absolute inset-[2px] rounded-full border border-white/30" />
      <span className="relative z-10 drop-shadow-2xl font-extrabold tracking-wide" style={{ textShadow: "0 2px 6px rgba(0,0,0,0.6), 0 0 10px rgba(255,255,255,0.5)" }}>#{rank}</span>
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full animate-shimmer pointer-events-none" />
      <div className="absolute top-1 right-4 w-1 h-1 bg-white/60 rounded-full blur-[1px]" />
      <div className="absolute bottom-1 left-4 w-1 h-1 bg-white/40 rounded-full blur-[1px]" />
    </span>
  );
}

