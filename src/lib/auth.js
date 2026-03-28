/**
 * Auth helpers — localStorage token management + cookie hint for middleware
 * Cookie "auth_hint" lets the Edge Runtime middleware know a session exists
 * without exposing the actual JWT values.
 */

const ACCESS_TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";
const COOKIE_HINT = "auth_hint";

// ─── Cookie helpers (middleware-readable) ──────────────────────────────────

function setCookieHint(expiresInDays = 7) {
  if (typeof document === "undefined") return;
  const expires = new Date(Date.now() + expiresInDays * 864e5).toUTCString();
  document.cookie = `${COOKIE_HINT}=1; path=/; expires=${expires}; SameSite=Lax`;
}

function clearCookieHint() {
  if (typeof document === "undefined") return;
  document.cookie = `${COOKIE_HINT}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * Save both tokens to localStorage and set the middleware cookie hint.
 * @param {{ accessToken: string, refreshToken: string }} tokens
 */
export function setTokens({ accessToken, refreshToken }) {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  setCookieHint();
}

/**
 * Read both tokens from localStorage.
 * @returns {{ accessToken: string|null, refreshToken: string|null }}
 */
export function getTokens() {
  if (typeof window === "undefined")
    return { accessToken: null, refreshToken: null };
  return {
    accessToken: localStorage.getItem(ACCESS_TOKEN_KEY),
    refreshToken: localStorage.getItem(REFRESH_TOKEN_KEY),
  };
}

/**
 * Shorthand to get the access token.
 * @returns {string|null}
 */
export function getAccessToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

/**
 * Clear both tokens from localStorage and remove the cookie hint.
 */
export function clearTokens() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  clearCookieHint();
}

/**
 * Check if a token string is present and not obviously empty.
 * @returns {boolean}
 */
export function isAuthenticated() {
  const { accessToken } = getTokens();
  return Boolean(accessToken);
}
