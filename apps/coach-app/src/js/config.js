// API Configuration
// Change this to your deployed Apps Script URL
export const API_CONFIG = {
  // The deployed Apps Script web app URL. Prefer environment override via Vite:
  // Set VITE_GS_API_URL to override at build time.
  baseUrl: import.meta.env.VITE_GS_API_URL || 'https://script.google.com/macros/s/AKfycbwss2trWP44QVCxMdvNzk89sXQaCnhyFbUty22s_dXIg0NOA94Heqagt_bndZYR1NWo/exec',

  // Set to true to use mock data for offline development
  useMockData: false,

  // Enable debug logging
  debug: import.meta.env.VITE_DEBUG ? import.meta.env.VITE_DEBUG === 'true' : true
};
