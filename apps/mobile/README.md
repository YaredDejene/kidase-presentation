# Mobile app (working name Gitsawe)

Daily Gitsawe readings for iOS and Android, built with Expo. The design source of truth is the mock in
`.claude/plans/Gitsawe · Daily readings-png/`; the plan is `.claude/plans/gitsawe-mobile-app.html`.

The product name is undecided. `app.config.ts` holds it in `APP_NAME` and `APP_SLUG`; nothing else encodes it.

## Run it

```sh
# from the repo root, once
pnpm install

# an API with real data and no MongoDB (seeds an in-memory Mongo from a desktop backup)
pnpm --filter api dev:memory /path/to/kidase-backup.kidase

# the app, pointed at that API (Android emulator reaches the host at 10.0.2.2)
cd apps/mobile
EXPO_PUBLIC_API_URL=http://10.0.2.2:3001/api/v1 pnpm start
```

Without `EXPO_PUBLIC_API_URL` the app talks to `https://kidase.org/api/v1`.

- `pnpm typecheck`, `pnpm test` (pure modules: dates, grids, holidays, reference text) run in CI with the rest of the workspace.
- `npx expo-doctor` checks the dependency set against the SDK.

## Builds

```sh
npx eas build --profile preview --platform android   # installable APK for testers
npx eas build --profile production                    # store builds
```

Profiles live in `eas.json`. Set the final name, bundle ids and icons in `app.config.ts` before the first production build.

## Layout

- `src/app` routes: `(tabs)` with Today, Calendar and a Settings stack, plus the `reader` modal and `onboarding`.
- `src/lib` pure logic: Ethiopian dates, month grids, holidays, the month-per-file readings cache, the reminder scheduler.
- `src/components` the pieces named in the component sheet.
- `src/i18n.ts` English, Amharic and Tigrinya strings; `src/theme.ts` the colour and type tokens.
