"use client";

import { useEffect, useState } from "react";

interface SeasonCountdownProps {
  endDate: string;
  seasonName: string;
}

function getTimeLeft(endDate: string) {
  const end = new Date(endDate + "T23:59:59").getTime();
  const now = Date.now();
  const diff = end - now;

  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };

  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
    expired: false,
  };
}

export default function SeasonCountdown({ endDate, seasonName }: SeasonCountdownProps) {
  const [timeLeft, setTimeLeft] = useState(getTimeLeft(endDate));

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(getTimeLeft(endDate));
    }, 1000);
    return () => clearInterval(interval);
  }, [endDate]);

  if (timeLeft.expired) {
    return (
      <p className="text-sm text-white/40 mt-2">Saison terminée</p>
    );
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <p className="text-xs font-semibold uppercase tracking-widest text-white/40">
        {seasonName} — Temps restant
      </p>
      <div className="flex items-center gap-2 sm:gap-3">
        <TimeBlock value={timeLeft.days} label="j" />
        <span className="text-white/20 text-lg font-light">:</span>
        <TimeBlock value={timeLeft.hours} label="h" />
        <span className="text-white/20 text-lg font-light">:</span>
        <TimeBlock value={timeLeft.minutes} label="m" />
        <span className="text-white/20 text-lg font-light">:</span>
        <TimeBlock value={timeLeft.seconds} label="s" />
      </div>
    </div>
  );
}

function TimeBlock({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-xl sm:text-2xl font-bold tabular-nums text-white">
        {String(value).padStart(2, "0")}
      </span>
      <span className="text-[10px] text-white/30 uppercase">{label}</span>
    </div>
  );
}
