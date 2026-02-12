"use client";

import React from 'react';
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface PadelLoaderProps {
  text?: string;
  className?: string;
}

export default function PadelLoader({ text, className = "" }: PadelLoaderProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3", className)}>
      <div className="relative flex items-center justify-center">
        {/* Outer subtle ring */}
        <div className="absolute inset-0 rounded-full border-2 border-slate-700/30" />

        {/* Spinning gradient ring or simple lucide loader for elegance */}
        <Loader2
          className="h-8 w-8 animate-spin text-blue-600"
          strokeWidth={2.5}
        />
      </div>

      {text && (
        <p className="text-xs font-medium text-slate-400 animate-pulse tracking-wide uppercase">
          {text}
        </p>
      )}
    </div>
  );
}
