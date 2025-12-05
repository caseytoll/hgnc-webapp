// Spreadsheet ID for the HGNC data - update this if the spreadsheet changes
var SPREADSHEET_ID = '13Dxn41HZnClcpMeIzDXtxbhH-gDFtaIJsz5LV3hrE88';

/**
 * Helper function to get the spreadsheet (works better for anonymous access)
 */
function getSpreadsheet() {
  try {
    // For webapps, prioritize opening by ID since there's no active spreadsheet context
    console.log('DEBUG: Attempting to open spreadsheet by ID:', SPREADSHEET_ID);
    return SpreadsheetApp.openById(SPREADSHEET_ID);
  } catch (e) {
    console.error('DEBUG: Could not open spreadsheet by ID:', e.toString());
    try {
      // Fallback to active spreadsheet (for container-bound scripts)
      console.log('DEBUG: Falling back to active spreadsheet');
      return SpreadsheetApp.getActiveSpreadsheet();
    } catch (e2) {
      console.error('DEBUG: Could not get active spreadsheet either:', e2.toString());
      throw new Error('Unable to access spreadsheet. Please check permissions and spreadsheet ID.');
    }
  }
}

// This function serves your HTML file as the web page.
function doGet(e) {
  console.log('DEBUG: doGet called with params:', e);
  var template = HtmlService.createTemplateFromFile('index');
  console.log('DEBUG: Template created from index.html');

  var userEmail = '';
  try {
    userEmail = Session.getActiveUser().getEmail();
    console.log('DEBUG: User email retrieved:', userEmail);
  } catch (e) {
    console.log('DEBUG: Error getting user email:', e.toString());
    userEmail = '';
  }
  template.userEmail = userEmail;

  // Owner email and feature flag - read from Script Properties if set, otherwise use sensible defaults
  var props = PropertiesService.getScriptProperties();
  var ownerEmail = props.getProperty('OWNER_EMAIL') || 'caseytoll78@gmail.com';
  var testInsightsFlag = (props.getProperty('TEST_INSIGHTS_ENABLED') || 'false') === 'true';
  template.ownerEmail = ownerEmail;
  template.showTestInsights = testInsightsFlag;
  console.log('DEBUG: Owner email:', ownerEmail, 'Test insights:', testInsightsFlag);

  // Log user access
  var timestamp = new Date().toISOString();
  var isOwner = userEmail === ownerEmail;
  Logger.log('ACCESS: ' + timestamp + ' | User: ' + (userEmail || 'Anonymous') + ' | Owner: ' + isOwner);
  console.log('DEBUG: Access logged - User:', (userEmail || 'Anonymous'), 'Is Owner:', isOwner);

  try {
    // Load logo data URL once on server-side for use throughout the app
    console.log('DEBUG: Loading logo data URL...');
    template.logoDataUrl = getLogoDataUrl();
    console.log('DEBUG: Logo data URL loaded, length:', template.logoDataUrl ? template.logoDataUrl.length : 'null');

    // Load team performance icon data URL (centralised base64 asset)
    console.log('DEBUG: Loading team performance icon...');
    template.teamPerformanceIconDataUrl = getTeamPerformanceIconDataUrl();
    console.log('DEBUG: Team performance icon loaded, length:', template.teamPerformanceIconDataUrl ? template.teamPerformanceIconDataUrl.length : 'null');

    // Load additional icon data URLs
    console.log('DEBUG: Loading offensive leaders icon...');
    template.offensiveLeadersIconDataUrl = getOffensiveLeadersIconDataUrl();
    console.log('DEBUG: Offensive leaders icon loaded, length:', template.offensiveLeadersIconDataUrl ? template.offensiveLeadersIconDataUrl.length : 'null');

    console.log('DEBUG: Loading defensive wall icon...');
    template.defensiveWallIconDataUrl = getDefensiveWallIconDataUrl();
    console.log('DEBUG: Defensive wall icon loaded, length:', template.defensiveWallIconDataUrl ? template.defensiveWallIconDataUrl.length : 'null');

    console.log('DEBUG: Loading player analysis icon...');
    template.playerAnalysisIconDataUrl = getPlayerAnalysisIconDataUrl();
    console.log('DEBUG: Player analysis icon loaded, length:', template.playerAnalysisIconDataUrl ? template.playerAnalysisIconDataUrl.length : 'null');

    // Cache buster - update this to force client refresh
    template.appVersion = '619';
    console.log('DEBUG: App version set to:', template.appVersion);

    console.log('DEBUG: Evaluating template...');
    var result = template.evaluate()
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    console.log('DEBUG: Template evaluated successfully');

    return result;

  } catch (error) {
    console.error('DEBUG: Error in doGet:', error.toString());
    Logger.log('ERROR in doGet: ' + error.toString());
    // Return a simple error page
    return HtmlService.createHtmlOutput('<h1>Error</h1><p>' + error.toString() + '</p>')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
}

/**
 * CDN base for assets hosted on jsDelivr (published from the repository's master branch).
 * Change `@master` to a specific tag or commit SHA for immutable deploys.
 */
var CDN_TAG = '@b00670a';
var CDN_BASE = 'https://cdn.jsdelivr.net/gh/caseytoll/hgnc-webapp' + CDN_TAG + '/assets/';

/**
 * A helper function to include the content of other HTML files
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Returns the logo image as a data URL
 */
function getLogoDataUrl() {
  try {
    // Read the base64 data from the file
    // Note: file contains raw data URL, no HTML tags
    var logoContent = HtmlService.createHtmlOutputFromFile('base image code').getContent();
    
    // The file should contain: data:image/jpeg;base64,{base64string}
    // Extract the data URL - trim any whitespace
    var trimmed = logoContent.trim();
    
    // Check if it starts with data:image
    if (trimmed.indexOf('data:image') === 0) {
      return trimmed;
    }
    
    // Try regex fallback
    var match = trimmed.match(/data:image[^\s]*/);
    if (match) {
      return match[0];
    }
    
    Logger.log('Logo file content does not start with data:image. First 100 chars: ' + trimmed.substring(0, 100));
    return '#';
  } catch(e) {
    Logger.log('Logo load error: ' + e.toString());
    return '#';
  }
}

/**
 * Returns the team performance icon image as a data URL (loaded from file)
 */
function getTeamPerformanceIconDataUrl() {
  try {
    var content = HtmlService.createHtmlOutputFromFile('team-performance-icon-code').getContent();
    var trimmed = content.trim();
    if (trimmed.indexOf('data:image') === 0) return trimmed;
    var match = trimmed.match(/data:image[^\s]*/);
    if (match) return match[0];
  Logger.log('Team performance icon file content does not start with data:image. Using CDN fallback');
  return CDN_BASE + 'team-performance-icon-source.jpeg';
  } catch (e) {
  Logger.log('Team performance icon load error: ' + e.toString() + ' - using CDN fallback');
  return CDN_BASE + 'team-performance-icon-source.jpeg';
  }
}

/**
 * Returns the offensive leaders icon image as a data URL
 */
function getOffensiveLeadersIconDataUrl() {
  try {
    var content = HtmlService.createHtmlOutputFromFile('offensive-leaders-icon-code').getContent();
    var trimmed = content.trim();
    if (trimmed.indexOf('data:image') === 0) return trimmed;
    var match = trimmed.match(/data:image[^\s]*/);
    if (match) return match[0];
  Logger.log('Offensive leaders icon file content does not start with data:image. Using CDN fallback');
  return CDN_BASE + 'Offensive-Leaders-Icon.jpeg';
  } catch (e) {
  Logger.log('Offensive leaders icon load error: ' + e.toString() + ' - using CDN fallback');
  return CDN_BASE + 'Offensive-Leaders-Icon.jpeg';
  }
}

/**
 * Returns the defensive wall icon image as a data URL
 */
function getDefensiveWallIconDataUrl() {
  try {
    var content = HtmlService.createHtmlOutputFromFile('defensive-wall-icon-code').getContent();
    var trimmed = content.trim();
    if (trimmed.indexOf('data:image') === 0) return trimmed;
    var match = trimmed.match(/data:image[^\s]*/);
    if (match) return match[0];
  Logger.log('Defensive wall icon file content does not start with data:image. Using CDN fallback');
  return CDN_BASE + 'Defensive-Wall-Icon.jpeg';
  } catch (e) {
  Logger.log('Defensive wall icon load error: ' + e.toString() + ' - using CDN fallback');
  return CDN_BASE + 'Defensive-Wall-Icon.jpeg';
  }
}

/**
 * Returns the player analysis icon image as a data URL
 */
function getPlayerAnalysisIconDataUrl() {
  try {
    var content = HtmlService.createHtmlOutputFromFile('player-analysis-icon-code').getContent();
    var trimmed = content.trim();
    // Prefer CDN fallback if the server-stored asset is an inline SVG placeholder
    if (trimmed.indexOf('data:image/svg') === 0) {
      Logger.log('Player analysis icon file contains an inline SVG - using CDN fallback');
      return [CDN_BASE + 'player-analysis-icon.webp', CDN_BASE + 'player-analysis-icon-small.png'].join(', ');
    }
    if (trimmed.indexOf('data:image') === 0) return trimmed;
    var match = trimmed.match(/data:image[^\s]*/);
    if (match) return match[0];
  Logger.log('Player analysis icon file content does not start with data:image. Using CDN fallback (webp, png)');
  return [CDN_BASE + 'player-analysis-icon.webp', CDN_BASE + 'player-analysis-icon-small.png'].join(', ');
  } catch (e) {
  Logger.log('Player analysis icon load error: ' + e.toString() + ' - using CDN fallback (webp, png)');
  return [CDN_BASE + 'player-analysis-icon.webp', CDN_BASE + 'player-analysis-icon-small.png'].join(', ');
  }
}

// === TOKEN MANAGEMENT FUNCTIONS ===

/**
 * Loads the Auth Token from the Settings sheet (B1).
 */
function loadAuthToken() {
  try {
    var ss = getSpreadsheet();
    var settingsSheet = ss.getSheetByName('Settings');
    if (!settingsSheet) {
      settingsSheet = ss.insertSheet('Settings');
      settingsSheet.getRange('A1').setValue('AUTH_TOKEN');
      settingsSheet.getRange('B1').setValue('PASTE_NEW_TOKEN_HERE');
      return 'PASTE_NEW_TOKEN_HERE';
    }
    var token = settingsSheet.getRange('B1').getValue();
    return token;
  } catch (e) {
    Logger.log("Error loading token: " + e.message);
    return '';
  }
}

/**
 * Saves a new Auth Token to the Settings sheet (B1).
 */
function saveAuthToken(newToken) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var settingsSheet = ss.getSheetByName('Settings');
    if (!settingsSheet) {
       settingsSheet = ss.insertSheet('Settings');
       settingsSheet.getRange('A1').setValue('AUTH_TOKEN');
    }
    settingsSheet.getRange('B1').setValue(newToken);
    return "OK";
  } catch (e) {
    Logger.log("Error saving token: " + e.message);
    return { error: e.message };
  }
}

// === LADDER AND FIXTURE ARCHIVE FUNCTIONS ===

/**
 * Loads the latest saved ladder data from the Ladder_Archive sheet.
 * This is the new primary way the client loads ladder data.
 */
function loadArchivedLadderData() {
  try {
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName('Ladder_Archive');
    if (!sheet || sheet.getLastRow() <= 1) {
      return [];
    }

    // Get all rows (excluding header)
    var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();

    // Find the latest timestamp and filter in a single pass
    var latestTimestamp = new Date(0);
    for (var i = 0; i < data.length; i++) {
      if (data[i][0] > latestTimestamp) {
        latestTimestamp = data[i][0];
      }
    }

    var latestData = [];
    var latestTime = latestTimestamp.getTime();
    for (var i = 0; i < data.length; i++) {
      var row = data[i];
      if (row[0].getTime() === latestTime) {
        latestData.push({
          rk: row[1],
          name: row[2],
          P: row[3],
          W: row[4],
          L: row[5],
          D: row[6],
          F: row[7],
          A: row[8],
          goalAverage: row[8] !== 0 ? row[7] / row[8] * 100 : 0,
          PTS: row[9]
        });
      }
    }

    Logger.log("Archived ladder loaded. Teams: " + latestData.length);
    return latestData;

  } catch (e) {
    Logger.log("Error loading archived ladder: " + e.message);
    return { error: e.message };
  }
}

/**
 * Loads the latest saved match results from the Fixture_Results sheet.
 */
function loadArchivedMatchResults() {
  try {
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName('Fixture_Results');
    
    // Check if sheet exists and has data
    if (!sheet || sheet.getLastRow() <= 1) {
      Logger.log("Fixture_Results sheet not found or empty");
      return []; 
    }

    // Get all data including header to understand structure
    var dataRange = sheet.getDataRange();
    var data = dataRange.getValues();
    var headers = data[0]; // First row is headers
    
    Logger.log("Fixture_Results headers: " + headers.join(', '));
    Logger.log("Fixture_Results data rows: " + (data.length - 1));
    
    // Skip header row
    var rows = data.slice(1);
    
    if (rows.length === 0) {
      Logger.log("No data rows found in Fixture_Results sheet");
      return [];
    }

    // Group matches by Round Name
    var roundsMap = {};

    rows.forEach(function(row, index) {
        // Skip empty rows
        if (!row || row.length === 0 || !row.some(function(cell) { return cell !== ''; })) {
          return;
        }
        
        // Find round name (column 1 - index 1)
        var roundName = String(row[1] || '');
        if (!roundName || roundName === '') {
          Logger.log("Skipping row " + (index + 2) + ": No round name found");
          return;
        }
        
        if (!roundsMap[roundName]) {
            roundsMap[roundName] = { name: roundName, matches: [] };
        }
        
        // Convert Date object to ISO string for proper JSON serialization
        var startTime = row[0];
        if (startTime instanceof Date) {
          startTime = startTime.toISOString();
        } else {
          startTime = String(startTime || '');
        }
        
        // Create match object with proper data types
        var match = {
            id: String(row[2] || 'match_' + index),
            startTime: startTime,
            team1: { name: String(row[3] || 'Unknown Team') },
            team2: { name: String(row[4] || 'Unknown Team') },
            team1Score: parseInt(row[5]) || 0,
            team2Score: parseInt(row[6]) || 0,
            team1ResultId: determineResultId(row, 5, 6, 7),
            team2ResultId: determineResultId(row, 6, 5, 7),
            matchStatus: String(row[8] || 'UNKNOWN')
        };
        
        roundsMap[roundName].matches.push(match);
    });

    var roundsArray = Object.keys(roundsMap).map(function(key) {
        return roundsMap[key];
    });

    // Sort rounds by round number
    roundsArray.sort(function(a, b) {
        var aNum = extractRoundNumber(a.name);
        var bNum = extractRoundNumber(b.name);
        return aNum - bNum;
    });

    Logger.log("Successfully loaded " + roundsArray.length + " rounds with " + 
               roundsArray.reduce(function(total, round) { return total + round.matches.length; }, 0) + " total matches");
    
    // Return the data - Google Apps Script will handle JSON serialization
    return roundsArray;

  } catch (e) {
    Logger.log("Error loading archived results: " + e.message);
    Logger.log("Stack: " + e.stack);
    return []; 
  }
}

// Helper function to extract round number from round name
function extractRoundNumber(roundName) {
  var match = String(roundName).match(/Round\s*(\d+)/i);
  return match ? parseInt(match[1]) : Infinity;
}

// Helper function to determine result ID
function determineResultId(row, scoreIndex, opponentScoreIndex, resultIndex) {
  var score = parseInt(row[scoreIndex]) || 0;
  var opponentScore = parseInt(row[opponentScoreIndex]) || 0;
  var resultText = row[resultIndex] ? String(row[resultIndex]).toLowerCase() : '';
  
  if (score > opponentScore) return 1; // Win
  if (score < opponentScore) return 2; // Loss
  if (score === opponentScore) return 3; // Draw
  return 2; // Default to loss
}

/**
 * Saves a snapshot of the current ladder data to the Ladder_Archive sheet.
 */
function saveLadderDataToSheet(ladderData) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName('Ladder_Archive');
  var now = new Date();
  
  if (!sheet) {
    Logger.log("ERROR: Ladder_Archive sheet not found. Skipping ladder save.");
    return;
  }
  
  var rows = ladderData.map(function(team) {
    return [
      now, 
      team.rk, 
      team.name, 
      team.P, 
      team.W, 
      team.L, 
      team.D, 
      team.F, 
      team.A, 
      team.PTS 
    ];
  });
  
  sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
  Logger.log("Ladder data saved successfully to Ladder_Archive.");
}

/**
 * Saves all match results (all rounds) to the Fixture_Results sheet.
 * (Logic remains the same, used only by getMatchResults when API is called)
 */
function saveAllFixtureResultsToSheet(roundsData) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName('Fixture_Results');
  
  if (!sheet) {
    Logger.log("ERROR: Fixture_Results sheet not found. Skipping fixture save.");
    return;
  }
  
  // Clear existing data (but keep the header row)
  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).clearContent();
  }
  
  var allRows = [];
  
  for (var i = 0; i < roundsData.length; i++) {
    var round = roundsData[i];
    var roundName = round.name;
    var matches = round.matches || [];
    
    for (var j = 0; j < matches.length; j++) {
      var match = matches[j];
      var result = match.team1ResultId === 1 ? "Win" : 
                   match.team2ResultId === 1 ? "Loss" : 
                   match.team1ResultId === 3 ? "Draw" : 
                   "N/A";

      allRows.push([
        new Date(match.startTime),
        roundName,
        match.id,
        match.team1.name, 
        match.team2.name, 
        match.team1Score,
        match.team2Score,
        result,
        match.matchStatus
      ]);
    }
  }
  
  // Save new data
  if (allRows.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, allRows.length, allRows[0].length).setValues(allRows);
    Logger.log("All historical fixture data saved successfully to Fixture_Results (" + allRows.length + " matches).");
  }
}


// === EXTERNAL API FETCH FUNCTIONS (Only called manually now) ===

/**
 * Fetches the current netball ladder standings (API call).
 * @returns {Array|Object} The ladder data array or an error object.
 */
function getLadderData() {
  const AUTH_TOKEN = loadAuthToken();
  if (!AUTH_TOKEN || AUTH_TOKEN === 'PASTE_NEW_TOKEN_HERE') {
    Logger.log("Token missing. Please set the Auth Token in the Admin view.");
    return { error: "Token missing. Please set the Auth Token in the Admin view." };
  }
  
  // URL to get the current ladder standings
  const url = "https://api-netball.squadi.com/livescores/teams/ladder/v2?divisionIds=26942&competitionKey=b8acc87f-8a28-4de7-b7b8-36209d56ace9&filteredOutCompStatuses=1&showForm=1&sportRefId=1";
  
  var options = {
    'method' : 'get',
    'headers': {
      'Authorization': AUTH_TOKEN, 
      'Accept': 'application/json',
      'Origin': 'https://registration.netballconnect.com', 
      'Referer': 'https://registration.netballconnect.com/', 
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.2 Safari/605.1.15', 
    },
    'muteHttpExceptions': true 
  };
  
  try {
    var response = UrlFetchApp.fetch(url, options);
    var responseCode = response.getResponseCode();
    
    if (responseCode === 200) {
        var data = JSON.parse(response.getContentText());
        var ladder = data.ladders || [];
        
        // Save the successful ladder data to the archive sheet
        if (ladder.length > 0) {
          saveLadderDataToSheet(ladder);
        }

        Logger.log("API Success. Teams loaded: " + (ladder ? ladder.length : 0));
        return ladder;
    } else {
        var errorText = response.getContentText().substring(0, 500);
        Logger.log("API FAILED with code: " + responseCode);
        Logger.log("Partial Error Body: " + errorText);
        return { error: "External API Error: " + responseCode };
    }
  } catch (e) {
    Logger.log("Fatal Error fetching data: " + e.message);
    return { error: "Network/System Error: " + e.message };
  }
}

/**
 * Fetches ALL match history for the season (round by round) (API call).
 * @returns {Array|Object} The rounds array or an error object.
 */
function getMatchResults() {
  const AUTH_TOKEN = loadAuthToken();
  if (!AUTH_TOKEN || AUTH_TOKEN === 'PASTE_NEW_TOKEN_HERE') {
    return { error: "Token missing. Please set the Auth Token in the Admin view." };
  }

  // URL that returns all rounds and matches
  const url = "https://api-netball.squadi.com/livescores/round/matches?competitionId=4171&divisionId=26942&teamIds=&ignoreStatuses=[1]"; 
  
  var options = {
    'method' : 'get',
    'headers': {
      'Authorization': AUTH_TOKEN, 
      'Accept': 'application/json',
      'Origin': 'https://registration.netballconnect.com', 
      'Referer': 'https://registration.netballconnect.com/', 
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.2 Safari/605.1.15', 
    },
    'muteHttpExceptions': true 
  };
  
  try {
    var response = UrlFetchApp.fetch(url, options);
    var responseCode = response.getResponseCode();
    
    if (responseCode === 200 || responseCode === 304) {
        var data = JSON.parse(response.getContentText());
        
        // Log the first round to see full structure
        if (data.rounds && data.rounds.length > 0) {
             Logger.log("First round from API: " + JSON.stringify(data.rounds[0]).substring(0, 500));
             if (data.rounds[0].matches && data.rounds[0].matches.length > 0) {
               Logger.log("First match from API: " + JSON.stringify(data.rounds[0].matches[0]));
             }
        }
        
        // Archive the fixture data immediately on successful fetch
        if (data.rounds && data.rounds.length > 0) {
             saveAllFixtureResultsToSheet(data.rounds);
             
             // Cache the FULL rounds data as JSON using CacheService (6 hours)
             try {
               var cache = CacheService.getScriptCache();
               var jsonString = JSON.stringify(data.rounds);
               Logger.log("Match results JSON size: " + jsonString.length + " bytes");
               
               // CacheService has 100KB limit per item, which should be enough
               cache.put('CACHED_MATCH_RESULTS', jsonString, 21600); // 6 hours
               Logger.log("Cached full match results with venue data in CacheService");
             } catch (e) {
               Logger.log("Failed to cache match results: " + e.message);
             }
        }
        
        // Return the FULL rounds data including all nested objects
        return data.rounds || [];
    } else {
        Logger.log("Fixture API FAILED with code: " + responseCode);
        return { error: "Fixture API Error: " + responseCode };
    }
  } catch (e) {
    Logger.log("Fatal Error fetching fixture: " + e.message);
    return { error: "Network/System Error: " + e.message };
  }
}

/**
 * Get cached match results (returns full nested data with venueCourt)
 */
function getCachedMatchResults() {
  try {
    var cache = CacheService.getScriptCache();
    var cached = cache.get('CACHED_MATCH_RESULTS');
    
    if (cached) {
      Logger.log("Returning cached match results from CacheService");
      return JSON.parse(cached);
    } else {
      Logger.log("No cached match results in CacheService (expired or not set), falling back to sheet archive");
      // Fallback to the old sheet-based method
      return loadArchivedMatchResults();
    }
  } catch (e) {
    Logger.log("Error reading cached match results: " + e.message);
    // Fallback to the old sheet-based method
    return loadArchivedMatchResults();
  }
}

// --- Admin convenience functions (owner-only) ---
function _requireOwnerOrThrow() {
  var props = PropertiesService.getScriptProperties();
  var owner = props.getProperty('OWNER_EMAIL') || '';
  var user = '';
  try { user = Session.getActiveUser().getEmail(); } catch (e) { user = ''; }
  if (owner && user !== owner) {
    throw new Error('Not authorized');
  }
  return true;
}

function setOwnerEmail(newEmail) {
  // Allow setting owner only by the current owner or if none set
  var props = PropertiesService.getScriptProperties();
  var currentOwner = props.getProperty('OWNER_EMAIL') || '';
  var caller = '';
  try { caller = Session.getActiveUser().getEmail(); } catch (e) { caller = ''; }
  if (currentOwner && caller !== currentOwner) {
    throw new Error('Not authorized');
  }
  props.setProperty('OWNER_EMAIL', String(newEmail || ''));
  return 'OK';
}

function setTestInsightsEnabled(enabled) {
  _requireOwnerOrThrow();
  var props = PropertiesService.getScriptProperties();
  props.setProperty('TEST_INSIGHTS_ENABLED', (enabled ? 'true' : 'false'));
  try {
    // Record an administrative telemetry event when the server flag is changed
    if (typeof recordTelemetry === 'function') {
      recordTelemetry('server.testInsightsToggled', { enabled: !!enabled, by: Session.getActiveUser ? (Session.getActiveUser().getEmail() || '') : '' });
    }
  } catch (e) {
    Logger.log('Telemetry record failed: ' + e.message);
  }
  return 'OK';
}

function getAdminSettings() {
  var props = PropertiesService.getScriptProperties();
  return {
    ownerEmail: props.getProperty('OWNER_EMAIL') || '',
    testInsightsEnabled: (props.getProperty('TEST_INSIGHTS_ENABLED') || 'false') === 'true'
  };
}

/**
 * Records a lightweight telemetry event to the `Telemetry` sheet.
 * Creates the sheet if it does not exist.
 * @param {string} eventName
 * @param {Object} payload
 */
function recordTelemetry(eventName, payload) {
  try {
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName('Telemetry');
    if (!sheet) {
      sheet = ss.insertSheet('Telemetry');
      sheet.appendRow(['timestamp', 'event', 'payload']);
    }
    var ts = new Date();
    var row = [ts, String(eventName || ''), JSON.stringify(payload || {})];
    sheet.appendRow(row);
    return 'OK';
  } catch (e) {
    Logger.log('recordTelemetry error: ' + e.message);
    return { error: e.message };
  }
}

// === TEAM DATA MANAGEMENT (No significant changes) ===

/**
 * Ensures the Teams sheet has all required columns (A-H).
 * Adds missing column headers if needed.
 */
function ensureTeamsSheetStructure() {
  try {
    var ss = getSpreadsheet();
    var teamsSheet = ss.getSheetByName('Teams');
    if (!teamsSheet) {
      Logger.log("Teams sheet not found!");
      return;
    }
    
    var headers = teamsSheet.getRange(1, 1, 1, 8).getValues()[0];
    var expectedHeaders = ['Team ID', 'Year', 'Season', 'Name', 'Sheet Name', 'Ladder Name', 'Ladder API', 'Results API'];
    var needsUpdate = false;
    
    for (var i = 0; i < expectedHeaders.length; i++) {
      if (!headers[i] || headers[i] === '') {
        headers[i] = expectedHeaders[i];
        needsUpdate = true;
      }
    }
    
    if (needsUpdate) {
      teamsSheet.getRange(1, 1, 1, 8).setValues([headers]);
      Logger.log("Updated Teams sheet headers: " + JSON.stringify(headers));
    }
  } catch (e) {
    Logger.log("Error in ensureTeamsSheetStructure: " + e.message);
  }
}

/**
 * Loads the master list of all teams from the 'Teams' sheet.
 */
function loadMasterTeamList() {
  try {
    Logger.log("loadMasterTeamList called");
    ensureTeamsSheetStructure(); // Ensure columns exist
    
    var ss = getSpreadsheet();
    var teamsSheet = ss.getSheetByName('Teams');
    var data = teamsSheet.getDataRange().getValues();
    data.shift(); 
    var teams = data.map(function(row) {
      var team = {
        teamID: row[0],
        year: row[1],
        season: row[2],
        name: row[3],
        sheetName: row[4],
        ladderName: row[5] || '', // Column F
        ladderApi: row[6] || '',  // Column G
        resultsApi: row[7] || ''  // Column H
      };
      Logger.log("Loaded team: " + team.name + ", ladderApi=" + team.ladderApi + ", resultsApi=" + team.resultsApi);
      return team;
    });
    Logger.log("Total teams loaded: " + teams.length);
    return teams;
  } catch (e) {
    Logger.log("Error in loadMasterTeamList: " + e.message);
    return { error: e.message };
  }
}

function createNewTeam(year, season, name, ladderName, ladderApi, resultsApi) {
  try {
    var ss = getSpreadsheet();
    var teamsSheet = ss.getSheetByName('Teams');
    var teamID = 'team_' + new Date().getTime(); 
    var sheetName = 'data_' + teamID; 
    var newTeamSheet = ss.insertSheet(sheetName);
    var initialData = { players: [], games: [] };
    newTeamSheet.getRange('A1').setValue(JSON.stringify(initialData));
    // Columns: teamID, year, season, name, sheetName, ladderName, ladderApi, resultsApi
    teamsSheet.appendRow([teamID, year, season, name, sheetName, ladderName || "", ladderApi || "", resultsApi || ""]); 
    return loadMasterTeamList();
  } catch (e) {
    Logger.log(e);
    return { error: e.message };
  }
}

function updateTeam(teamID, year, season, name, ladderName, ladderApi, resultsApi) {
  try {
    Logger.log("updateTeam called with: teamID=" + teamID + ", ladderApi=" + ladderApi + ", resultsApi=" + resultsApi);
    var ss = getSpreadsheet();
    var teamsSheet = ss.getSheetByName('Teams');
    var data = teamsSheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) { 
      if (data[i][0] == teamID) {
        var row = i + 1; 
        // Update columns B-H (skipping column E which is sheetName)
        var updateValues = [[year, season, name, data[i][4], ladderName || "", ladderApi || "", resultsApi || ""]];
        Logger.log("Updating row " + row + " with values: " + JSON.stringify(updateValues));
        teamsSheet.getRange(row, 2, 1, 7).setValues(updateValues); 
        Logger.log("Update successful, loading master team list");
        return loadMasterTeamList();
      }
    }
    throw new Error("Team not found for update.");
  } catch (e) {
    Logger.log("Error in updateTeam: " + e.message);
    return { error: e.message };
  }
}

function deleteTeam(teamID, sheetName) {
  try {
    var ss = getSpreadsheet();
    var dataSheet = ss.getSheetByName(sheetName);
    if (dataSheet) {
      ss.deleteSheet(dataSheet);
    }
    var teamsSheet = ss.getSheetByName('Teams');
    var data = teamsSheet.getDataRange().getValues();
    for (var i = data.length - 1; i >= 1; i--) { 
      if (data[i][0] == teamID) {
        teamsSheet.deleteRow(i + 1); 
        break;
      }
    }
    return loadMasterTeamList();
  } catch (e) {
    Logger.log(e);
    return { error: e.message };
  }
}

function loadTeamData(sheetName) {
  try {
    var ss = getSpreadsheet();
    var teamSheet = ss.getSheetByName(sheetName);
    if (!teamSheet) {
      throw new Error('Team data sheet not found: ' + sheetName);
    }
    var teamDataJSON = teamSheet.getRange('A1').getValue();
    var statsDataJSON = teamSheet.getRange('B1').getValue();
    return {
      teamData: teamDataJSON || '{"players":[],"games":[]}',
      statsData: statsDataJSON || null
    };
  } catch (e) {
    Logger.log(e);
    return { error: e.message };
  }
}

function saveTeamData(sheetName, teamDataJSON, statsDataJSON) {
  try {
    var ss = getSpreadsheet();
    var teamSheet = ss.getSheetByName(sheetName);
    if (!teamSheet) {
      throw new Error('Team data sheet not found: ' + sheetName);
    }
    teamSheet.getRange('A1').setValue(teamDataJSON);
    if (statsDataJSON) {
      teamSheet.getRange('B1').setValue(statsDataJSON);
    }
    return "OK";
  } catch (e) {
    Logger.log(e);
    return { error: e.message };
  }
}

// === MYGAMEDAY HTML PARSING FUNCTIONS ===

/**
 * Fetches and parses MyGameDay ladder data from HTML
 */
function fetchMyGameDayLadder(url) {
  try {
    var response = UrlFetchApp.fetch(url, {muteHttpExceptions: true});
    var html = response.getContentText();
    
    // Parse HTML table - looking for ladder table with POS, TEAM, P, W, L, D, etc.
    var teams = [];
    var tableRegex = /<table[^>]*>[\s\S]*?<\/table>/gi;
    var tables = html.match(tableRegex);
    
    if (!tables) return [];
    
    // Find the ladder table (contains POS, TEAM, P, W, L columns)
    for (var t = 0; t < tables.length; t++) {
      var tableHtml = tables[t];
      if (tableHtml.indexOf('POS') > -1 && tableHtml.indexOf('TEAM') > -1) {
        // Extract rows
        var rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
        var rows = tableHtml.match(rowRegex);
        
        if (!rows) continue;
        
        for (var i = 0; i < rows.length; i++) {
          var row = rows[i];
          // Skip header rows
          if (row.indexOf('<th') > -1) continue;
          
          // Extract cells
          var cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
          var cells = [];
          var match;
          while ((match = cellRegex.exec(row)) !== null) {
            var cellText = match[1]
              .replace(/<[^>]+>/g, '') // Remove HTML tags
              .replace(/&nbsp;/g, ' ')
              .replace(/\s+/g, ' ')
              .trim();
            cells.push(cellText);
          }
          
          // MyGameDay format: POS, TEAM, P, W, L, D, B, FF, FG, For, Agst, %, % Won
          if (cells.length >= 11) {
            teams.push({
              rk: parseInt(cells[0]) || 0,
              name: cells[1] || '',
              P: parseInt(cells[2]) || 0,
              W: parseInt(cells[3]) || 0,
              L: parseInt(cells[4]) || 0,
              D: parseInt(cells[5]) || 0,
              F: parseInt(cells[9]) || 0,  // For
              A: parseInt(cells[10]) || 0, // Agst
              PTS: parseInt(cells[3]) || 0 // Use wins as points
            });
          }
        }
        
        if (teams.length > 0) break;
      }
    }
    
    return teams;
  } catch (e) {
    Logger.log('Error fetching MyGameDay ladder: ' + e.message);
    return [];
  }
}

/**
 * Fetches and parses MyGameDay results data from HTML
 */
function fetchMyGameDayResults(url) {
  try {
    var response = UrlFetchApp.fetch(url, {muteHttpExceptions: true});
    var html = response.getContentText();
    
    var rounds = [];
    var currentRound = null;
    
    // Look for round headers and match data
    // MyGameDay format typically shows: Team1 Score vs Score Team2
    var lines = html.split('\n');
    var roundNumber = 1;
    
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      
      // Detect round headers - could be dates or "Round X"
      if (line.indexOf('Friday') > -1 || line.indexOf('Saturday') > -1 || 
          line.indexOf('Sunday') > -1 || line.indexOf('Thursday') > -1 ||
          line.indexOf('Monday') > -1 || line.indexOf('Tuesday') > -1 ||
          line.indexOf('Wednesday') > -1) {
        
        if (currentRound && currentRound.matches.length > 0) {
          rounds.push(currentRound);
        }
        
        currentRound = {
          name: 'Round ' + roundNumber,
          matches: []
        };
        roundNumber++;
      }
      
      // Look for FINAL indicator (completed match)
      if (line.indexOf('FINAL') > -1 && currentRound) {
        // Try to extract match data from surrounding context
        // This is approximate - MyGameDay HTML structure varies
        var matchContext = lines.slice(Math.max(0, i - 10), Math.min(lines.length, i + 5)).join(' ');
        
        // Try to extract team names and scores
        var scorePattern = /(\d+)\s+FINAL.*?(\d+)/;
        var scoreMatch = matchContext.match(scorePattern);
        
        if (scoreMatch) {
          var score1 = parseInt(scoreMatch[1]) || 0;
          var score2 = parseInt(scoreMatch[2]) || 0;
          
          currentRound.matches.push({
            team1: 'Team A', // Placeholder - would need more parsing
            team1Score: score1,
            team2: 'Team B',
            team2Score: score2,
            team1ResultId: score1 > score2 ? 1 : (score1 < score2 ? 2 : 3),
            team2ResultId: score2 > score1 ? 1 : (score2 < score1 ? 2 : 3)
          });
        }
      }
    }
    
    // Add last round
    if (currentRound && currentRound.matches.length > 0) {
      rounds.push(currentRound);
    }
    
    return rounds;
  } catch (e) {
    Logger.log('Error fetching MyGameDay results: ' + e.message);
    return [];
  }
}