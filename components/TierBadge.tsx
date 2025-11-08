interface TierBadgeProps {
  tier: "Bronze" | "Argent" | "Or" | "Diamant" | "Champion";
  size?: "sm" | "md" | "lg";
  className?: string;
}

export default function TierBadge({ tier, size = "md", className = "" }: TierBadgeProps) {
  const sizeClasses = {
    sm: "px-3 py-0.5 text-xs",
    md: "px-4 py-1 text-xs",
    lg: "px-5 py-1.5 text-sm",
  };

  const tierConfig = {
    Bronze: {
      gradient: "from-orange-500 via-orange-400 to-orange-600",
      border: "border-orange-400/50",
      glow: "shadow-[0_0_15px_rgba(249,115,22,0.4)]",
      bgPattern: "bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.3),transparent_50%)]",
    },
    Argent: {
      gradient: "from-gray-300 via-gray-200 to-gray-400",
      border: "border-gray-400/50",
      glow: "shadow-[0_0_15px_rgba(156,163,175,0.4)]",
      bgPattern: "bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.5),transparent_50%)]",
    },
    Or: {
      gradient: "from-yellow-400 via-amber-300 to-yellow-500",
      border: "border-yellow-400/50",
      glow: "shadow-[0_0_20px_rgba(234,179,8,0.5)]",
      bgPattern: "bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.6),transparent_50%)]",
    },
    Diamant: {
      gradient: "from-cyan-400 via-blue-400 to-cyan-500",
      border: "border-cyan-400/50",
      glow: "shadow-[0_0_25px_rgba(34,211,238,0.6)]",
      bgPattern: "bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.7),transparent_50%)]",
    },
    Champion: {
      gradient: "from-purple-500 via-pink-500 to-purple-600",
      border: "border-purple-400/50",
      glow: "shadow-[0_0_30px_rgba(168,85,247,0.7)]",
      bgPattern: "bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.8),transparent_50%)]",
    },
  };

  const shadowColors = {
    Bronze: "rgba(249,115,22,0.4)",
    Argent: "rgba(156,163,175,0.4)",
    Or: "rgba(234,179,8,0.5)",
    Diamant: "rgba(34,211,238,0.6)",
    Champion: "rgba(168,85,247,0.7)",
  };

  const config = tierConfig[tier];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-bold text-white border-2 backdrop-blur-sm relative overflow-hidden transition-all duration-300 hover:scale-105 ${sizeClasses[size]} bg-gradient-to-r ${config.gradient} border ${config.border} ${config.glow} ${className}`}
      style={{
        textShadow: "0 2px 4px rgba(0,0,0,0.5), 0 0 12px rgba(255,255,255,0.4), 0 1px 2px rgba(0,0,0,0.8)",
        boxShadow: `0 2px 12px ${shadowColors[tier]}, 0 0 0 1px rgba(255,255,255,0.15) inset`,
      }}
    >
      <div className={`absolute inset-0 ${config.bgPattern} opacity-70`} />
      <div className="absolute inset-[2px] rounded-full border border-white/30" />
      <span className="relative z-10 drop-shadow-2xl tracking-wide" style={{ textShadow: "0 2px 6px rgba(0,0,0,0.6), 0 0 10px rgba(255,255,255,0.5)" }}>{tier}</span>
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full animate-shimmer pointer-events-none" />
      <div className="absolute top-1 right-3 w-1 h-1 bg-white/60 rounded-full blur-[1px]" />
      <div className="absolute bottom-1 left-3 w-1 h-1 bg-white/40 rounded-full blur-[1px]" />
    </span>
  );
}
