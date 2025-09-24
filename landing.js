(function () {
  const loginButton = document.getElementById('login-button');
  const statusEl = document.getElementById('login-status');
  const instructionsEl = document.getElementById('login-instructions');

  if (!loginButton || !statusEl || !instructionsEl) {
    return;
  }

  const clientId = getClientId();

  if (!clientId) {
    statusEl.textContent =
      'Add your Spotify client ID to config.js (or inject window.SPOTIFY_CLIENT_ID) to enable the one-click login.';
    loginButton.disabled = true;
    instructionsEl.hidden = false;
    return;
  }

  instructionsEl.hidden = false;
  statusEl.textContent = 'Start the Authorization Code with PKCE flow to connect your Spotify account.';

  loginButton.addEventListener('click', async () => {
    loginButton.disabled = true;
    statusEl.textContent = 'Preparing the secure redirect to Spotify…';

    try {
      const codeVerifier = generateCodeVerifier();
      const codeChallenge = await generateCodeChallenge(codeVerifier);
      const state = generateRandomState();
      const redirectUri = new URL('callback.html', window.location.href).toString();
      const scopes = getScopes();

      sessionStorage.setItem('pkce_code_verifier', codeVerifier);
      sessionStorage.setItem('pkce_state', state);
      sessionStorage.setItem('pkce_redirect_uri', redirectUri);

      const authUrl = new URL('https://accounts.spotify.com/authorize');
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('client_id', clientId);
      authUrl.searchParams.set('scope', scopes);
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('state', state);
      authUrl.searchParams.set('code_challenge_method', 'S256');
      authUrl.searchParams.set('code_challenge', codeChallenge);

      window.location.href = authUrl.toString();
    } catch (error) {
      console.error('Failed to start Spotify authorization flow', error);
      statusEl.textContent =
        'Unable to start the Spotify login flow. Verify your browser supports the Web Crypto API and try again.';
      loginButton.disabled = false;
    }
  });

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

  function getScopes() {
    if (typeof window.SPOTIFY_SCOPES !== 'string') {
      return 'playlist-read-private playlist-read-collaborative user-read-email';
    }

    return window.SPOTIFY_SCOPES;
  }

  function generateRandomState() {
    const array = new Uint8Array(16);
    window.crypto.getRandomValues(array);
    return Array.from(array, (value) => value.toString(16).padStart(2, '0')).join('');
  }

  function generateCodeVerifier() {
    const validChars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    const array = new Uint8Array(96);
    window.crypto.getRandomValues(array);

    let verifier = '';
    array.forEach((value) => {
      verifier += validChars.charAt(value % validChars.length);
    });

    return verifier;
  }

  async function generateCodeChallenge(verifier) {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const digest = await window.crypto.subtle.digest('SHA-256', data);
    return base64UrlEncode(new Uint8Array(digest));
  }

  function base64UrlEncode(arrayBuffer) {
    let base64 = window.btoa(String.fromCharCode.apply(null, arrayBuffer));
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }
})();
