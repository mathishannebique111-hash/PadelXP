"use client";

import React from "react";

export default function PageTitle({
  title,
  subtitle,
  icon,
  className,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={(className ? className + " " : "") + "mb-4 sm:mb-5 md:mb-6"}>
      <div className="flex items-stretch gap-2 sm:gap-3">
        <span className="w-1 sm:w-1.5 self-stretch rounded-full bg-gradient-to-b from-white/80 to-white/30" aria-hidden />
        <span className="inline-flex items-center gap-1.5 sm:gap-2 rounded-lg sm:rounded-xl border border-white/10 bg-white/5 px-2 sm:px-3 py-1 sm:py-1.5 backdrop-blur-sm">
          {icon ? <span className="text-base sm:text-lg md:text-xl" aria-hidden>{icon}</span> : null}
          <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
            {title}
          </h1>
        </span>
      </div>
      {subtitle ? (
        <p className="mt-1.5 sm:mt-2 ml-4 sm:ml-5 text-xs sm:text-sm text-white/60">{subtitle}</p>
      ) : null}
    </div>
  );
}
