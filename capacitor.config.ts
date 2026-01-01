import type { CapacitorConfig } from '@capacitor/cli';


const config: CapacitorConfig = {
  appId: 'eu.padelxp.player',
  appName: 'PadelXP',
  webDir: 'public',
  server: {
    url: 'https://padelxp.eu',
    cleartext: true,
    allowNavigation: ['padelxp.eu']
  },
  appendUserAgent: 'PadelXPCapacitor',
  ios: {
    contentInset: 'always'
  }
};


export default config;
