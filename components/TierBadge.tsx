interface TierBadgeProps {
  tier: "Bronze" | "Argent" | "Or" | "Diamant" | "Champion";
  size?: "sm" | "md" | "lg";
  className?: string;
}

export default function TierBadge({ tier, size = "md", className = "" }: TierBadgeProps) {
  const sizeClasses = {
    sm: "px-2.5 py-0.5 text-[10px]",
    md: "px-3 py-1 text-xs",
    lg: "px-4 py-1.5 text-sm",
  };

  const tierConfig = {
    Bronze: {
      bg: "bg-orange-500/10",
      border: "border-orange-500/40",
      text: "text-orange-400",
      glow: "shadow-[0_0_10px_rgba(249,115,22,0.1)]",
    },
    Argent: {
      bg: "bg-slate-500/10",
      border: "border-slate-400/40",
      text: "text-slate-300",
      glow: "shadow-[0_0_10px_rgba(148,163,184,0.1)]",
    },
    Or: {
      bg: "bg-yellow-500/10",
      border: "border-yellow-500/40",
      text: "text-yellow-400",
      glow: "shadow-[0_0_10px_rgba(234,179,8,0.1)]",
    },
    Diamant: {
      bg: "bg-cyan-500/10",
      border: "border-cyan-500/40",
      text: "text-cyan-400",
      glow: "shadow-[0_0_10px_rgba(6,182,212,0.1)]",
    },
    Champion: {
      bg: "bg-purple-500/10",
      border: "border-purple-500/40",
      text: "text-purple-400",
      glow: "shadow-[0_0_10px_rgba(168,85,247,0.1)]",
    },
  };

  const config = tierConfig[tier];

  return (
    <span
      className={`inline-flex items-center justify-center font-bold tracking-wider uppercase rounded-lg border backdrop-blur-sm transition-all duration-300 ${sizeClasses[size]} ${config.bg} ${config.border} ${config.text} ${config.glow} ${className}`}
    >
      {tier}
    </span>
  );
}
