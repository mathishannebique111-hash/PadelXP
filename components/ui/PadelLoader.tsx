"use client";

import React from 'react';

interface PadelLoaderProps {
  text?: string;
  className?: string;
}

export default function PadelLoader({ text, className = "" }: PadelLoaderProps) {
  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div
        className="flex items-center justify-center text-4xl mb-2"
        style={{ animation: "bounce 1s ease-in-out infinite" }}
      >
        🎾
      </div>
      {text && (
        <p className="text-sm font-medium text-gray-500 animate-pulse">{text}</p>
      )}
      <style jsx>{`
        @keyframes bounce {
          0%, 100% {
            transform: translateY(-25%);
            animation-timing-function: cubic-bezier(0.8, 0, 1, 1);
          }
          50% {
            transform: translateY(0);
            animation-timing-function: cubic-bezier(0, 0, 0.2, 1);
          }
        }
      `}</style>
    </div>
  );
}
