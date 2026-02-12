// API Configuration
// Change this to your deployed Apps Script URL
export const API_CONFIG = {
  // Use the same Apps Script URL as the coach app
  // Prefer a proxy worker URL when available (set VITE_GS_API_PROXY_URL to your worker URL),
  // otherwise fall back to the Apps Script URL
  baseUrl: import.meta.env.VITE_GS_API_PROXY_URL || 'https://script.google.com/macros/s/AKfycbyBxhOJDfNBZuZ65St-Qt3UmmeAD57M0Jr1Q0MsoKGbHFxzu8rIvarJOOnB4sLeJZ-V/exec',
  useMockData: false, // Use real API data
  debug: true
};

// Log environment and config for debugging
console.log('[DEBUG] import.meta.env.VITE_GS_API_URL:', import.meta.env.VITE_GS_API_URL);
console.log('[DEBUG] API_CONFIG.baseUrl:', API_CONFIG.baseUrl);

// Import mock data directly
import { mockTeams } from '../../../../common/mock-data.js';

// Helper to make API calls to Apps Script backend
export async function callApi(action, params = {}) {
  if (API_CONFIG.debug) {
    console.log('[API]', action, params);
  }

  // Return mock data if enabled
  if (API_CONFIG.useMockData) {
    console.log('[API] Using mock data for', action);
    if (action === 'getTeams') {
      return { teams: mockTeams };
    }
    if (action === 'getTeamData') {
      const team = mockTeams.find(t => t.teamID === params.teamID);
      return { teamData: team || null };
    }
    return {};
  }

  const url = new URL(API_CONFIG.baseUrl);
  url.searchParams.set('api', 'true');
  url.searchParams.set('action', action);

  // Add any additional params
  Object.keys(params).forEach(key => {
    const value = typeof params[key] === 'object' ? JSON.stringify(params[key]) : params[key];
    url.searchParams.set(key, value);
  });

  // Add cache-busting param
  url.searchParams.set('t', Date.now());

  try {
    console.log('[API] Fetching:', url.toString());
    const response = await fetch(url.toString(), { cache: 'no-store' });
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
