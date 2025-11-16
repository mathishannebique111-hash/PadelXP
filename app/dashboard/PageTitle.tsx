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
    <div className={(className ? className + " " : "") + "mb-6"}>
      <div className="flex items-stretch gap-3">
        <span className="w-1.5 self-stretch rounded-full bg-gradient-to-b from-white/80 to-white/30" aria-hidden />
        <span className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 backdrop-blur-sm">
          {icon ? <span className="text-xl" aria-hidden>{icon}</span> : null}
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            {title}
          </h1>
        </span>
      </div>
      {subtitle ? (
        <p className="mt-2 ml-5 text-sm text-white/60">{subtitle}</p>
      ) : null}
    </div>
  );
}
