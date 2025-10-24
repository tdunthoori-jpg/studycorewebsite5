// Get the base URL for redirects
// In production, use studycore.net; in development, use localhost
export const getBaseUrl = (): string => {
  // Check if we're in production
  if (import.meta.env.PROD) {
    return 'https://studycore.net';
  }
  
  // In development, use the current origin (localhost)
  return window.location.origin;
};

// Production URL (always use this for email redirects in production)
export const PRODUCTION_URL = 'https://studycore.net';

// Get redirect URL based on environment
export const getRedirectUrl = (path: string): string => {
  const baseUrl = getBaseUrl();
  return `${baseUrl}${path}`;
};
