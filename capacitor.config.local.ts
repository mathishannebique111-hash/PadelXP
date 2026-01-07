import type { CapacitorConfig } from '@capacitor/cli';

// Configuration pour développement local
// Utiliser cette config en commentant la section server dans capacitor.config.ts
// et en renommant ce fichier en capacitor.config.ts

const config: CapacitorConfig = {
  appId: 'eu.padelxp.player',
  appName: 'PadelXP',
  webDir: 'public',
  server: {
    url: 'http://localhost:3000', // Serveur Next.js local
    cleartext: true,
    allowNavigation: ['localhost', '127.0.0.1']
  },
  appendUserAgent: 'PadelXPCapacitor',
  ios: {
    contentInset: 'always'
  }
};

export default config;

const config: CapacitorConfig = {
    // ...
    plugins: {
      SplashScreen: {
        backgroundColor: "#172554", // Code couleur Hex (Noir ici)
        showSpinner: false,        // Enlève le rond de chargement moche
      },
    },
  };
  


