# spotifyCallBack
# Spotify OAuth Callback Toolkit

This project hosts a static site purpose-built for Spotify&apos;s Authorization Code flow. It can live on GitHub Pages (or any static
host) and provides:

- A landing page with a guided Authorization Code with PKCE launcher so you can authenticate against your Spotify account from the
  browser.
- A callback page that surfaces the raw `code`/`state` values, automatically exchanges the authorization code for tokens when
  possible, and lists your playlists so you can extract their tracks.
- Simple copy/download helpers for playlist tracks, ideal when you need to seed scripts or inspect playlist contents quickly.

Everything is implemented with plain HTML, CSS, and vanilla JavaScript—no build step required.

## 1. Publish with GitHub Pages (or any static host)

1. Push this repository to GitHub.
2. Open **Settings → Pages** in your repository.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Select the branch you pushed (for example `main`) and the `/ (root)` folder, then click **Save**.
5. Wait for the deployment to finish. Your site will be available at `https://<your-user>.github.io/<repository-name>/`.

The callback page must be reachable at:

```
https://<your-user>.github.io/<repository-name>/callback.html
```

Register that exact URL (character-for-character) in the Spotify Developer Dashboard.

## 2. Configure your Spotify client ID

The Authorization Code with PKCE flow only needs your **client ID**—never put your client secret into this repository.

1. Duplicate `config.js` locally and set `window.SPOTIFY_CLIENT_ID` to your app&apos;s client ID from the Spotify Developer Dashboard.
   - Alternatively, inject the value at runtime by defining `window.SPOTIFY_CLIENT_ID` before `config.js` loads (for example with a
     small inline script or through your hosting provider&apos;s environment injection feature).
2. Adjust `window.SPOTIFY_SCOPES` if you need permissions beyond the defaults (`playlist-read-private playlist-read-collaborative
   user-read-email`).
3. Commit the safe placeholder (never secrets) and deploy the updated site.

When the landing page loads it reads `window.SPOTIFY_CLIENT_ID`; if it&apos;s empty the one-click login button is disabled and you can
still run the flow manually and copy the code.

## 3. Use the hosted site

### Guided Authorization Code with PKCE flow

1. Visit your deployed landing page and click **Log in with Spotify**.
2. The page generates a code verifier/challenge pair, stores it in `sessionStorage`, and sends you to Spotify&apos;s consent screen.
3. After approving the request you&apos;ll land on `callback.html`. The page verifies the state value, exchanges the authorization code
   for tokens, fetches your profile, and loads all playlists reachable with the granted scopes.
4. Pick a playlist to fetch its tracks. You can copy the formatted list to the clipboard or download the structured JSON payload for
   scripting.

### Manual workflow (fallback)

You can always copy the raw authorization code shown at the top of `callback.html`. This is useful if you want to exchange the code
from a separate script or if you skipped configuring the client ID.

## 4. Working with the extracted playlist data

- **Copy list** – produces a numbered list in the format `1. Track — Artist` for quick sharing or pasting into docs.
- **Download JSON** – generates a JSON file containing the playlist name, timestamp, and an array with track metadata (name,
  artists, album, added timestamp, and Spotify URI).
- The data is kept in-memory only. Reloading the page clears it, and the access token is stored in `sessionStorage` for the browser
  session.

## 5. Exchange the authorization code in Python (optional)

If you prefer running the token exchange yourself, the raw code from `callback.html` can still be used with
[Spotipy](https://spotipy.readthedocs.io/) or any HTTP client. Example with Spotipy:

```python
import spotipy
from spotipy.oauth2 import SpotifyOAuth

sp_oauth = SpotifyOAuth(
    client_id="YOUR_CLIENT_ID",
    client_secret="YOUR_CLIENT_SECRET",
    redirect_uri="https://<your-user>.github.io/<repository-name>/callback.html",
    scope="user-read-private user-read-email playlist-read-private playlist-read-collaborative",
)

authorization_code = input("Paste the authorization code: ")

# Exchange the authorization code for access and refresh tokens
access_token_info = sp_oauth.get_access_token(code=authorization_code, check_cache=False)

print("Access token:", access_token_info["access_token"])
print("Refresh token:", access_token_info.get("refresh_token"))
```

Replace the placeholders with your credentials and the GitHub Pages URL you deployed. The scopes should match the permissions you
request on the landing page.

## 6. Local testing

Serve the directory with any static server:

```bash
python -m http.server 8000
```

Then visit `http://localhost:8000/index.html` (landing page) or `http://localhost:8000/callback.html?code=test&state=abc` to verify
the UI without touching the Spotify API.
