@AGENTS.md

# Stretches — project guide

Personal, single-user stretching-timer app (one user, on their own iPhone). Pick a duration on **Quick** and it counts down hands-free with chime + haptics; **Exercises** paces a set of reps (push-ups / crunches / pull-ups) and counts them per day.

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
```
Expo Go does NOT work (this SDK is newer than public Expo Go) — use a **dev client** build.

## Architecture (where things live)
- `src/timer/engine.ts` — **pure, tick-driven** multi-segment timer (createTimer/tick/skip/pause/resume). No real time inside. Emits `segment-advance` ("switch") and `completed` ("done").
- `src/timer/useTimer.ts` — the **only place real time enters** (one `setInterval`). Drives the engine, exposes pause/resume/skip + an `onEvent` callback (voice/haptics hook in here).
- `src/timer/quick.ts` — pure segment builders for a Quick run (`buildQuickSegments`, `buildQuickPerSideSegments` with a 5s "Switch sides" prep beat) + `formatDuration`.
- `src/exercises/exercises.ts` — **pure** rep-exercise catalog (push-ups / crunches / pull-ups: two phase words, seconds per phase, rep presets) + `buildRepSegments` (5s "Get ready", then one segment per phase per rep), `sessionSeconds`, `repsCompletedAt` / `currentRep`. Pace is deliberately unhurried — the set must leave room to actually finish every rep.
- `src/exercises/log.ts` — **pure** per-day rep counts (`recordReps`/`repsOn`/`dayTotal`). `store.ts` — persists them under `exercises.v1`, its own key — reps are counted, stretching is timed, and the two stores never merge. They meet only at the goal (below).
- `src/tracking/` — daily-goal streak. `streaks.ts` — **pure** day log (`recordSeconds` locks each day's goal — minutes **and** any rep targets — at first session; `updateDayGoal` re-locks the in-progress day when the setting changes; `currentStreak` counts back from yesterday, so **one under-goal yesterday displays 0 with history intact** — check that before suspecting a wipe). **A day is met only when the stretch time AND every locked rep target is hit** (all parts required); days logged before targets existed carry none, so history is judged on time alone. Rep counts come from the exercise store, passed in — `streaks.ts` stays pure and knows nothing about it. `store.ts` — persisted log + goal; single-flight `init` that mutators await (a write must never race the disk load). `today.ts` — `useTodayLocalDate()`, the only midnight-safe way to render "today" (refreshes on AppState active + a just-past-midnight timer).
- `src/components/goal-ring.tsx` — `GoalHeader`, the shared tab header (Quick + Exercises): title + streak ring on the first row, then a row of `Push-ups 20/20 ✓` count pills, one per exercise that has a rep target (none set ⇒ no row). Named in words, not SF Symbols — the movement glyphs are indistinguishable at that size. Tap anything to open the goal sheet (minutes chips + a rep-target number field per exercise); long-press the ring for `/debug`. The ring's **fill is stretch time**, but it only **closes when the whole goal is met** — a finished 15 minutes with push-ups still owed keeps its visible gap, or the ring would repeat the Aug 13 false "done". `src/audio/chime.ts` — segment chime (audio mode set to `mixWithOthers` so it never pauses the user's music).
- `src/app/` — expo-router screens. Tabs: `(tabs)/index.tsx` (**Quick** — index so a cold launch lands on it; bar order Quick / Exercises), `(tabs)/exercises.tsx` (two segmented selectors — exercise, then reps — plus a Start button and today's per-exercise counts). Pushed full-screen: `run.tsx` (Quick timer — `seconds` or `perSide` params), `exercise-run.tsx` (paced set — `id` + `reps`; one big phase word "Down"/"Up" readable from the floor, haptic per phase flip).

## Conventions
- UI via `ThemedText` / `ThemedView` + `Spacing`/`Colors` from `src/constants/theme.ts`. Icons via `expo-symbols` `SymbolView` (SF Symbols; iOS-targeted).
- **TDD** for pure logic (engine, hook, quick segments, exercises, streaks) — see the `*.test.ts(x)` files. Stores (AsyncStorage) and screens are not unit-tested by design.

## Known gotchas
- **Horizontal `ScrollView`s collapse vertically and clip content** (clipped pill descenders) — give them an explicit `height`.
- **Persist at natural boundaries, never only on unmount** — React cleanups don't run on force-quit, and AsyncStorage writes are async. Stretch time is credited per segment-advance/pause/completion in `run.tsx`, and reps per finished rep in `exercise-run.tsx` (unmount is just a catch-all); deferring it to exit silently lost whole sessions.
- **Local iOS builds require Xcode 26.5 / Swift 6.2+** (project is on the iOS 26 generation). EAS cloud builds work regardless; that's how it gets on the phone.
- **Two `tsc` errors are expected**: `global.css` + an `animated-icon.module.css` import in template files — Expo generates their declarations on `expo start`. Anything else is real.

## Distribution & app variants
- **`app.config.ts`** reads `app.json` as its base and switches **bundle ID + name + scheme** by the `APP_VARIANT` env var (set per profile in `eas.json`):
  - `development` → `com.conradhunter.stretching.dev` / "Stretches Dev" / scheme `stretching-dev`.
  - `preview` & `production` → `com.conradhunter.stretching` / "Stretches" / scheme `stretching`.
  - Different bundle IDs ⇒ the dev client and the standalone **coexist** on-device instead of overwriting each other (the bug that prompted this setup).
- Iterate: build the `development` dev client once (`eas build --profile development -p ios`), install "Stretches Dev", then `bun run start:dev` (QR, hot reload). The script sets `APP_VARIANT=development` so the QR's deep-link scheme matches the dev client. (`bunx expo run:ios --device` also works but needs Xcode 26.5.)
- Standalone daily-driver: EAS `preview` profile (internal/ad-hoc, ~1yr). Needs the paid Apple Developer account. See README for the runbook.
- **`ios.buildNumber` auto-increments on preview builds** (`autoIncrement` in eas.json, written back to app.json — commit the bump). Never ship two builds with the same version+buildNumber: iOS silently keeps the installed binary. Install new builds over the top — deleting the app wipes all AsyncStorage data.

Design decisions & rationale live in this project's Claude memory (`MEMORY.md`).
