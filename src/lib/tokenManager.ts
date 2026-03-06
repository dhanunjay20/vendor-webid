/**
 * Centralized Token Management
 * 
 * Provides a single source of truth for token storage, retrieval, and refresh.
 * All modules should use this instead of accessing localStorage directly.
 */

const TOKEN_KEYS = {
  ACCESS_TOKEN: 'accessToken',
  REFRESH_TOKEN: 'refreshToken',
  TOKEN_TYPE: 'tokenType',
  EXPIRES_AT: 'expiresAt',
  // Legacy keys for backward compatibility
  AUTH_TOKEN: 'authToken',
} as const;

/**
 * Get access token from localStorage
 * Falls back to legacy 'authToken' key for backward compatibility
 */
export function getAccessToken(): string | null {
  return localStorage.getItem(TOKEN_KEYS.ACCESS_TOKEN) || 
         localStorage.getItem(TOKEN_KEYS.AUTH_TOKEN);
}

/**
 * Get refresh token from localStorage
 */
export function getRefreshToken(): string | null {
  return localStorage.getItem(TOKEN_KEYS.REFRESH_TOKEN);
}

/**
 * Get token type (default: Bearer)
 */
export function getTokenType(): string {
  return localStorage.getItem(TOKEN_KEYS.TOKEN_TYPE) || 'Bearer';
}

/**
 * Set tokens in localStorage (called after successful login/register/refresh)
 * @param accessToken The access token
 * @param refreshToken Optional refresh token
 * @param expiresIn Optional expiry time in seconds
 */
export function setTokens(
  accessToken: string,
  refreshToken?: string,
  expiresIn?: number,
  tokenType: string = 'Bearer'
): void {
  localStorage.setItem(TOKEN_KEYS.ACCESS_TOKEN, accessToken);
  
  // Also set legacy key for backward compatibility
  localStorage.setItem(TOKEN_KEYS.AUTH_TOKEN, accessToken);

  if (refreshToken) {
    localStorage.setItem(TOKEN_KEYS.REFRESH_TOKEN, refreshToken);
  }

  localStorage.setItem(TOKEN_KEYS.TOKEN_TYPE, tokenType);

  // Set expiry time if provided
  if (expiresIn) {
    const expiresAt = Date.now() + expiresIn * 1000;
    localStorage.setItem(TOKEN_KEYS.EXPIRES_AT, expiresAt.toString());
  }
}

/**
 * Clear all tokens from localStorage
 * Called on logout or when refresh fails
 */
export function clearTokens(): void {
  Object.values(TOKEN_KEYS).forEach((key) => {
    localStorage.removeItem(key);
  });
}

/**
 * Check if access token is expired
 * @returns true if token is expired or near expiry (within 1 minute)
 */
export function isTokenExpired(): boolean {
  const expiresAt = localStorage.getItem(TOKEN_KEYS.EXPIRES_AT);
  
  if (!expiresAt) {
    // No expiry set, assume not expired
    return false;
  }

  const expiresAtTime = parseInt(expiresAt, 10);
  const bufferTime = 60 * 1000; // 1 minute buffer before actual expiry

  return Date.now() > (expiresAtTime - bufferTime);
}

/**
 * Get complete Authorization header value
 * @returns "Bearer {token}" or null if no token
 */
export function getAuthorizationHeader(): string | null {
  const token = getAccessToken();
  const tokenType = getTokenType();

  if (!token) {
    return null;
  }

  return `${tokenType} ${token}`;
}

/**
 * Check if user is currently authenticated
 * @returns true if access token exists
 */
export function isAuthenticated(): boolean {
  return !!getAccessToken();
}

/**
 * Validate token format (basic check)
 * @returns true if token looks valid (not empty string, reasonable length)
 */
export function isValidToken(token: string | null): boolean {
  if (!token || typeof token !== 'string') {
    return false;
  }
  
  // Token should be reasonably long (JWT tokens are typically 100+ chars)
  return token.length > 50;
}

/**
 * Export all methods as an object for consistent API
 */
export const tokenManager = {
  getAccessToken,
  getRefreshToken,
  getTokenType,
  setTokens,
  clearTokens,
  isTokenExpired,
  getAuthorizationHeader,
  isAuthenticated,
  isValidToken,
};

export default tokenManager;
