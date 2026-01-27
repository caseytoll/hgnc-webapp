// API Configuration
// Change this to your deployed Apps Script URL
export const API_CONFIG = {
  // Your current deployed Apps Script web app URL
  // This is used for all server calls (loading data, saving lineups, etc.)
  baseUrl: 'https://script.google.com/macros/s/AKfycbzDYbesIxbGVQ3NtQorZ5eO8muR16js5VEogZanlt54rWGCgTJ0kF2GhxBluoKqearN/exec',

  // Set to true to use mock data for offline development
  useMockData: false,

  // Enable debug logging
  debug: true
};

// Helper to make API calls to Apps Script backend
export async function callApi(action, params = {}) {
  if (API_CONFIG.debug) {
    console.log('[API]', action, params);
  }

  const url = new URL(API_CONFIG.baseUrl);
  url.searchParams.set('action', action);

  // Add any additional params
  Object.keys(params).forEach(key => {
    url.searchParams.set(key, JSON.stringify(params[key]));
  });

  try {
    const response = await fetch(url.toString());
    const data = await response.json();

    if (API_CONFIG.debug) {
      console.log('[API Response]', action, data);
    }

    return data;
  } catch (error) {
    console.error('[API Error]', action, error);
    throw error;
  }
}
