// Configure your Spotify app credentials and scopes here.
// Replace the empty string below with your Spotify application client ID.
window.SPOTIFY_CLIENT_ID = typeof window.SPOTIFY_CLIENT_ID === 'string' ? window.SPOTIFY_CLIENT_ID : '4e3378722621422db7692c80cc2a0e25';

// Update the scopes if you need additional permissions. The defaults grant read access to private playlists.
window.SPOTIFY_SCOPES = typeof window.SPOTIFY_SCOPES === 'string' && window.SPOTIFY_SCOPES.trim().length > 0
  ? window.SPOTIFY_SCOPES
  : 'playlist-read-private playlist-read-collaborative user-read-email';
