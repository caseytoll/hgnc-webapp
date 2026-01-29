// API Configuration
// Change this to your deployed Apps Script URL
export const API_CONFIG = {
  // Use Vite env variable if available, fallback to default
  baseUrl: import.meta.env.VITE_GS_API_URL || 'https://script.google.com/macros/s/AKfycbx5g7fIW28ncXoI9SeHDKix7umBtqaTdOm1aM-JdgO2l7esQHxu8jViMRRSN7YGtMnd/exec',
  useMockData: false,
  debug: true
};

// Log environment and config for debugging
console.log('[DEBUG] import.meta.env.VITE_GS_API_URL:', import.meta.env.VITE_GS_API_URL);
console.log('[DEBUG] API_CONFIG.baseUrl:', API_CONFIG.baseUrl);

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
    console.log('[API] Fetching:', url.toString());
    const response = await fetch(url.toString());
    console.log('[API] Response status:', response.status);
    const data = await response.json();

    if (API_CONFIG.debug) {
      console.log('[API Response]', action, data);
    }

    return data;
  } catch (error) {
    // Show error in UI if available
    if (typeof window !== 'undefined') {
      let el = document.getElementById('api-error-banner');
      if (!el) {
        el = document.createElement('div');
        el.id = 'api-error-banner';
        el.style = 'background:#b91c1c;color:#fff;padding:8px 12px;font-weight:bold;position:fixed;top:0;left:0;right:0;z-index:9999;text-align:center;';
        document.body.appendChild(el);
      }
      el.textContent = '[API Error] ' + (error?.message || error);
    }
    console.error('[API Error]', action, error);
    throw error;
  }
}
