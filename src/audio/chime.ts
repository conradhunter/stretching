// Lazy + guarded: the native ExpoAudio module only exists in dev-client /
// standalone builds rebuilt after expo-audio was added. We probe with
// requireOptionalNativeModule (returns null instead of throwing/red-boxing) so
// an old dev client just stays silent instead of crashing.
// Drop the real chime into assets/sounds/chime.mp3 to replace the placeholder.
type Player = { seekTo: (s: number) => unknown; play: () => unknown };

let player: Player | null = null;
let tried = false;

function getPlayer(): Player | null {
  if (tried) return player;
  tried = true;
  try {
    const { requireOptionalNativeModule } =
      require('expo-modules-core') as typeof import('expo-modules-core');
    if (!requireOptionalNativeModule('ExpoAudio')) {
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
