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
      gradient: "", // Overridden by style
      style: { background: 'linear-gradient(to bottom, #ffffff, #ffe8a1, #ffdd44)' },
      border: "border-yellow-400/50",
      glow: "shadow-[0_0_20px_rgba(234,179,8,0.5)]",
      shadowColor: "0 4px 20px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04), inset 0 0 120px rgba(255, 215, 0, 0.35), inset 0 2px 4px rgba(255,255,255,0.6)",
      textColor: "text-amber-900",
    },
    2: {
      gradient: "", // Overridden by style
      style: { background: 'linear-gradient(to bottom, #ffffff, #d8d8d8, #b8b8b8)' },
      border: "border-gray-400/50",
      glow: "shadow-[0_0_15px_rgba(156,163,175,0.4)]",
      shadowColor: "0 4px 20px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04), inset 0 0 120px rgba(192, 192, 192, 0.32), inset 0 2px 4px rgba(255,255,255,0.5)",
      textColor: "text-slate-900",
    },
    3: {
      gradient: "", // Overridden by style
      style: { background: 'linear-gradient(to bottom, #ffffff, #ffd8b3, #ffc085)' },
      border: "border-orange-400/50",
      glow: "shadow-[0_0_15px_rgba(249,115,22,0.4)]",
      shadowColor: "0 4px 20px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04), inset 0 0 120px rgba(205, 127, 50, 0.32), inset 0 2px 4px rgba(255,255,255,0.5)",
      textColor: "text-orange-900",
    },
    default: {
      gradient: "bg-gradient-to-r from-[#1A3A6E] via-[#1E4280] to-[#1A3A6E]",
      style: {},
      border: "border-blue-500/50",
      glow: "shadow-[0_0_15px_rgba(26,58,110,0.7)]",
      shadowColor: "0 2px 12px rgba(26,58,110,0.7), 0 0 0 1px rgba(255,255,255,0.15) inset",
      textColor: "text-white",
    },
  };

  const config = rank === 1 ? rankConfig[1] : rank === 2 ? rankConfig[2] : rank === 3 ? rankConfig[3] : rankConfig.default;

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full font-bold border-2 backdrop-blur-sm relative overflow-hidden transition-all duration-300 hover:scale-105 ${sizeClasses[size]} ${config.gradient} ${config.border} ${config.glow} ${config.textColor} ${className}`}
      style={{
        ...config.style,
        textShadow: rank <= 3 ? "none" : "0 2px 6px rgba(0,0,0,0.6), 0 0 10px rgba(255,255,255,0.5)",
        boxShadow: config.shadowColor,
      }}
    >
      <div className="absolute inset-[2px] rounded-full border border-white/30" />
      <span className="relative z-10 drop-shadow-sm font-extrabold tracking-wide">#{rank}</span>
      {rank > 3 && (
        <div className="absolute top-1 right-4 w-1 h-1 bg-white/60 rounded-full blur-[1px]" />
      )}
    </span>
  );
}

