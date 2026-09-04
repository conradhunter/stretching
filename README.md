# Stretches

A personal stretching-timer app (Expo / React Native). Pick a duration and it counts
down hands-free with chime + haptic cues.

- **Quick** — a bare hold, once or per side (`src/app/(tabs)/index.tsx`).
- **Timer engine** — pure, tick-driven, multi-segment (`src/timer/`).
- **Exercises** — pick an exercise and a rep count; the set is paced phase by phase
  ("Down" / "Up") and reps are counted per day (`src/exercises/`).
- **Tracking** — daily goal + streak ring (`src/tracking/`). The goal is stretched
  minutes, plus an optional rep target per exercise; with a target set, the day only
  counts once the time **and** every target is hit.

## Develop & iterate

Iteration runs through a **dev client** — Expo Go does **not** work (this SDK is newer
than public Expo Go). The dev client and your standalone app use **different bundle IDs**
("app variants"), so they install side by side without overwriting each other:

| App on the phone | Bundle ID | Built from |
|---|---|---|
| **Stretches Dev** — hot-reload | `com.conradhunter.stretching.dev` | `development` profile |
| **Stretches** — standalone daily driver | `com.conradhunter.stretching` | `preview` profile |

```bash
bun install
bunx eas-cli@latest build --profile development -p ios   # build "Stretches Dev" (once)
#   install it from the printed QR/URL on your iPhone, then:
bun run start:dev      # Metro with APP_VARIANT=development — scan the QR with Stretches Dev
```

Edits hot-reload instantly. `app.config.ts` reads `app.json` as its base and switches
bundle ID / name / scheme by the `APP_VARIANT` env var (set per profile in `eas.json`),
which is why the dev client and standalone don't clobber each other.

```bash
bun test          # run the test suite (engine, hook, quick, exercises, tracking)
bunx tsc --noEmit # typecheck
```

## Install on your iPhone (standalone, via EAS)

This produces a real home-screen app via **internal/ad-hoc distribution** (~1-year
provisioning — no TestFlight 90-day expiry).

> **Requires the paid [Apple Developer Program](https://developer.apple.com/programs/) ($99/yr)** —
> ad-hoc distribution does not work with a free Apple ID. (The dev client above needs it
> too, since both are ad-hoc builds.) Also needs a free [Expo account](https://expo.dev).

### Initial setup (run once)

```bash
bunx eas-cli@latest login                 # log into Expo
bunx eas-cli@latest init                  # link project (writes projectId/owner to app.json — commit it)
bunx eas-cli@latest device:create         # register your iPhone — open the link/QR ON the phone
bunx eas-cli@latest build -p ios --profile preview
#   prompts: Apple login -> let EAS manage credentials -> select your registered device
```

When the cloud build finishes (~10–20 min), open the printed **QR/URL in Safari on
your iPhone** to install. First launch: trust the developer under
*Settings → General → VPN & Device Management*.

### Recurring updates

```bash
# Once, to enable over-the-air updates:
bunx eas-cli@latest update:configure

# JS-only changes (no rebuild) — installed app pulls it on next launch:
bunx eas-cli@latest update --channel preview -m "describe the change"

# Native changes (new modules) or yearly re-provision — rebuild:
bunx eas-cli@latest build -p ios --profile preview
```

## Build profiles (`eas.json`)

Each profile sets `APP_VARIANT` (consumed by `app.config.ts`) to pick its bundle ID / name / scheme:

| Profile | `APP_VARIANT` | Builds |
|---|---|---|
| `development` | `development` | **"Stretches Dev"** (`…stretching.dev`) — dev client for hot-reload; coexists with the standalone |
| `preview` | `preview` | **"Stretches"** (`…stretching`, internal/ad-hoc) — the standalone you install for daily use |
| `production` | `production` | store-ready build (not needed for personal use) |
