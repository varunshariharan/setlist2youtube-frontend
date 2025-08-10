export function buildAuthUrl({ clientId, scopes, redirectUri }){
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('response_type', 'token');
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('scope', scopes.join(' '));
  url.searchParams.set('include_granted_scopes', 'true');
  url.searchParams.set('prompt', 'consent');
  return url.toString();
}

export function parseAuthResponseUrl(redirectedUrl){
  try {
    const hash = redirectedUrl.split('#')[1] || '';
    const params = new URLSearchParams(hash);
    const accessToken = params.get('access_token');
    const expiresIn = Number(params.get('expires_in') || '0');
    const tokenType = params.get('token_type');
    return { accessToken, expiresIn, tokenType };
  } catch (e) {
    return { accessToken: null, expiresIn: 0, tokenType: null };
  }
}

export async function signInWithGoogle(scopes){
  return new Promise((resolve, reject) => {
    try {
      const redirectUri = chrome.identity.getRedirectURL();
      const clientId = '<GOOGLE_CLIENT_ID_FROM_MANIFEST>'; // placeholder; we use manifest oauth2
      const authUrl = buildAuthUrl({ clientId: (chrome.runtime.getManifest().oauth2?.client_id || clientId), scopes, redirectUri });
      chrome.identity.launchWebAuthFlow({ url: authUrl, interactive: true }, (responseUrl) => {
        if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
        const { accessToken, expiresIn } = parseAuthResponseUrl(responseUrl || '');
        if (!accessToken) return reject(new Error('No access token returned'));
        const expiresAt = Date.now() + (expiresIn * 1000);
        chrome.storage.local.set({ s2y_access_token: accessToken, s2y_token_expires_at: expiresAt }, () => {
          resolve({ accessToken, expiresAt });
        });
      });
    } catch (e) { reject(e); }
  });
}
