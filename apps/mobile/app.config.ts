import type { ExpoConfig } from 'expo/config';
import { withAndroidManifest, withEntitlementsPlist, type ConfigPlugin } from 'expo/config-plugins';

// The product name is not decided yet. Everything that shows or encodes it derives from these two lines.
export const APP_NAME = 'Gitsawe';
export const APP_SLUG = 'gitsawe';

// Reminders are local notifications only. The expo-notifications plugin still adds the push entitlement,
// which a free personal Apple team cannot sign. Mods run last-registered first, so applying this one
// here, before the plugins array is resolved, makes it run after expo-notifications.
const withoutPush: ConfigPlugin = c => withEntitlementsPlist(c, c => { delete c.modResults['aps-environment']; return c; });

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
    'expo-notifications',
    ['expo-splash-screen', { image: './assets/splash-icon.png', imageWidth: 160, resizeMode: 'contain', backgroundColor: '#f7f7f8', dark: { backgroundColor: '#0a0a0a' } }],
  ],
  experiments: { typedRoutes: true },
};

// Android release builds refuse plain http. Allow it only when the build is pointed at a LAN dev API,
// so a test APK can talk to the laptop while store builds keep the default.
const withLanCleartext: ConfigPlugin = c => withAndroidManifest(c, c => {
  const application = c.modResults.manifest.application?.[0];
  if (application && (process.env.EXPO_PUBLIC_API_URL ?? '').startsWith('http:')) application.$['android:usesCleartextTraffic'] = 'true';
  return c;
});

export default withLanCleartext(withoutPush(config));
