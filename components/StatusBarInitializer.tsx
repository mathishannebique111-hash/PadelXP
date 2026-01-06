'use client';

import { useStatusBar } from '@/lib/hooks/useStatusBar';

export function StatusBarInitializer() {
  useStatusBar();
  return null;
}


