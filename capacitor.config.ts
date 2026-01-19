import type { CapacitorConfig } from '@capacitor/cli';


const config: CapacitorConfig = {
  appId: 'eu.padelxp.player',
  appName: 'PadelXP',
  webDir: 'public',
  server: {
    url: 'https://padelxp.eu',
    cleartext: false,
    allowNavigation: ['padelxp.eu', '*.padelxp.eu']
  },
  appendUserAgent: 'PadelXPCapacitor',
  ios: {
    contentInset: 'always',
    backgroundColor: '#172554'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: true,
      backgroundColor: "#172554",
      showSpinner: false,
      androidScaleType: "CENTER_CROP",
      splashFullScreen: true,
      splashImmersive: true,
    },
  },
};


export default config;
