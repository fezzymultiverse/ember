// Ember Add-On: Music Control (www/ai_music.js)
// Defines tool schemas and stub handlers for music control.
// Real integration depends on the host app (Prodigy, Android MediaSession, Spotify SDK).
// Each function returns a Promise so the tool dispatcher can await it uniformly.
'use strict';
(() => {

// ---------- tool schema ----------
// Used by ai.js to inject into the system prompt when the add-on is enabled.
const MUSIC_TOOLS = [
  {
    name: 'get_library',
    description: 'Returns the user\'s local music library as a list of tracks.',
    parameters: {}
  },
  {
    name: 'get_current_track',
    description: 'Returns the track currently playing (title, artist, album, progress).',
    parameters: {}
  },
  {
    name: 'control_player',
    description: 'Controls the music player. action: play | pause | next | prev. songId is optional for play.',
    parameters: { action: 'string', songId: 'string?' }
  },
  {
    name: 'search_spotify',
    description: 'Searches Spotify for tracks matching a query. Returns a list of results.',
    parameters: { query: 'string' }
  },
  {
    name: 'play_spotify',
    description: 'Plays a specific Spotify track by its trackId.',
    parameters: { trackId: 'string' }
  },
  {
    name: 'create_playlist',
    description: 'Creates a new playlist with the given name and list of song IDs.',
    parameters: { name: 'string', song_ids: 'string[]' }
  }
];

// ---------- handlers ----------
// Stubs that integrate with whatever media layer is available.
// Replace the body of each with your real Capacitor / Prodigy / Android MediaSession bridge.

async function get_library() {
  try {
    // Hook: window.EmberMedia.getLibrary() if you expose one from the Android side
    if (window.EmberMedia && typeof window.EmberMedia.getLibrary === 'function') {
      return await window.EmberMedia.getLibrary();
    }
    // Fallback: return an empty list so the AI can say "library is empty" gracefully
    return { tracks: [] };
  } catch (e) {
    return { error: e.message || 'Could not read library.' };
  }
}

async function get_current_track() {
  try {
    if (window.EmberMedia && typeof window.EmberMedia.getCurrentTrack === 'function') {
      return await window.EmberMedia.getCurrentTrack();
    }
    return { track: null, playing: false };
  } catch (e) {
    return { error: e.message || 'Could not get current track.' };
  }
}

async function control_player(action, songId) {
  const VALID = ['play', 'pause', 'next', 'prev'];
  if (!VALID.includes(action)) return { error: 'Unknown action: ' + action };
  try {
    if (window.EmberMedia && typeof window.EmberMedia.controlPlayer === 'function') {
      return await window.EmberMedia.controlPlayer({ action, songId: songId || null });
    }
    return { ok: true, simulated: true, action };
  } catch (e) {
    return { error: e.message || 'Player control failed.' };
  }
}

async function search_spotify(query) {
  if (!query || !query.trim()) return { results: [] };
  try {
    if (window.EmberMedia && typeof window.EmberMedia.searchSpotify === 'function') {
      return await window.EmberMedia.searchSpotify({ query });
    }
    // No bridge available — tell the AI so it can inform the user
    return { results: [], note: 'Spotify bridge not connected. Enable it in Ember settings.' };
  } catch (e) {
    return { error: e.message || 'Spotify search failed.' };
  }
}

async function play_spotify(trackId) {
  if (!trackId) return { error: 'trackId is required.' };
  try {
    if (window.EmberMedia && typeof window.EmberMedia.playSpotify === 'function') {
      return await window.EmberMedia.playSpotify({ trackId });
    }
    return { ok: false, note: 'Spotify bridge not connected.' };
  } catch (e) {
    return { error: e.message || 'Spotify playback failed.' };
  }
}

async function create_playlist(name, song_ids) {
  if (!name || !name.trim()) return { error: 'Playlist name is required.' };
  if (!Array.isArray(song_ids) || song_ids.length === 0) return { error: 'song_ids must be a non-empty array.' };
  try {
    if (window.EmberMedia && typeof window.EmberMedia.createPlaylist === 'function') {
      return await window.EmberMedia.createPlaylist({ name: name.trim(), song_ids });
    }
    return { ok: true, simulated: true, name, count: song_ids.length };
  } catch (e) {
    return { error: e.message || 'Could not create playlist.' };
  }
}

// ---------- dispatcher ----------
// Called by ai.js when the AI returns a tool_call block.
async function dispatch(name, args) {
  switch (name) {
    case 'get_library':     return get_library();
    case 'get_current_track': return get_current_track();
    case 'control_player':  return control_player(args.action, args.songId);
    case 'search_spotify':  return search_spotify(args.query);
    case 'play_spotify':    return play_spotify(args.trackId);
    case 'create_playlist': return create_playlist(args.name, args.song_ids);
    default: return { error: 'Unknown music tool: ' + name };
  }
}

window.EmberMusicAddon = { TOOLS: MUSIC_TOOLS, dispatch };
})();
