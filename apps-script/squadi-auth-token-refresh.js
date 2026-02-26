/**
 * Squadi/Netball Connect Authentication Module
 * 
 * Since tokens expire after ~30 minutes, implement token refresh
 * strategy for ongoing API access.
 */

// Store credentials securely in Apps Script Properties
const SQUADI_USER = PropertiesService.getScriptProperties().getProperty('SQUADI_USER');
const SQUADI_PASS = PropertiesService.getScriptProperties().getProperty('SQUADI_PASS');

// Token cache to minimize login calls
let tokenCache = null;
let tokenExpiry = 0;

/**
 * Get a valid BWSA token (cached or fresh)
 */
function getSquadiAuthToken() {
  const now = Date.now();
  
  // Return cached token if still valid (with 5-minute buffer)
  if (tokenCache && tokenExpiry > now + (5 * 60 * 1000)) {
    return tokenCache;
  }
  
  // Otherwise fetch fresh token
  return refreshSquadiToken();
}

/**
 * Login to get fresh BWSA token
 * Based on pattern found in JavaScript: /users/login endpoint
 */
function refreshSquadiToken() {
  try {
    const loginUrl = 'https://api-netball.squadi.com/users/login';
    
    const options = {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({
        email: SQUADI_USER,
        password: SQUADI_PASS
      }),
      muteHttpExceptions: true
    };
    
    const response = UrlFetchApp.fetch(loginUrl, options);
    const data = JSON.parse(response.getContentText());
    
    if (data.token) {
      // Cache token for 25 minutes (tokens expire after ~30 min)
      tokenCache = data.token;
      tokenExpiry = Date.now() + (25 * 60 * 1000);
      
      Logger.log('✓ Squadi token refreshed successfully');
      return tokenCache;
    }
    
    throw new Error('No token in login response');
    
  } catch (error) {
    Logger.log('✗ Squadi login failed: ' + error);
    return null;
  }
}

/**
 * Fetch quarter scores for a match using authenticated API
 * Based on discovered endpoint: /livescores/matches/periodScores
 */
function getMatchQuarterScores(matchId) {
  const token = getSquadiAuthToken();
  if (!token) {
    Logger.log('Cannot fetch quarters: No auth token');
    return null;
  }
  
  const url = `https://api-netball.squadi.com/livescores/matches/periodScores?matchId=${matchId}`;
  
  const options = {
    method: 'get',
    headers: {
      'Authorization': `BWSA ${token}`  // Note: BWSA not Bearer
    },
    muteHttpExceptions: true
  };
  
  try {
    const response = UrlFetchApp.fetch(url, options);
    const code = response.getResponseCode();
    
    if (code === 403) {
      Logger.log('Token expired, refreshing...');
      tokenCache = null;  // Invalidate cache
      return getMatchQuarters(matchId);  // Retry with fresh token
    }
    
    if (code === 200) {
      const data = JSON.parse(response.getContentText());
      
      // Transform cumulative scores to per-quarter
      return transformQuarterScores(data);
    }
    
    Logger.log(`Unexpected response: ${code}`);
    return null;
    
  } catch (error) {
    Logger.log('Error fetching quarters: ' + error);
    return null;
  }
}

/**
 * Transform cumulative Squadi scores to per-quarter amounts
 */
function transformQuarterScores(periodScores) {
  if (!periodScores || periodScores.length === 0) {
    return null;
  }
  
  const result = { matchId: periodScores[0].matchId, quarters: [] };
  let prevTeam1 = 0, prevTeam2 = 0;
  
  periodScores
    .sort((a, b) => a.period - b.period)
    .forEach(p => {
      result.quarters.push({
        quarter: p.period,
        team1Goals: p.team1Score - prevTeam1,
        team2Goals: p.team2Score - prevTeam2,
        team1Cumulative: p.team1Score,
        team2Cumulative: p.team2Score
      });
      
      prevTeam1 = p.team1Score;
      prevTeam2 = p.team2Score;
    });
  
  return result;
}

// =============================================================================
// SETUP INSTRUCTIONS (Run once)
// =============================================================================

/**
 * Store your Netball Connect / Squadi login credentials
 * Run this ONCE to set up authentication
 * 
 * IMPORTANT: Replace the placeholder values below with your actual credentials
 */
function setupSquadiCredentials() {
  const props = PropertiesService.getScriptProperties();
  
  // ⚠️ REPLACE THESE WITH YOUR ACTUAL NETBALL CONNECT LOGIN CREDENTIALS ⚠️
  const email = 'your-email@example.com';      // Your Netball Connect email
  const password = 'your-password';             // Your Netball Connect password
  
  // Validate before storing
  if (email === 'your-email@example.com' || password === 'your-password') {
    Logger.log('❌ ERROR: Please replace placeholder credentials with real values');
    return;
  }
  
  // Store in script properties (secure and persistent)
  props.setProperty('SQUADI_USER', email);
  props.setProperty('SQUADI_PASS', password);
  
  Logger.log('✓ Credentials stored successfully');
  Logger.log('✓ Testing authentication...');
  
  // Test the credentials immediately
  testSquadiAuth();
}

/**
 * Test authentication with stored credentials
 */
function testSquadiAuth() {
  const token = getSquadiAuthToken();
  
  if (token) {
    Logger.log('✓ Authentication successful!');
    Logger.log('✓ Token obtained (512 chars): ' + token.substring(0, 50) + '...');
    return true;
  } else {
    Logger.log('❌ Authentication failed - check credentials');
    return false;
  }
}

/**
 * View stored credentials (for debugging)
 * NOTE: Only shows if credentials are set, not the actual values
 */
function checkSquadiCredentials() {
  const props = PropertiesService.getScriptProperties();
  const user = props.getProperty('SQUADI_USER');
  const pass = props.getProperty('SQUADI_PASS');
  
  if (user && pass) {
    Logger.log('✓ Credentials are stored');
    Logger.log('  Email: ' + user);
    Logger.log('  Password: ' + '*'.repeat(pass.length) + ' (' + pass.length + ' chars)');
  } else {
    Logger.log('❌ No credentials stored yet');
    Logger.log('   Run setupSquadiCredentials() first');
  }
}

/**
 * Clear stored credentials (if needed)
 */
function clearSquadiCredentials() {
  const props = PropertiesService.getScriptProperties();
  props.deleteProperty('SQUADI_USER');
  props.deleteProperty('SQUADI_PASS');
  
  // Also clear token cache
  tokenCache = null;
  tokenExpiry = 0;
  
  Logger.log('✓ Credentials cleared');
}

// =============================================================================
// EXAMPLE USAGE
// =============================================================================

function testSquadiQuarterScores() {
  // Test with match 2568305 (which worked in our curl tests)
  const quarters = getMatchQuarterScores(2568305);
  
  if (quarters) {
    Logger.log('Match ID: ' + quarters.matchId);
    quarters.quarters.forEach(q => {
      Logger.log(`Q${q.quarter}: ${q.team1Goals}-${q.team2Goals} (Total: ${q.team1Cumulative}-${q.team2Cumulative})`);
    });
  } else {
    Logger.log('Failed to fetch quarter scores');
  }
}
