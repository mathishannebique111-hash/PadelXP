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
        className="flex items-center justify-center mb-2"
        style={{ animation: "bounce 1s ease-in-out infinite" }}
      >
        {/* Tennis Ball Icon */}
        <svg
          width="48"
          height="48"
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Main yellow body */}
          <circle cx="24" cy="24" r="22" fill="#DFFF00" stroke="#CCEB00" strokeWidth="2" />

          {/* Curved white lines imitating a tennis ball seam */}
          <path
            d="M12 24C12 30.6274 17.3726 36 24 36"
            stroke="white"
            strokeWidth="3"
            strokeLinecap="round"
            className="opacity-80"
          />
          <path
            d="M36 24C36 17.3726 30.6274 12 24 12"
            stroke="white"
            strokeWidth="3"
            strokeLinecap="round"
            className="opacity-80"
          />
          <path
            d="M4 24C4 12.9543 12.9543 4 24 4"
            stroke="white"
            strokeWidth="3"
            strokeLinecap="round"
            className="opacity-80"
            strokeDasharray="4 4"
          />
          <path
            d="M44 24C44 35.0457 35.0457 44 24 44"
            stroke="white"
            strokeWidth="3"
            strokeLinecap="round"
            className="opacity-80"
            strokeDasharray="4 4"
          />
        </svg>
      </div>
      {text && (
        <p className="text-sm font-medium text-gray-500 animate-pulse">{text}</p>
      )}
      <style jsx>{`
        @keyframes bounce {
          0%, 100% {
            transform: translateY(-25%) rotate(0deg);
            animation-timing-function: cubic-bezier(0.8, 0, 1, 1);
          }
          50% {
            transform: translateY(0) rotate(180deg);
            animation-timing-function: cubic-bezier(0, 0, 0.2, 1);
          }
        }
      `}</style>
    </div >
  );
}
