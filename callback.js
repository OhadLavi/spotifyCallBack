(function () {
  const codeEl = document.getElementById('code-value');
  const stateEl = document.getElementById('state-value');
  const copyButton = document.getElementById('copy-button');
  const tokenStatusEl = document.getElementById('token-status');
  const accountCard = document.getElementById('account-card');
  const accountNameEl = document.getElementById('account-name');
  const accountEmailEl = document.getElementById('account-email');
  const playlistCard = document.getElementById('playlist-card');
  const playlistSelect = document.getElementById('playlist-select');
  const loadTracksButton = document.getElementById('load-tracks');
  const copyTracksButton = document.getElementById('copy-tracks');
  const downloadTracksButton = document.getElementById('download-tracks');
  const tracksContainer = document.getElementById('tracks-container');
  const errorCard = document.getElementById('error-card');
  const errorMessageEl = document.getElementById('error-message');

  if (!codeEl || !stateEl || !copyButton || !tokenStatusEl) {
    return;
  }

  let currentAccessToken = '';
  let currentTracks = [];
  let currentPlaylistName = '';

  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  const state = params.get('state');
  const authError = params.get('error');
  const errorDescription = params.get('error_description');

  if (code) {
    codeEl.textContent = code;
    copyButton.disabled = !navigator.clipboard;
  } else {
    codeEl.textContent = authError ? `Spotify returned an error: ${authError}` : 'No code parameter found.';
    copyButton.disabled = true;
  }

  stateEl.textContent = state ? state : 'No state parameter provided.';

  copyButton.addEventListener('click', async () => {
    if (!code || !navigator.clipboard) {
      return;
    }

    try {
      await navigator.clipboard.writeText(code);
      copyButton.textContent = 'Copied!';
      copyButton.classList.add('success');
      copyButton.classList.remove('error');
      setTimeout(() => {
        copyButton.textContent = 'Copy code to clipboard';
        copyButton.classList.remove('success');
      }, 2500);
    } catch (error) {
      console.error('Clipboard copy failed', error);
      copyButton.textContent = 'Copy failed, copy manually';
      copyButton.classList.add('error');
      copyButton.classList.remove('success');
    }
  });

  if (authError) {
    const message = decodeURIComponent(errorDescription || authError);
    showError(`Spotify returned an error: ${message}`);
    tokenStatusEl.textContent = 'Spotify reported an authorization error. Use the code above to troubleshoot.';
    return;
  }

  const storedState = sessionStorage.getItem('pkce_state');
  if (state && storedState && state !== storedState) {
    showError('The state value did not match the one stored locally. For security, the token exchange was halted.');
    tokenStatusEl.textContent = 'State mismatch detected. Copy the authorization code manually to continue.';
    return;
  }

  const clientId = getClientId();
  const codeVerifier = sessionStorage.getItem('pkce_code_verifier');
  const redirectUri = sessionStorage.getItem('pkce_redirect_uri') || new URL(window.location.href).toString();

  if (!code) {
    tokenStatusEl.textContent = 'No authorization code present. Restart the flow from the landing page.';
    return;
  }

  if (!clientId || !codeVerifier) {
    tokenStatusEl.textContent =
      'Client ID or code verifier missing. Copy the authorization code above and exchange it with your own tooling.';
    return;
  }

  handleTokenFlow(code, clientId, codeVerifier, redirectUri).catch((error) => {
    console.error('Token exchange failed', error);
    const message = error instanceof Error ? error.message : 'Unexpected error during token exchange.';
    showError(message);
    tokenStatusEl.textContent = 'Token exchange failed. You can still use the displayed code manually.';
  });

  async function handleTokenFlow(code, clientId, codeVerifier, redirectUri) {
    tokenStatusEl.textContent = 'Exchanging authorization code for tokens…';

    const tokenData = await exchangeCodeForToken(code, clientId, codeVerifier, redirectUri);
    currentAccessToken = tokenData.access_token;
    sessionStorage.setItem('spotify_access_token', currentAccessToken);
    sessionStorage.setItem('spotify_token_expiry', String(Date.now() + tokenData.expires_in * 1000));

    sessionStorage.removeItem('pkce_code_verifier');
    sessionStorage.removeItem('pkce_state');
    sessionStorage.removeItem('pkce_redirect_uri');

    tokenStatusEl.textContent = 'Fetching your Spotify profile…';

    const profile = await fetchProfile();
    accountNameEl.textContent = profile.display_name || profile.id;
    accountEmailEl.textContent = profile.email ? `Email on file: ${profile.email}` : 'Email scope not granted or unavailable.';
    accountCard.hidden = false;

    tokenStatusEl.textContent = 'Loading your playlists…';

    const playlists = await fetchAllPlaylists();
    populatePlaylistSelect(playlists);

    if (playlists.length === 0) {
      tokenStatusEl.textContent =
        'No playlists were returned for this account. Create one in Spotify and reload the page to extract its tracks.';
    } else {
      tokenStatusEl.textContent = 'Select a playlist to extract its tracks.';
      playlistCard.hidden = false;
    }
  }

  async function exchangeCodeForToken(code, clientId, codeVerifier, redirectUri) {
    const body = new URLSearchParams({
      client_id: clientId,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    });

    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const errorText = await safeReadText(response);
      throw new Error(`Failed to exchange code. Spotify responded with ${response.status}. ${errorText}`);
    }

    return response.json();
  }

  async function fetchProfile() {
    const response = await fetch('https://api.spotify.com/v1/me', {
      headers: {
        Authorization: `Bearer ${currentAccessToken}`,
      },
    });

    if (!response.ok) {
      const errorText = await safeReadText(response);
      throw new Error(`Unable to fetch profile. Spotify responded with ${response.status}. ${errorText}`);
    }

    return response.json();
  }

  async function fetchAllPlaylists() {
    let url = 'https://api.spotify.com/v1/me/playlists?limit=50';
    const items = [];

    while (url) {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${currentAccessToken}`,
        },
      });

      if (!response.ok) {
        const errorText = await safeReadText(response);
        throw new Error(`Unable to fetch playlists. Spotify responded with ${response.status}. ${errorText}`);
      }

      const data = await response.json();
      items.push(...(data.items || []));
      url = data.next;
    }

    return items.sort((a, b) => a.name.localeCompare(b.name));
  }

  async function fetchTracksForPlaylist(playlistId) {
    let url = `https://api.spotify.com/v1/playlists/${encodeURIComponent(playlistId)}/tracks?limit=100`;
    const tracks = [];

    while (url) {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${currentAccessToken}`,
        },
      });

      if (!response.ok) {
        const errorText = await safeReadText(response);
        throw new Error(`Unable to fetch playlist tracks. Spotify responded with ${response.status}. ${errorText}`);
      }

      const data = await response.json();
      for (const item of data.items || []) {
        if (!item || !item.track) {
          continue;
        }
        const track = item.track;
        const artists = Array.isArray(track.artists) ? track.artists.map((artist) => artist.name).join(', ') : 'Unknown artist';
        tracks.push({
          name: track.name || 'Unknown track',
          artists,
          album: track.album ? track.album.name : 'Unknown album',
          addedAt: item.added_at,
          uri: track.uri,
        });
      }

      url = data.next;
    }

    return tracks;
  }

  function populatePlaylistSelect(playlists) {
    playlistSelect.innerHTML = '';

    const placeholderOption = document.createElement('option');
    placeholderOption.value = '';
    placeholderOption.textContent = 'Choose a playlist';
    playlistSelect.appendChild(placeholderOption);

    playlists.forEach((playlist) => {
      const option = document.createElement('option');
      option.value = playlist.id;
      option.textContent = `${playlist.name} (${playlist.tracks.total} tracks)`;
      playlistSelect.appendChild(option);
    });
  }

  if (loadTracksButton) {
    loadTracksButton.addEventListener('click', async () => {
      if (!playlistSelect.value) {
        tokenStatusEl.textContent = 'Please pick a playlist to load its tracks.';
        return;
      }

      if (!currentAccessToken) {
        tokenStatusEl.textContent = 'Access token missing. Restart the flow from the landing page.';
        return;
      }

      loadTracksButton.disabled = true;
      tokenStatusEl.textContent = 'Fetching tracks for the selected playlist…';
      tracksContainer.textContent = '';
      copyTracksButton.disabled = true;
      downloadTracksButton.disabled = true;

      try {
        currentPlaylistName = playlistSelect.options[playlistSelect.selectedIndex].text;
        currentTracks = await fetchTracksForPlaylist(playlistSelect.value);
        renderTracks();

        if (currentTracks.length === 0) {
          tokenStatusEl.textContent = 'The selected playlist has no tracks to display.';
        } else {
          tokenStatusEl.textContent = `Loaded ${currentTracks.length} tracks. Copy or download them below.`;
          copyTracksButton.disabled = !navigator.clipboard;
          downloadTracksButton.disabled = false;
        }
      } catch (error) {
        console.error('Failed to load playlist tracks', error);
        const message = error instanceof Error ? error.message : 'Unable to load tracks for this playlist.';
        showError(message);
        tokenStatusEl.textContent = 'Track retrieval failed. Try another playlist or refresh the page.';
      } finally {
        loadTracksButton.disabled = false;
      }
    });
  }

  if (copyTracksButton && navigator.clipboard) {
    copyTracksButton.addEventListener('click', async () => {
      if (!currentTracks.length) {
        return;
      }

      const serialized = currentTracks
        .map((track, index) => `${index + 1}. ${track.name} — ${track.artists}`)
        .join('\n');

      try {
        await navigator.clipboard.writeText(serialized);
        copyTracksButton.textContent = 'Copied list!';
        copyTracksButton.classList.add('success');
        setTimeout(() => {
          copyTracksButton.textContent = 'Copy track list';
          copyTracksButton.classList.remove('success');
        }, 2500);
      } catch (error) {
        console.error('Failed to copy track list', error);
        copyTracksButton.textContent = 'Copy failed';
        copyTracksButton.classList.add('error');
        setTimeout(() => {
          copyTracksButton.textContent = 'Copy track list';
          copyTracksButton.classList.remove('error');
        }, 2500);
      }
    });
  }

  if (downloadTracksButton) {
    downloadTracksButton.addEventListener('click', () => {
      if (!currentTracks.length) {
        return;
      }

      const payload = {
        playlist: currentPlaylistName,
        generatedAt: new Date().toISOString(),
        tracks: currentTracks,
      };

      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = sanitizeFileName(`${currentPlaylistName || 'playlist'}-tracks.json`);
      anchor.click();
      URL.revokeObjectURL(url);
    });
  }

  function renderTracks() {
    tracksContainer.innerHTML = '';

    if (!currentTracks.length) {
      const emptyMessage = document.createElement('p');
      emptyMessage.className = 'hint';
      emptyMessage.textContent = 'No tracks were returned for this playlist.';
      tracksContainer.appendChild(emptyMessage);
      return;
    }

    const list = document.createElement('ol');
    list.className = 'track-list';

    currentTracks.forEach((track) => {
      const item = document.createElement('li');
      item.innerHTML = `<strong>${track.name}</strong><span>${track.artists}</span>`;
      list.appendChild(item);
    });

    tracksContainer.appendChild(list);
  }

  function showError(message) {
    if (!errorCard || !errorMessageEl) {
      return;
    }

    errorMessageEl.textContent = message;
    errorCard.hidden = false;
  }

  function getClientId() {
    if (typeof window.SPOTIFY_CLIENT_ID !== 'string') {
      return '';
    }

    const trimmed = window.SPOTIFY_CLIENT_ID.trim();
    if (!trimmed || /^your[_-]?spotify[_-]?client[_-]?id$/i.test(trimmed)) {
      return '';
    }

    return trimmed;
  }

  async function safeReadText(response) {
    try {
      return await response.text();
    } catch (error) {
      console.error('Failed to read response body', error);
      return '';
    }
  }

  function sanitizeFileName(name) {
    return name.replace(/[^a-z0-9-_]+/gi, '_');
  }
})();
