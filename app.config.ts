import { type ConfigContext, type ExpoConfig } from 'expo/config';

// App variants: the dev client and the standalone build get DIFFERENT bundle IDs
// + schemes so iOS treats them as separate apps and they can coexist on-device.
// APP_VARIANT is set per-profile in eas.json (and via the `start:dev` script).
const VARIANT = process.env.APP_VARIANT ?? 'production';
const IS_DEV = VARIANT === 'development';

const BUNDLE_ID = IS_DEV ? 'com.conradhunter.stretching.dev' : 'com.conradhunter.stretching';
const NAME = IS_DEV ? 'Stretches Dev' : 'Stretches';
const SCHEME = IS_DEV ? 'stretching-dev' : 'stretching';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  // `config` is the parsed app.json (the production defaults); override per variant.
  name: NAME,
  slug: config.slug ?? 'stretching',
  scheme: SCHEME,
  ios: {
    ...config.ios,
    bundleIdentifier: BUNDLE_ID,
  },
  android: {
    ...config.android,
    package: BUNDLE_ID,
  },
});
