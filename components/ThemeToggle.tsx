"use client";

import { Sun, Moon } from 'lucide-react';
import { useThemePersistence } from '@/lib/hooks/useThemePersistence';

interface ThemeToggleProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Composant bouton pour basculer entre dark et light mode
 * Affiche une icône Soleil (light) ou Lune (dark) selon le thème actif
 */
export default function ThemeToggle({ className = '', size = 'md' }: ThemeToggleProps) {
  const { theme, toggleTheme, isLoading } = useThemePersistence();

  if (isLoading) {
    return (
      <button
        className={`p-2 rounded-lg hover:bg-white/10 transition-colors ${className}`}
        disabled
        aria-label="Chargement du thème"
      >
        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </button>
    );
  }

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  return (
    <button
      onClick={toggleTheme}
      className={`
        relative p-2 rounded-lg 
        bg-theme-secondary/50 hover:bg-theme-secondary 
        border border-theme-border-light
        transition-all duration-200
        focus:outline-none focus:ring-2 focus:ring-theme-accent focus:ring-offset-2
        ${className}
      `}
      aria-label={theme === 'dark' ? 'Activer le mode clair' : 'Activer le mode sombre'}
      title={theme === 'dark' ? 'Mode clair' : 'Mode sombre'}
    >
      <div className="relative">
        {/* Icône Lune (dark mode) */}
        <Moon
          className={`
            ${sizeClasses[size]} 
            text-theme-text
            transition-all duration-300
            ${theme === 'dark' ? 'opacity-100 rotate-0' : 'opacity-0 rotate-90 absolute'}
          `}
        />
        {/* Icône Soleil (light mode) */}
        <Sun
          className={`
            ${sizeClasses[size]} 
            text-theme-text
            transition-all duration-300
            ${theme === 'light' ? 'opacity-100 rotate-0' : 'opacity-0 -rotate-90 absolute'}
          `}
        />
      </div>
    </button>
  );
}
