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
  // Style avec fond gris blanc et padding réduit
  const cardStyle: React.CSSProperties = {
    background: "rgba(255, 255, 255, 0.05)",
    borderColor: "rgba(255, 255, 255, 0.1)",
    backdropFilter: "blur(4px)",
    WebkitBackdropFilter: "blur(4px)",
  };

  return (
    <div className={(className ? className + " " : "") + "mb-4 sm:mb-5 md:mb-6"}>
      <section
        className="relative overflow-hidden rounded-xl border inline-block text-white"
        style={cardStyle}
      >
        <div className="relative z-10 flex items-center">
          <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-2.5">
            {/* Barre verticale à gauche */}
            <span 
              className="w-1 sm:w-1.5 self-stretch rounded-full flex-shrink-0" 
              style={{
                background: 'linear-gradient(to bottom, rgba(255, 255, 255, 0.8), rgba(255, 255, 255, 0.3))'
              }}
              aria-hidden="true" 
            />
            {/* Titre avec icône optionnelle */}
            <div className="flex items-center gap-2 sm:gap-3">
              {icon ? <span className="text-lg sm:text-xl md:text-2xl flex-shrink-0" aria-hidden="true">{icon}</span> : null}
              <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-extrabold tracking-tight text-white leading-tight">
                {title}
              </h1>
            </div>
          </div>
        </div>
      </section>
      {subtitle ? (
        <p className="mt-2 sm:mt-3 ml-1 sm:ml-2 text-xs sm:text-sm text-white/60">{subtitle}</p>
      ) : null}
    </div>
  );
}

