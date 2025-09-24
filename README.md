# Spotify OAuth Code Catcher

This repository hosts a static GitHub Pages site that you can use as the redirect URI for Spotify&apos;s Authorization Code flow. The callback page displays the `code` and `state` query parameters so you can copy the authorization code into your script and exchange it for tokens.

## 1. Publish with GitHub Pages

1. Push this repository to GitHub.
2. Open **Settings → Pages** in your GitHub repository.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Select the branch you pushed (for example `main` or `master`) and the `/ (root)` folder, then click **Save**.
5. Wait for the green success badge, then note the published URL. It will be `https://<your-user>.github.io/<repository-name>/`.

The callback page will live at:

```
https://<your-user>.github.io/<repository-name>/callback.html
```

## 2. Register the redirect URI with Spotify

1. Go to the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard/) and open your app.
2. Click **Edit Settings** and scroll to **Redirect URIs**.
3. Add your GitHub Pages callback URL exactly (for example `https://octocat.github.io/spotify-code-catcher/callback.html`).
4. Save the settings. Spotify will only redirect to URLs that match character-for-character.

## 3. Use the callback page

1. Start the Authorization Code flow from your application or a script, using the GitHub Pages callback URL above.
2. After logging into Spotify and granting access, Spotify will redirect back to `callback.html` with `code` and `state` parameters.
3. The page displays these values and includes a **Copy code to clipboard** button.

> **Tip:** The authorization code expires within minutes. Exchange it for tokens as soon as you copy it.

## 4. Exchange the code for tokens with Spotipy

Here&apos;s an example of exchanging the authorization code using [Spotipy](https://spotipy.readthedocs.io/):

```python
import spotipy
from spotipy.oauth2 import SpotifyOAuth

sp_oauth = SpotifyOAuth(
    client_id="YOUR_CLIENT_ID",
    client_secret="YOUR_CLIENT_SECRET",
    redirect_uri="https://<your-user>.github.io/<repository-name>/callback.html",
    scope="user-read-private user-read-email",
)

authorization_code = input("Paste the authorization code: ")

# Exchange the authorization code for access and refresh tokens
access_token_info = sp_oauth.get_access_token(code=authorization_code, check_cache=False)

print("Access token:", access_token_info["access_token"])
print("Refresh token:", access_token_info.get("refresh_token"))
```

Replace the placeholders with your app&apos;s credentials, scopes, and GitHub Pages URL. You can then use the returned tokens to authenticate subsequent Spotify Web API requests.

## 5. Local testing

If you want to test the callback page locally before publishing:

```bash
python -m http.server 8000
```

Then visit `http://localhost:8000/callback.html?code=test-code&state=test-state` to see the page in action.
