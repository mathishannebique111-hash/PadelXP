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
        className="flex items-center justify-center mb-2 text-padel-green"
        style={{ animation: "bounce 1s ease-in-out infinite" }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M6 5a10 10 0 0 0 0 14" />
          <path d="M18 5a10 10 0 0 1 0 14" />
        </svg>
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
