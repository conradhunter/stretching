// Lazy + guarded: the native ExpoAudio module only exists in dev-client /
// standalone builds that were rebuilt after expo-audio was added. If it's not
// present (old dev client), we no-op so the app stays usable and quiet.
// Drop the real chime into assets/sounds/chime.mp3 to replace the silent placeholder.
type Player = { seekTo: (s: number) => unknown; play: () => unknown };

let player: Player | null = null;
let tried = false;

function getPlayer(): Player | null {
  if (tried) return player;
  tried = true;
  try {
    // Probe before importing expo-audio so its top-level `requireNativeModule`
    // doesn't log a red-box error when the native side is missing.
    const { NativeModules } = require('react-native') as typeof import('react-native');
    if (!NativeModules.ExpoAudio) {
      console.warn('[chime] ExpoAudio native module missing — rebuild the dev client');
      return (player = null);
    }

    const { createAudioPlayer } = require('expo-audio') as typeof import('expo-audio');
    player = createAudioPlayer(require('../../assets/sounds/chime.mp3')) as Player;
  } catch (err) {
    console.warn('[chime] failed to init audio player:', err);
    player = null;
  }
  return player;
}

export function playChime(): void {
  const p = getPlayer();
  if (!p) return;
  try {
    p.seekTo(0);
    p.play();
  } catch {
    // Ignore playback failures — chimes are non-essential.
  }
}
