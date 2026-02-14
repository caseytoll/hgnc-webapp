// API Configuration
// Change this to your deployed Apps Script URL
export const API_CONFIG = {
  // The deployed Apps Script web app URL. Prefer environment override via Vite:
  // Set VITE_GS_API_URL to override at build time.
  baseUrl: import.meta.env.VITE_GS_API_URL || 'https://script.google.com/macros/s/AKfycbz3DmnPOLstWmOmJs4nzDQn42XXWe0E2ujLpmfo4e4WZFkInXxUdeL8-W0SImYj9EQj/exec',

  // Set to true to use mock data for offline development
  // Change to `false` to use the live Apps Script API by default. The app
  // implements a runtime fallback to mock data if the live API is unavailable.
  useMockData: false,

  // Enable debug logging (default off in production; set VITE_DEBUG=true to enable)
  debug: import.meta.env.VITE_DEBUG === 'true'
};
