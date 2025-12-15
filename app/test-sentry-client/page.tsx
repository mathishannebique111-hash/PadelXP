'use client';

import * as Sentry from '@sentry/nextjs';

export default function TestSentryClient() {
  const triggerError = () => {
    throw new Error('🎥 Test Sentry Client - Replay + Source Maps');
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl mb-4">Test Sentry Client-Side</h1>
      <button 
        onClick={triggerError}
        className="bg-red-500 text-white px-4 py-2 rounded"
      >
        Déclencher une erreur client
      </button>
    </div>
  );
}
