@AGENTS.md

# Stretches — project guide

Personal, single-user stretching-timer app (one user, on their own iPhone). Pick a stretch + time, or build a routine; it counts down hands-free with voice + haptics.

## Stack
- **Expo SDK 56, React Native 0.85** (Fabric / new arch, React Compiler enabled), TypeScript, **expo-router** (file-based, typed routes).
- **bun** for everything (install, scripts, tests). Not npm/yarn.
- State that persists: `@react-native-async-storage/async-storage` via small module stores + `useSyncExternalStore`.

## Commands
```bash
bun install
bun test src          # test suite (bun's runner; happy-dom for hook tests)
bunx tsc --noEmit     # typecheck (see "known tsc noise" below)
bun run start:dev              # Metro for the "Stretches Dev" client (sets APP_VARIANT); scan QR
bunx expo run:ios --device     # local build to the physical iPhone (needs Xcode 26.5)
bun run scripts/build-library.ts  # regenerate the stretch library + photos
```
Expo Go does NOT work (this SDK is newer than public Expo Go) — use a **dev client** build.

## Architecture (where things live)
- `src/timer/engine.ts` — **pure, tick-driven** multi-segment timer (createTimer/tick/skip/pause/resume). No real time inside. Emits `segment-advance` ("switch") and `completed` ("done").
- `src/timer/useTimer.ts` — the **only place real time enters** (one `setInterval`). Drives the engine, exposes pause/resume/skip + an `onEvent` callback (voice/haptics hook in here).
- `src/stretches/segments.ts` — `Stretch` / `TimeOption` types + pure `buildSegments`, `optionDuration`, `formatDuration`, `withLeadIn`.
- `src/stretches/library.ts` → imports `library.data.json` — **123 stretches GENERATED** (every `category: "stretching"` entry, unfiltered) from the public-domain [exercises dataset](https://github.com/yuhonas/free-exercise-db) by `scripts/build-library.ts`. Edit content via the script, not by hand. Photos in `assets/stretches/<id>/{0,1}.jpg`.
- `src/stretches/images.ts` — GENERATED static `require` map for photos (Metro needs literal requires).
- `src/stretches/custom.ts` — pure builders for **user-created stretches** (`custom-` ids, no photos/instructions); `customStore.ts` persists them and exposes `useAllStretches()`/`getAllStretches()` (library + customs, name-sorted) — screens/resolve go through these, never the raw library import. Created/edited via `src/app/stretch/new.tsx` (header + on the Stretches tab, or the "Create …" row under a fruitless search; edit/delete via the pencil on a custom's detail screen).
- `src/stretches/muscles.ts` — distinct-muscle list, usage ordering, `filterStretches`. `muscleUsage.ts` — persisted per-muscle tap counts (pills ordered by these).
- `src/routines/routines.ts` — `Routine`/`RoutineItem` + pure `buildRoutineSegments` (10s "Next: …" prep before each stretch), `addItem`/`removeItem`/`moveItem`.
- `src/routines/store.ts` — persisted saved routines. `quickRoutine.ts` — persisted "quick-add" cart.
- `src/app/` — expo-router screens. Tabs: `(tabs)/index.tsx` (Stretches list, search + muscle pills + quick-add), `(tabs)/routines.tsx`. Pushed: `stretch/[id].tsx` (detail), `run.tsx` (timer — modes: `id`+`option` single, `routine`=id, `quick`=1), `quick-routine.tsx`, `routine/[id].tsx` (builder), `routine/add/[id].tsx` (picker).

## Conventions
- UI via `ThemedText` / `ThemedView` + `Spacing`/`Colors` from `src/constants/theme.ts`. Icons via `expo-symbols` `SymbolView` (SF Symbols; iOS-targeted).
- **TDD** for pure logic (engine, hook, segments, muscles, routines) — see the `*.test.ts(x)` files. Stores (AsyncStorage) and screens are not unit-tested by design.

## Known gotchas
- **Horizontal `ScrollView`s collapse vertically and clip content** (clipped pill descenders) — give them an explicit `height`. (See `pillsScroll` in `(tabs)/index.tsx`.)
- **Local iOS builds require Xcode 26.5 / Swift 6.2+** (project is on the iOS 26 generation). EAS cloud builds work regardless; that's how it gets on the phone.
- **Two `tsc` errors are expected**: `global.css` + an `animated-icon.module.css` import in template files — Expo generates their declarations on `expo start`. Anything else is real.

## Distribution & app variants
- **`app.config.ts`** reads `app.json` as its base and switches **bundle ID + name + scheme** by the `APP_VARIANT` env var (set per profile in `eas.json`):
  - `development` → `com.conradhunter.stretching.dev` / "Stretches Dev" / scheme `stretching-dev`.
  - `preview` & `production` → `com.conradhunter.stretching` / "Stretches" / scheme `stretching`.
  - Different bundle IDs ⇒ the dev client and the standalone **coexist** on-device instead of overwriting each other (the bug that prompted this setup).
- Iterate: build the `development` dev client once (`eas build --profile development -p ios`), install "Stretches Dev", then `bun run start:dev` (QR, hot reload). The script sets `APP_VARIANT=development` so the QR's deep-link scheme matches the dev client. (`bunx expo run:ios --device` also works but needs Xcode 26.5.)
- Standalone daily-driver: EAS `preview` profile (internal/ad-hoc, ~1yr). Needs the paid Apple Developer account. See README for the runbook.

Design decisions & rationale live in this project's Claude memory (`MEMORY.md`).
