import type { ExpoConfig } from 'expo/config';

// The product name is not decided yet. Everything that shows or encodes it derives from these two lines.
export const APP_NAME = 'Gitsawe';
export const APP_SLUG = 'gitsawe';

const config: ExpoConfig = {
  name: APP_NAME,
  slug: APP_SLUG,
  scheme: APP_SLUG,
  version: '0.1.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  ios: {
    bundleIdentifier: `org.kidase.${APP_SLUG}`,
    supportsTablet: false,
  },
  android: {
    package: `org.kidase.${APP_SLUG}`,
    adaptiveIcon: {
      backgroundColor: '#8A2232',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  plugins: [
    'expo-router',
    'expo-font',
    'expo-localization',
    ['expo-splash-screen', { image: './assets/splash-icon.png', imageWidth: 160, resizeMode: 'contain', backgroundColor: '#f7f7f8', dark: { backgroundColor: '#0a0a0a' } }],
  ],
  experiments: { typedRoutes: true },
};

export default config;
