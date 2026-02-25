/**
 * Bulk clears all logo fields from every team's data sheet in production.
 * Removes: logo, logoUrl, teamLogo, teamLogoUrl from each team's JSON in cell A1.
 * Run this once to reset all team logos to use club-level fallback.
 */
function clearAllTeamLogosInProduction() {
  var ss = getSpreadsheet();
  var teamsSheet = ss.getSheetByName('Teams');
  var data = teamsSheet.getDataRange().getValues();
  data.shift(); // Remove header
  var updatedCount = 0;
  data.forEach(function(row) {
    var sheetName = row[4]; // Sheet name is column E (index 4)
    if (!sheetName) return;
    var teamSheet = ss.getSheetByName(sheetName);
    if (!teamSheet) return;
    var teamDataJSON = teamSheet.getRange('A1').getValue();
    if (!teamDataJSON) return;
    var teamData;
    try {
      teamData = JSON.parse(teamDataJSON);
    } catch (e) {
      Logger.log('Could not parse team data for ' + sheetName + ': ' + e);
      return;
    }
    // Remove all logo fields
    delete teamData.logo;
    delete teamData.logoUrl;
    delete teamData.teamLogo;
    delete teamData.teamLogoUrl;
    // Optionally update last modified timestamp
    teamData._lastModified = Date.now();
    teamSheet.getRange('A1').setValue(JSON.stringify(teamData));
    updatedCount++;
  });
  Logger.log('Cleared logo fields for ' + updatedCount + ' teams.');
  return updatedCount;
}
// Spreadsheet ID for the HGNC data - update this if the spreadsheet changes
var SPREADSHEET_ID = '13Dxn41HZnClcpMeIzDXtxbhH-gDFtaIJsz5LV3hrE88';

/**
 * Helper function to get the spreadsheet (works better for anonymous access)
 */
function getSpreadsheet() {
  try {
    // For webapps, prioritize opening by ID since there's no active spreadsheet context
    return SpreadsheetApp.openById(SPREADSHEET_ID);
  } catch (e) {
    try {
      // Fallback to active spreadsheet (for container-bound scripts)
      return SpreadsheetApp.getActiveSpreadsheet();
    } catch (e2) {
      throw new Error('Unable to access spreadsheet. Please check permissions and spreadsheet ID.');
    }
  }
}

/**
   * Main entry point - serves HTML app or handles API requests
   */
  function doGet(e) {
    // Check if this is an API request from the PWA
    if (e && e.parameter && e.parameter.api === 'true') {
      return handleApiRequest(e);
    }

    // Otherwise serve the HTML app (your existing code)
    var template = HtmlService.createTemplateFromFile('index');

    var userEmail = '';
    try {
      userEmail = Session.getActiveUser().getEmail();
    } catch (err) {
      userEmail = '';
    }
    template.userEmail = userEmail;

    var props = PropertiesService.getScriptProperties();
    var ownerEmail = props.getProperty('OWNER_EMAIL') || 'caseytoll78@gmail.com';
    var testInsightsFlag = (props.getProperty('TEST_INSIGHTS_ENABLED') || 'false') === 'true';
    template.ownerEmail = ownerEmail;
    template.showTestInsights = testInsightsFlag;

    var timestamp = new Date().toISOString();
    var isOwner = userEmail === ownerEmail;
    Logger.log('ACCESS: ' + timestamp + ' | User: ' + (userEmail || 'Anonymous') + ' | Owner: ' + isOwner);

    try {
      template.logoDataUrl = getLogoDataUrl();
      template.teamPerformanceIconDataUrl = getTeamPerformanceIconDataUrl();
      template.offensiveLeadersIconDataUrl = getOffensiveLeadersIconDataUrl();
      template.defensiveWallIconDataUrl = getDefensiveWallIconDataUrl();
      template.playerAnalysisIconDataUrl = getPlayerAnalysisIconDataUrl();
      template.appVersion = '1.0.32';

      var result = template.evaluate()
          .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
      return result;

    } catch (error) {
      Logger.log('ERROR in doGet: ' + error.toString());
      var safeError = String(error).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
      return HtmlService.createHtmlOutput('<h1>Error</h1><p>' + safeError + '</p>')
          .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    }
  }

  /**
   * Handle POST requests for large data payloads (saveTeamData, savePlayerLibrary)
   */
  function doPost(e) {
    try {
      // Parse the POST body as JSON (if it exists)
      var postData = {};
      if (e.postData && e.postData.contents) {
        postData = JSON.parse(e.postData.contents);
      }
      var action = postData.action || e.parameter.action || '';
      var result = { success: false, error: 'Unknown action' };

      Logger.log('POST API Request: ' + action);

      switch (action) {
        case 'saveTeamData':
          var sheetNameSave = postData.sheetName || '';
          var teamDataJSON = postData.teamData || '';
          var clientLastModified = postData.clientLastModified || null;
          if (!sheetNameSave || !teamDataJSON) {
            result = { success: false, error: 'sheetName and teamData are required' };
          } else if (checkPinAuthBySheetName(sheetNameSave, postData.pinToken || '')) {
            result = { success: false, error: 'AUTH_REQUIRED', message: 'Invalid or expired access token' };
          } else {
            // teamData is already a string from the POST body
            var saveResult = saveTeamData(sheetNameSave, typeof teamDataJSON === 'string' ? teamDataJSON : JSON.stringify(teamDataJSON), null, clientLastModified);
            if (saveResult === "OK") {
              result = { success: true };
            } else if (saveResult && saveResult.error === 'STALE_DATA') {
              result = saveResult;
            } else {
              result = { success: false, error: saveResult.error || 'Save failed' };
            }
          }
          break;

        case 'savePlayerLibrary':
          var playerLibraryData = postData.playerLibrary || '';
          if (!playerLibraryData) {
            result = { success: false, error: 'playerLibrary is required' };
          } else {
            var saveLibraryResult = savePlayerLibrary(typeof playerLibraryData === 'string' ? playerLibraryData : JSON.stringify(playerLibraryData));
            if (saveLibraryResult === "OK") {
              result = { success: true };
            } else {
              result = { success: false, error: saveLibraryResult.error || 'Save failed' };
            }
          }
          break;

        case 'getAIInsights':
          var analyticsData = postData.analytics || null;
          if (!analyticsData) {
            result = { success: false, error: 'analytics data is required' };
          } else {
            try {
              var insights = getAIInsightsWithAnalytics(analyticsData);
              result = { success: true, insights: insights };
            } catch (aiErr) {
              result = { success: false, error: aiErr.message };
            }
          }
          break;

        case 'getGameAIInsights':
          var gameData = postData.gameData || null;
          if (!gameData) {
            result = { success: false, error: 'gameData is required' };
          } else {
            try {
              var gameInsights = getGameAIInsights(gameData);
              result = { success: true, insights: gameInsights };
            } catch (gameAiErr) {
              result = { success: false, error: gameAiErr.message };
            }
          }
          break;

        case 'getPlayerAIInsights':
          var playerData = postData.playerData || null;
          if (!playerData) {
            result = { success: false, error: 'playerData is required' };
          } else {
            try {
              var playerInsights = getPlayerAIInsights(playerData);
              result = { success: true, insights: playerInsights };
            } catch (playerAiErr) {
              result = { success: false, error: playerAiErr.message };
            }
          }
          break;

        case 'getTrainingFocus':
          var trainingData = postData.trainingData || null;
          if (!trainingData) {
            result = { success: false, error: 'trainingData is required' };
          } else {
            try {
              var trainingFocus = getTrainingFocus(trainingData);
              result = { success: true, suggestions: trainingFocus };
            } catch (trainingErr) {
              result = { success: false, error: trainingErr.message };
            }
          }
          break;

        case 'generateTrainingCorrelation':
          var corrTrainingData = postData.trainingData || null;
          if (!corrTrainingData) {
            result = { success: false, error: 'trainingData is required' };
          } else {
            try {
              result = generateTrainingCorrelation(corrTrainingData);
            } catch (corrErr) {
              result = { success: false, error: corrErr.message };
            }
          }
          break;

        case 'deleteTeam':
          var deleteTeamID = postData.teamID || e.parameter.teamID || '';
          if (!deleteTeamID) {
            result = { success: false, error: 'Missing teamID parameter' };
          } else {
            try {
              // Get team info first to find the sheet name
              var teams = loadMasterTeamList();
              if (teams.error) {
                result = { success: false, error: teams.error };
              } else {
                var teamToDelete = null;
                for (var i = 0; i < teams.length; i++) {
                  if (teams[i].teamID == deleteTeamID) {
                    teamToDelete = teams[i];
                    break;
                  }
                }
                if (!teamToDelete) {
                  result = { success: false, error: 'Team not found: ' + deleteTeamID };
                } else {
                  result = deleteTeam(deleteTeamID, teamToDelete.sheetName);
                }
              }
            } catch (errDelete) {
              Logger.log('deleteTeam error: ' + errDelete.message);
              result = { success: false, error: errDelete.message };
            }
          }
          break;

        default:
          result = { success: false, error: 'Unknown POST action: ' + action };
      }

      return ContentService
        .createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);

    } catch (err) {
      Logger.log('POST API Error: ' + err.message);
      return ContentService
        .createTextOutput(JSON.stringify({ success: false, error: err.message }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }

  /**
   * API handler for PWA requests
   * Call with: ?api=true&action=getTeams
   */
  function handleApiRequest(e) {
    var action = e.parameter.action || '';
    var result = { success: false, error: 'Unknown action' };

    Logger.log('API Request: ' + action + ' | Params: ' + JSON.stringify(e.parameter));

    try {
      switch (action) {

        case 'autodetectsquadi':
          try {
            var forceRescanParam = e.parameter.forceRescan === 'true';
            result = autoDetectSquadiConfig(forceRescanParam);
          } catch (errAutoDetect) {
            Logger.log('autoDetectSquadi error: ' + errAutoDetect.message);
            result = { success: false, error: errAutoDetect.message };
          }
          break;

        case 'ping':
          result = { success: true, message: 'pong', timestamp: new Date().toISOString() };
          break;

        case 'getTeams':
          // Instrumentation: measure cache read, teams load, cache put, and total time
          var apiStart = new Date().getTime();

          // Try script cache first (short TTL) to reduce response latency
          try {
            var cache = CacheService.getScriptCache();
            var cacheReadStart = Date.now();
            var cached = cache.get('getTeamsResponse');
            var cacheReadMs = Date.now() - cacheReadStart;
            if (cached) {
              Logger.log('getTeams: cache hit (read ' + cacheReadMs + 'ms)');
              try { logClientMetric('getTeams_cache_hit', cacheReadMs, 0, ''); } catch (e) { Logger.log('logClientMetric error: ' + e.message); }
              result = JSON.parse(cached);
              // Record total time (very small)
              try { logClientMetric('getTeams_totalMs', Date.now() - apiStart, (result.teams || []).length, 'cache-hit'); } catch (e) { Logger.log('logClientMetric error: ' + e.message); }
              break;
            } else {
              Logger.log('getTeams: cache miss (read ' + cacheReadMs + 'ms)');
              try { logClientMetric('getTeams_cache_miss_readMs', cacheReadMs, 0, ''); } catch (e) { Logger.log('logClientMetric error: ' + e.message); }
            }
          } catch (e) {
            Logger.log('getTeams: cache read failed: ' + e.message);
          }

          var teamsLoadStart = Date.now();
          var teams = loadMasterTeamList();
          var teamsLoadMs = Date.now() - teamsLoadStart;

          if (teams.error) {
            result = { success: false, error: teams.error };
          } else {
            // Transform to PWA format using precomputed playerCount from Teams sheet
            var pwaTeams = teams.map(function(t) {
              return {
                teamID: t.teamID,
                year: t.year,
                season: t.season,
                teamName: t.name,
                sheetName: t.sheetName,
                archived: t.archived || false,
                playerCount: t.playerCount || 0,
                ladderUrl: t.ladderApi || '',
                resultsApi: t.resultsApi || '',
                lastModified: t.lastModified || 0, // For version checking - clients can skip full fetch if unchanged
                hasPin: t.hasPin || false,
                coach: t.coach || ''
              };
            });

            result = { success: true, teams: pwaTeams };

            // Cache the response for 300s (5 minutes) and record put timing
            try {
              var cachePutStart = Date.now();
              cache.put('getTeamsResponse', JSON.stringify(result), 300);
              var cachePutMs = Date.now() - cachePutStart;
              Logger.log('getTeams: cached response for 300s (put ' + cachePutMs + 'ms)');
              try { logClientMetric('getTeams_cache_putMs', cachePutMs, pwaTeams.length, ''); } catch (e) { Logger.log('logClientMetric error: ' + e.message); }
            } catch (e) {
              Logger.log('getTeams: cache put failed: ' + e.message);
            }

            // Log loadMasterTeamList duration and overall timings
            try { logClientMetric('getTeams_loadMasterListMs', teamsLoadMs, pwaTeams.length, ''); } catch (e) { Logger.log('logClientMetric error: ' + e.message); }
          }

          var totalMs = Date.now() - apiStart;
          Logger.log('getTeams: total ' + totalMs + 'ms');
          try { logClientMetric('getTeams_totalMs', totalMs, (result.teams || []).length, ''); } catch (e) { Logger.log('logClientMetric error: ' + e.message); }
          break;

        case 'getTeamData':
          var sheetName = e.parameter.sheetName || '';
          var teamID = e.parameter.teamID || '';
          if (!sheetName) {
            result = { success: false, error: 'sheetName is required' };
          } else {
            var data = loadTeamData(sheetName);
            if (data.error) {
              result = { success: false, error: data.error };
            } else {
              // Parse the JSON and add teamID
              var teamData = JSON.parse(data.teamData || '{"players":[],"games":[]}');
              teamData.teamID = teamID;
              teamData.sheetName = sheetName;
              result = { success: true, teamData: teamData };
            }
          }
          break;

        // saveTeamData is POST-only (handled in doPost) — no GET handler

        case 'updateTeam':
          var updateTeamID = e.parameter.teamID || '';
          var settingsJSON = e.parameter.settings || '{}';
          if (!updateTeamID) {
            result = { success: false, error: 'teamID is required' };
          } else if (checkPinAuthByTeamID(updateTeamID, e.parameter.pinToken || '')) {
            result = { success: false, error: 'AUTH_REQUIRED', message: 'Invalid or expired access token' };
          } else {
            try {
              var settings = JSON.parse(settingsJSON);
              var updateResult = updateTeamSettings(updateTeamID, settings);
              if (updateResult.error) {
                result = { success: false, error: updateResult.error };
              } else {
                result = { success: true };
              }
            } catch (parseErr) {
              result = { success: false, error: 'Invalid settings JSON: ' + parseErr.message };
            }
          }
          break;

        case 'getTeamRow':
          var qTeamID = e.parameter.teamID || '';
          if (!qTeamID) {
            result = { success: false, error: 'teamID is required' };
          } else {
            try {
              var row = getTeamRowByID(qTeamID);
              if (row.error) {
                result = { success: false, error: row.error };
              } else {
                result = { success: true, row: row };
              }
            } catch (errGet) {
              result = { success: false, error: errGet.message };
            }
          }
          break;

        case 'logClientMetric':
          // Simple diagnostics logger - appends a row to Diagnostics sheet
          var metricName = e.parameter.name || '';
          var metricValue = e.parameter.value || '';
          var metricTeams = e.parameter.teams || '';
          var metricExtra = e.parameter.extra || '';
          if (!metricName) {
            result = { success: false, error: 'name parameter is required' };
          } else {
            try {
              var logResult = logClientMetric(metricName, metricValue, metricTeams, metricExtra);
              if (logResult.error) {
                result = { success: false, error: logResult.error };
              } else {
                result = { success: true };
              }
            } catch (errLog) {
              result = { success: false, error: errLog.message };
            }
          }
          break;

        case 'getDiagnostics':
          var limit = parseInt(e.parameter.limit || '50', 10) || 50;
          try {
            var diag = getDiagnostics(limit);
            result = { success: true, diagnostics: diag };
          } catch (errDiag) {
            result = { success: false, error: errDiag.message };
          }
          break;

        case 'validateTeamPIN':
          var pinTeamID = e.parameter.teamID || '';
          var pinAttempt = e.parameter.pin || '';
          if (!pinTeamID || !pinAttempt) {
            result = { success: false, error: 'teamID and pin are required' };
          } else {
            try {
              var pinInfo = getTeamPinInfo(pinTeamID);
              if (!pinInfo) {
                result = { success: false, error: 'Team not found' };
              } else if (!pinInfo.pin) {
                result = { success: false, error: 'Team has no PIN set' };
              } else {
                // Check against team PIN or master admin PIN
                var masterPin = '';
                try { masterPin = PropertiesService.getScriptProperties().getProperty('MASTER_PIN') || ''; } catch (e) {}
                if (String(pinAttempt) === String(pinInfo.pin) || (masterPin && String(pinAttempt) === String(masterPin))) {
                  result = { success: true, pinToken: pinInfo.pinToken };
                } else {
                  result = { success: false, error: 'Invalid PIN' };
                }
              }
            } catch (pinErr) {
              result = { success: false, error: pinErr.message };
            }
          }
          break;

        case 'setTeamPIN':
          var setPinTeamID = e.parameter.teamID || '';
          var newPin = e.parameter.pin !== undefined ? String(e.parameter.pin) : '';
          var setPinToken = e.parameter.pinToken || '';
          if (!setPinTeamID) {
            result = { success: false, error: 'teamID is required' };
          } else {
            try {
              var setPinInfo = getTeamPinInfo(setPinTeamID);
              if (!setPinInfo) {
                result = { success: false, error: 'Team not found' };
              } else {
                // If team already has a PIN, require valid auth to change it
                if (setPinInfo.pin && setPinToken !== setPinInfo.pinToken) {
                  result = { success: false, error: 'AUTH_REQUIRED', message: 'Invalid or expired access token' };
                } else if (newPin && !/^\d{4}$/.test(newPin)) {
                  result = { success: false, error: 'PIN must be exactly 4 digits' };
                } else {
                  var ss = getSpreadsheet();
                  var teamsSheet = ss.getSheetByName('Teams');
                  var newToken = '';
                  if (newPin) {
                    // Set or change PIN
                    newToken = generatePinToken();
                    teamsSheet.getRange(setPinInfo.rowIndex, 12).setValue(newPin);   // Column L
                    teamsSheet.getRange(setPinInfo.rowIndex, 13).setValue(newToken); // Column M
                  } else {
                    // Remove PIN
                    teamsSheet.getRange(setPinInfo.rowIndex, 12).setValue(''); // Column L
                    teamsSheet.getRange(setPinInfo.rowIndex, 13).setValue(''); // Column M
                  }
                  // Invalidate cache
                  try { CacheService.getScriptCache().remove('getTeamsResponse'); } catch (ce) {}
                  result = { success: true, pinToken: newToken };
                }
              }
            } catch (setPinErr) {
              result = { success: false, error: setPinErr.message };
            }
          }
          break;

        case 'revokeTeamAccess':
          var revokeTeamID = e.parameter.teamID || '';
          var revokeToken = e.parameter.pinToken || '';
          if (!revokeTeamID || !revokeToken) {
            result = { success: false, error: 'teamID and pinToken are required' };
          } else {
            try {
              var revokePinInfo = getTeamPinInfo(revokeTeamID);
              if (!revokePinInfo) {
                result = { success: false, error: 'Team not found' };
              } else if (!revokePinInfo.pin) {
                result = { success: false, error: 'Team has no PIN set' };
              } else if (revokeToken !== revokePinInfo.pinToken) {
                result = { success: false, error: 'AUTH_REQUIRED', message: 'Invalid or expired access token' };
              } else {
                // Generate new token, invalidating all other devices
                var newRevokeToken = generatePinToken();
                var ss = getSpreadsheet();
                var teamsSheet = ss.getSheetByName('Teams');
                teamsSheet.getRange(revokePinInfo.rowIndex, 13).setValue(newRevokeToken); // Column M
                // Invalidate cache
                try { CacheService.getScriptCache().remove('getTeamsResponse'); } catch (ce) {}
                result = { success: true, pinToken: newRevokeToken };
              }
            } catch (revokeErr) {
              result = { success: false, error: revokeErr.message };
            }
          }
          break;

        case 'createTeam':
          var createYear = e.parameter.year || new Date().getFullYear();
          var createSeason = e.parameter.season || 'Season 1';
          var createName = e.parameter.name || '';
          var createCoach = e.parameter.coach || '';
          var createLadderUrl = e.parameter.ladderUrl || '';
          var createResultsApi = e.parameter.resultsApi || '';
          if (!createName) {
            result = { success: false, error: 'Team name is required' };
          } else {
            var createResult = createNewTeam(createYear, createSeason, createName, '', createLadderUrl, createResultsApi, createCoach);
            if (createResult.error) {
              result = { success: false, error: createResult.error };
            } else {
              result = { success: true, teams: createResult };
            }
          }
          break;

        case 'getPlayerLibrary':
          var libraryData = loadPlayerLibrary();
          if (libraryData.error) {
            result = { success: false, error: libraryData.error };
          } else {
            result = { success: true, playerLibrary: libraryData };
          }
          break;

        case 'rebuildPlayerCounts':
          try {
            var rebuildResult = rebuildPlayerCounts();
            result = { success: true, result: rebuildResult };
          } catch (errRebuild) {
            result = { success: false, error: errRebuild.message };
          }
          break;

        // savePlayerLibrary is POST-only (handled in doPost) — no GET handler

        case 'getAIInsights':
          var insightsTeamID = e.parameter.teamID || '';
          var insightsSheetName = e.parameter.sheetName || '';
          if (!insightsTeamID || !insightsSheetName) {
            result = { success: false, error: 'teamID and sheetName are required' };
          } else {
            try {
              var insights = getAIInsights(insightsTeamID, insightsSheetName);
              result = { success: true, insights: insights };
            } catch (errInsights) {
              Logger.log('AI Insights error: ' + errInsights.message);
              result = { success: false, error: errInsights.message };
            }
          }
          break;

        case 'getFixtureData':
          var fixtureTeamID = e.parameter.teamID || '';
          var forceRefresh = e.parameter.forceRefresh === 'true';
          if (!fixtureTeamID) {
            result = { success: false, error: 'teamID is required' };
          } else {
            try {
              result = getFixtureDataForTeam(fixtureTeamID, forceRefresh);
            } catch (errFixture) {
              Logger.log('getFixtureData error: ' + errFixture.message);
              result = { success: false, error: errFixture.message };
            }
          }
          break;

        case 'getSquadiLadder':
          var ladderTeamID = e.parameter.teamID || '';
          var ladderRefresh = e.parameter.forceRefresh === 'true';
          if (!ladderTeamID) {
            result = { success: false, error: 'teamID is required' };
          } else {
            try {
              result = getSquadiLadderForTeam(ladderTeamID, ladderRefresh);
            } catch (errLadder) {
              Logger.log('getSquadiLadder error: ' + errLadder.message);
              result = { success: false, error: errLadder.message };
            }
          }
          break;

        case 'getTeamInfo':
          var infoTeamID = e.parameter.teamID || '';
          var infoForce = e.parameter.forceRefresh === 'true';
          if (!infoTeamID) {
            result = { success: false, error: 'teamID is required' };
          } else {
            try {
              result = getTeamInfo(infoTeamID, infoForce);
            } catch (errInfo) {
              Logger.log('getTeamInfo error: ' + errInfo.message);
              result = { success: false, error: errInfo.message };
            }
          }
          break;

        case 'discoverSquadiComps':
          var discoverOrgKey = e.parameter.orgKey || '';
          if (!discoverOrgKey) {
            result = { success: false, error: 'orgKey is required' };
          } else {
            try {
              result = discoverSquadiCompetitions(discoverOrgKey);
            } catch (errDiscover) {
              Logger.log('discoverSquadiComps error: ' + errDiscover.message);
              result = { success: false, error: errDiscover.message };
            }
          }
          break;

        case 'autoDetectSquadi':
          try {
            var forceRescanParam = e.parameter.forceRescan === 'true';
            result = autoDetectSquadiConfig(forceRescanParam);
          } catch (errAutoDetect) {
            Logger.log('autoDetectSquadi error: ' + errAutoDetect.message);
            result = { success: false, error: errAutoDetect.message };
          }
          break;

        case 'autodetectsquadi':
          try {
            var forceRescanParamLower = e.parameter.forceRescan === 'true';
            result = autoDetectSquadiConfig(forceRescanParamLower);
          } catch (errAutoDetectLower) {
            Logger.log('autoDetectSquadi error: ' + errAutoDetectLower.message);
            result = { success: false, error: errAutoDetectLower.message };
          }
          break;

        case 'deleteTeam':
          var deleteTeamID = e.parameter.teamID || '';
          if (!deleteTeamID) {
            result = { success: false, error: 'Missing teamID parameter' };
          } else {
            try {
              // Get team info first to find the sheet name
              var teams = loadMasterTeamList();
              if (teams.error) {
                result = { success: false, error: teams.error };
              } else {
                var teamToDelete = null;
                for (var i = 0; i < teams.length; i++) {
                  if (teams[i].teamID == deleteTeamID) {
                    teamToDelete = teams[i];
                    break;
                  }
                }
                if (!teamToDelete) {
                  result = { success: false, error: 'Team not found: ' + deleteTeamID };
                } else {
                  result = deleteTeam(deleteTeamID, teamToDelete.sheetName);
                }
              }
            } catch (errDelete) {
              Logger.log('deleteTeam error: ' + errDelete.message);
              result = { success: false, error: errDelete.message };
            }
          }
          break;

        case 'queueGameAI':
          var queueGameID = e.parameter.gameID || '';
          var queueSheetName = e.parameter.sheetName || '';
          var queueTeamID = e.parameter.teamID || '';
          var queueForce = e.parameter.forceRefresh === 'true';
          if (!queueGameID || !queueSheetName || !queueTeamID) {
            result = { success: false, error: 'Missing required params: gameID, sheetName, teamID' };
          } else {
            try {
              result = queueGameAI({ gameID: queueGameID, sheetName: queueSheetName, teamID: queueTeamID, forceRefresh: queueForce });
            } catch (errQueue) {
              Logger.log('queueGameAI error: ' + errQueue.message);
              result = { success: false, error: errQueue.message };
            }
          }
          break;

        case 'processAIQueueManual':
          try {
            processAIQueue();
            result = { success: true, message: 'Queue processing complete' };
          } catch (errProcess) {
            Logger.log('processAIQueueManual error: ' + errProcess.message);
            result = { success: false, error: errProcess.message };
          }
          break;

        case 'setupAIQueueTrigger':
          try {
            result = setupAIQueueTrigger();
          } catch (errTrigger) {
            Logger.log('setupAIQueueTrigger error: ' + errTrigger.message);
            result = { success: false, error: errTrigger.message };
          }
          break;

        case 'queueAllGames': {
          var qagForce = e.parameter.forceRefresh === 'true';
          try {
            result = queueAllGames(qagForce);
          } catch (errQAG) {
            Logger.log('queueAllGames error: ' + errQAG.message);
            result = { success: false, error: errQAG.message };
          }
          break;
        }

        case 'setupOppositionTriggers': {
          try {
            result = setupOppositionTriggers();
          } catch (errOppTrig) {
            Logger.log('setupOppositionTriggers error: ' + errOppTrig.message);
            result = { success: false, error: errOppTrig.message };
          }
          break;
        }

        case 'generatePatternDetector': {
          var pdTeamID = e.parameter.teamID || '';
          var pdSheetName = e.parameter.sheetName || '';
          var pdForce = e.parameter.forceRefresh === 'true';
          if (!pdTeamID || !pdSheetName) {
            result = { success: false, error: 'teamID and sheetName are required' };
          } else {
            try {
              result = generatePatternDetector(pdTeamID, pdSheetName, pdForce);
            } catch (errPD) {
              Logger.log('generatePatternDetector error: ' + errPD.message);
              result = { success: false, error: errPD.message };
            }
          }
          break;
        }

        case 'refreshOppositionMatches': {
          var oppTeamID = e.parameter.teamID || '';
          if (!oppTeamID) {
            result = { success: false, error: 'teamID is required' };
          } else {
            try {
              result = collectOppositionFixturesImmediate(oppTeamID);
            } catch (errOpp) {
              Logger.log('refreshOppositionMatches error: ' + errOpp.message);
              result = { success: false, error: errOpp.message };
            }
          }
          break;
        }

        case 'generateOppositionInsightsImmediate': {
          var genOppTeamID = e.parameter.teamID || '';
          var genOppRound = e.parameter.round || '0';
          var genOppGameID = e.parameter.gameID || '';
          if (!genOppTeamID) {
            result = { success: false, error: 'teamID is required' };
          } else {
            try {
              result = generateOppositionInsightsImmediately(genOppTeamID, genOppRound, genOppGameID);
            } catch (errGenOpp) {
              Logger.log('generateOppositionInsightsImmediate error: ' + errGenOpp.message);
              result = { success: false, error: errGenOpp.message };
            }
          }
          break;
        }

        case 'getOppositionScouting': {
          var getOppTeamID = e.parameter.teamID || '';
          var getOppOpponent = e.parameter.opponent || '';
          var getOppRound = e.parameter.round || '';
          if (!getOppTeamID || !getOppOpponent || !getOppRound) {
            result = { success: false, error: 'teamID, opponent, and round are required' };
          } else {
            try {
              var scoutingData = getOppositionScoutingData(getOppTeamID, getOppOpponent, parseInt(getOppRound, 10));
              result = scoutingData ? { success: true, data: scoutingData } : { success: false, error: 'No scouting data found' };
            } catch (errGetOpp) {
              Logger.log('getOppositionScouting error: ' + errGetOpp.message);
              result = { success: false, error: errGetOpp.message };
            }
          }
          break;
        }

        case 'processOppositionAIQueueManual': {
          try {
            processOppositionAIQueue();
            result = { success: true, message: 'Opposition queue processing complete' };
          } catch (errOppQueue) {
            Logger.log('processOppositionAIQueueManual error: ' + errOppQueue.message);
            result = { success: false, error: errOppQueue.message };
          }
          break;
        }

        case 'debugGameAI': {
          // Returns raw aiSummary (or absence) for a specific game — checks both A1 (merged) and C1 (raw AI map)
          var dbgSheet = e.parameter.sheetName || '';
          var dbgGameID = e.parameter.gameID || '';
          if (!dbgSheet || !dbgGameID) {
            result = { success: false, error: 'sheetName and gameID required' };
          } else {
            try {
              var dbgSS = getSpreadsheet();
              var dbgTeamSheet = dbgSS.getSheetByName(dbgSheet);
              if (!dbgTeamSheet) {
                result = { success: false, error: 'Sheet not found: ' + dbgSheet };
                break;
              }
              var dbgA1 = dbgTeamSheet.getRange('A1').getValue();
              var dbgC1 = dbgTeamSheet.getRange('C1').getValue();
              var dbgAIMap = {};
              if (dbgC1) { try { dbgAIMap = JSON.parse(dbgC1); } catch(e){} }
              var dbgAI = dbgAIMap[dbgGameID] || null;
              result = {
                success: true,
                gameID: dbgGameID,
                hasAISummary: !!dbgAI,
                aiSummaryKeys: dbgAI ? Object.keys(dbgAI) : null,
                generatedAt: dbgAI ? dbgAI.generatedAt : null,
                moduleVersion: dbgAI ? dbgAI.moduleVersion : null,
                a1Bytes: (dbgA1 || '').length,
                c1Bytes: (dbgC1 || '').length,
                c1GameCount: Object.keys(dbgAIMap).length
              };
            } catch (dbgErr) {
              result = { success: false, error: dbgErr.message };
            }
          }
          break;
        }

        default:
          result = { success: false, error: 'Unknown action: ' + action };
      }
    } catch (err) {
      Logger.log('API Error: ' + err.message);
      result = { success: false, error: err.message };
    }

    Logger.log('API Response: ' + JSON.stringify(result).substring(0, 500));

    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  }

/**
 * CDN base for assets hosted on jsDelivr.
 *
 * CDN_TAG pinning strategy:
 * - For development: use '@master' to always get latest assets
 * - For releases: pin to a specific commit SHA for immutability
 * - Format: '@COMMIT_SHA' or '@master' (see CODE_CLEANUP_2025_12_07.md)
 *
 * NOTE: This value is automatically updated by deploy script during releases.
 * Current HEAD commit is used to pin CDN references at deploy time.
 */
var CDN_TAG = '@9cef4a9';  // Updated to current HEAD with all assets; production releases pin to commit SHA
var CDN_BASE = 'https://cdn.jsdelivr.net/gh/caseytoll/hgnc-webapp' + CDN_TAG + '/assets/';

/**
 * Normalize icon content returned from partials so client receives a reliable value.
 * - If the file contains a data:image* prefix, return it.
 * - If it contains a bare base64 payload that looks like an SVG (PHN2Zy) or JPG (/9j/), prefix accordingly.
 * - If the input contains a comma-separated list of urls, return as-is after trimming.
 * - If absent or malformed, return CDN fallback value(s).
 */
function canonicalizeIconContent(rawContent, fallback) {
  try {
    var trimmed = (rawContent || '').toString().trim();
    if (!trimmed) return fallback instanceof Array ? fallback.join(', ') : String(fallback);

    // If comma-separated list, handle multi backgrounds
    if (trimmed.indexOf(',') !== -1) {
      var parts = trimmed.split(',').map(function(p) { return p.trim(); }).filter(Boolean);
      var out = parts.map(function(u) { return canonicalizeIconContent(u, null); }).filter(Boolean);
      if (out.length > 0) return out.join(', ');
    }

    // Already a proper data:image URL
    if (trimmed.indexOf('data:image') === 0) return trimmed;
    // A full http/https or absolute path should be returned as-is
    if (trimmed.indexOf('http') === 0 || trimmed.startsWith('/')) return trimmed;

    // Bare base64 heuristics
    if (/^\/9j\//.test(trimmed)) return 'data:image/jpeg;base64,' + trimmed;
    if (/^PHN2Zy/i.test(trimmed)) return 'data:image/svg+xml;base64,' + trimmed;
    if (/^[A-Za-z0-9\+/=\s]+$/.test(trimmed)) {
      // fallback to svg
      return 'data:image/svg+xml;base64,' + trimmed.replace(/\s+/g, '');
    }

    // If nothing matches return CDN fallback
    return fallback instanceof Array ? fallback.join(', ') : String(fallback);
  } catch (e) {
    return fallback instanceof Array ? fallback.join(', ') : String(fallback);
  }
}

/**
 * A helper function to include the content of other HTML files
 */
function include(filename) {
  // Map short names to full paths with .html extension
  var pathMap = {
    'styles': 'src/styles.html',
    'js-startup': 'src/includes/js-startup.html',
    'js-helpers': 'src/includes/js-helpers.html',
    'js-navigation': 'src/includes/js-navigation.html',
    'js-server-comms': 'src/includes/js-server-comms.html',
    'js-core-logic': 'src/includes/js-core-logic.html',
    'js-render': 'src/includes/js-render.html',
    'js-validation': 'src/includes/js-validation.html',
    'js-lineup-lazy': 'src/includes/js-lineup-lazy.html',
    'src/includes/inline-scripts-pre-main': 'src/includes/inline-scripts-pre-main.html',
    'src/includes/main-views': 'src/includes/main-views.html',
    'src/includes/js-dom-ready-init': 'src/includes/js-dom-ready-init.html'
  };

  var filePath = pathMap[filename] || filename;
  return HtmlService.createHtmlOutputFromFile(filePath).getContent();
}

/**
 * Returns the logo image as a data URL
 */
function getLogoDataUrl() {
  try {
    // Read the base64 data from the file
    // Note: file contains raw data URL, no HTML tags
    var logoContent = HtmlService.createHtmlOutputFromFile('src/icons/base-image-code').getContent();

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
    var content = HtmlService.createHtmlOutputFromFile('src/icons/team-performance-icon-code').getContent();
    var trimmed = content.trim();
    var fallback = CDN_BASE + 'team-performance-icon-source.jpeg';
    var result = canonicalizeIconContent(trimmed, fallback);
    Logger.log('Team Performance Icon - Raw: ' + trimmed.substring(0, 100) + '... Result: ' + result.substring(0, 100));
    return result;
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
    var content = HtmlService.createHtmlOutputFromFile('src/icons/offensive-leaders-icon-code').getContent();
    var trimmed = content.trim();
    var fallback = CDN_BASE + 'Offensive-Leaders-Icon.jpeg';
    return canonicalizeIconContent(trimmed, fallback);
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
    var content = HtmlService.createHtmlOutputFromFile('src/icons/defensive-wall-icon-code').getContent();
    var trimmed = content.trim();
    var fallback = CDN_BASE + 'Defensive-Wall-Icon.jpeg';
    return canonicalizeIconContent(trimmed, fallback);
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
    var content = HtmlService.createHtmlOutputFromFile('src/icons/player-analysis-icon-code').getContent();
    var trimmed = content.trim();
    // Prefer CDN fallback if the server-stored asset is an inline SVG placeholder
    var fallback = [CDN_BASE + 'player-analysis-icon.webp', CDN_BASE + 'player-analysis-icon-small.png'];
    return canonicalizeIconContent(trimmed, fallback);
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
    var ss = getSpreadsheet();
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

    if (responseCode === 200) {
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

               // CacheService has 100KB limit per item
               if (jsonString.length > 100000) {
                 Logger.log("WARNING: Match results JSON (" + jsonString.length + " bytes) exceeds 100KB CacheService limit. Skipping cache.");
               } else {
                 cache.put('CACHED_MATCH_RESULTS', jsonString, 21600); // 6 hours
                 Logger.log("Cached full match results with venue data in CacheService");
               }
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

// --- Parameterized Squadi Fixture API ---

/**
 * Fetch fixture data from Squadi API for any competition/division.
 * Parameterized version of getMatchResults().
 * @param {number} competitionId
 * @param {number} divisionId
 * @returns {Object} { success, rounds, division } or { error }
 */
function fetchSquadiFixtures(competitionId, divisionId) {
  var AUTH_TOKEN = loadAuthToken();
  if (!AUTH_TOKEN || AUTH_TOKEN === 'PASTE_NEW_TOKEN_HERE') {
    return { error: 'AUTH_TOKEN_MISSING', message: 'Squadi auth token not configured' };
  }

  var url = 'https://api-netball.squadi.com/livescores/round/matches'
    + '?competitionId=' + competitionId
    + '&divisionId=' + divisionId
    + '&teamIds=&ignoreStatuses=%5B1%5D';

  var options = {
    'method': 'get',
    'headers': {
      'Authorization': AUTH_TOKEN,
      'Accept': 'application/json',
      'Origin': 'https://registration.netballconnect.com',
      'Referer': 'https://registration.netballconnect.com/',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.2 Safari/605.1.15'
    },
    'muteHttpExceptions': true
  };

  try {
    var response = UrlFetchApp.fetch(url, options);
    var responseCode = response.getResponseCode();

    if (responseCode === 200) {
      var data = JSON.parse(response.getContentText());
      return { success: true, rounds: data.rounds || [], division: data.division || {} };
    } else if (responseCode === 401) {
      return { error: 'AUTH_TOKEN_EXPIRED', message: 'Squadi auth token needs refreshing' };
    } else {
      Logger.log('Squadi API error: ' + responseCode);
      return { error: 'Squadi API Error: ' + responseCode };
    }
  } catch (e) {
    Logger.log('Squadi fetch error: ' + e.message);
    return { error: 'Network error: ' + e.message };
  }
}

/**
 * Discover Squadi competitions for a given organisation key.
 * Tries multiple API endpoint patterns to find competitions and divisions.
 * Admin/diagnostic tool — not for regular use.
 * @param {string} orgKey - Organisation unique key (UUID)
 * @returns {Object} { success, results } with data from each endpoint tried
 */
function discoverSquadiCompetitions(orgKey) {
  var AUTH_TOKEN = loadAuthToken();
  if (!AUTH_TOKEN || AUTH_TOKEN === 'PASTE_NEW_TOKEN_HERE') {
    return { success: false, error: 'AUTH_TOKEN_MISSING' };
  }

  var headers = {
    'Authorization': AUTH_TOKEN,
    'Accept': 'application/json',
    'Origin': 'https://registration.netballconnect.com',
    'Referer': 'https://registration.netballconnect.com/',
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.2 Safari/605.1.15'
  };

  var options = { 'method': 'get', 'headers': headers, 'muteHttpExceptions': true };

  // Try multiple API endpoint patterns across different WSA/Squadi domains
  var endpoints = [
    { name: 'livescores-comp-post', url: 'https://api-netball.squadi.com/livescores/competitions', method: 'post', body: { organisationKey: orgKey } },
    { name: 'wsa-comp', url: 'https://netball-comp-api.worldsportaction.com/api/competitions?organisationUniqueKey=' + orgKey },
    { name: 'wsa-comp-list', url: 'https://netball-comp-api.worldsportaction.com/api/competitionlist?organisationUniqueKey=' + orgKey + '&yearRefId=5' },
    { name: 'wsa-livescores', url: 'https://netball-livescores-api.worldsportaction.com/api/competitions?organisationUniqueKey=' + orgKey },
    { name: 'wsa-livescores-v2', url: 'https://netball-livescores-api.worldsportaction.com/livescores/competitions?organisationKey=' + orgKey },
    { name: 'squadi-comp-org', url: 'https://api-netball.squadi.com/api/organisation/' + orgKey + '/competitions' },
    { name: 'squadi-comp-post', url: 'https://api-netball.squadi.com/api/competitions', method: 'post', body: { organisationUniqueKey: orgKey, yearRefId: 5 } },
    { name: 'comp-api-v1', url: 'https://competition-api-netball.squadi.com/api/competitions?organisationUniqueKey=' + orgKey }
  ];

  var results = [];

  for (var i = 0; i < endpoints.length; i++) {
    var ep = endpoints[i];
    try {
      var fetchOpts = { 'headers': headers, 'muteHttpExceptions': true };
      if (ep.method === 'post') {
        fetchOpts.method = 'post';
        fetchOpts.contentType = 'application/json';
        fetchOpts.payload = JSON.stringify(ep.body || {});
      } else {
        fetchOpts.method = 'get';
      }
      var response = UrlFetchApp.fetch(ep.url, fetchOpts);
      var code = response.getResponseCode();
      var respBody = response.getContentText();
      var preview = respBody.substring(0, 2000);

      if (code === 200) {
        try {
          var parsed = JSON.parse(respBody);
          results.push({ name: ep.name, status: code, data: parsed });
        } catch (parseErr) {
          results.push({ name: ep.name, status: code, preview: preview });
        }
      } else {
        results.push({ name: ep.name, status: code, preview: respBody.substring(0, 500) });
      }
    } catch (fetchErr) {
      results.push({ name: ep.name, error: fetchErr.message });
    }
  }

  return { success: true, orgKey: orgKey, results: results };
}

/**
 * Ensures the Squadi_Lookup sheet exists with correct headers.
 * Creates it if missing.
 */
function ensureSquadiLookupSheet() {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName('Squadi_Lookup');
  if (!sheet) {
    sheet = ss.insertSheet('Squadi_Lookup');
    sheet.getRange(1, 1, 1, 7).setValues([['CompetitionId', 'CompetitionName', 'OrgKey', 'DivisionId', 'DivisionName', 'TeamName', 'DiscoveredAt']]);
    Logger.log('Created Squadi_Lookup sheet');
  }
  return sheet;
}

/**
 * Scan Squadi competition IDs to find divisions with HG teams.
 * Uses the PUBLIC fixture API (no auth token required).
 * Writes discovered data to Squadi_Lookup sheet.
 * @param {boolean} forceRescan - Clear existing data and rescan from default start
 * @returns {Object} { success, scannedRange, found }
 */
function scanSquadiCompetitions(forceRescan) {
  var SCAN_LOCK_KEY = 'SQUADI_SCAN_LOCK';
  var props = PropertiesService.getScriptProperties();

  // Check scan lock (7-minute expiry)
  var lockVal = props.getProperty(SCAN_LOCK_KEY);
  if (lockVal) {
    var lockTime = parseInt(lockVal, 10);
    if (Date.now() - lockTime < 7 * 60 * 1000) {
      return { success: false, error: 'Scan already in progress. Try again in a few minutes.' };
    }
  }

  // Set lock
  props.setProperty(SCAN_LOCK_KEY, String(Date.now()));

  try {
    var sheet = ensureSquadiLookupSheet();
    var startId = 4640; // Default start: just before known Nillumbik Force comp

    if (forceRescan) {
      // Clear existing data (keep headers)
      var lastRow = sheet.getLastRow();
      if (lastRow > 1) {
        sheet.getRange(2, 1, lastRow - 1, 7).clearContent();
      }
    } else {
      // Find max competition ID already scanned
      var lastRow = sheet.getLastRow();
      if (lastRow > 1) {
        var existingIds = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
        for (var i = 0; i < existingIds.length; i++) {
          var id = parseInt(existingIds[i][0], 10);
          if (id > startId) startId = id;
        }
      }
    }

    var scanFrom = startId + 1;
    var scanTo = scanFrom + 200;
    var consecutiveMisses = 0;
    var found = [];
    var newRows = [];

    for (var compId = scanFrom; compId <= scanTo; compId++) {
      // Stop after 50 consecutive misses
      if (consecutiveMisses >= 50) break;

      try {
        var url = 'https://api-netball.squadi.com/livescores/round/matches'
          + '?competitionId=' + compId
          + '&divisionId=&teamIds=&ignoreStatuses=%5B1%5D';

        var response = UrlFetchApp.fetch(url, {
          'method': 'get',
          'headers': {
            'Accept': 'application/json',
            'Origin': 'https://registration.netballconnect.com',
            'Referer': 'https://registration.netballconnect.com/',
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15'
          },
          'muteHttpExceptions': true
        });

        var code = response.getResponseCode();
        if (code !== 200) {
          consecutiveMisses++;
          Utilities.sleep(50);
          continue;
        }

        var data = JSON.parse(response.getContentText());
        var rounds = data.rounds || [];
        if (rounds.length === 0) {
          consecutiveMisses++;
          Utilities.sleep(50);
          continue;
        }

        // Extract competition name and org key from first round's division data
        var compName = data.division ? (data.division.competitionName || '') : '';
        var orgKey = '';

        // Collect all divisions and team names from all matches
        var divisionMap = {};
        for (var r = 0; r < rounds.length; r++) {
          var matches = rounds[r].matches || [];
          for (var m = 0; m < matches.length; m++) {
            var match = matches[m];
            var divId = match.divisionId || '';
            var divName = match.divisionName || match.division || '';
            if (!divId) continue;

            if (!divisionMap[divId]) {
              divisionMap[divId] = { divisionName: divName, teams: {} };
            }

            // Check both team names for "HG" or "Hazel Glen" prefix
            var team1 = (match.team1 && match.team1.name) ? match.team1.name : '';
            var team2 = (match.team2 && match.team2.name) ? match.team2.name : '';

            var isHGTeam = function(teamName) {
              if (!teamName) return false;
              var upper = teamName.toUpperCase();
              return upper.indexOf('HG ') === 0 || upper.indexOf('HAZEL GLEN') === 0;
            };

            if (isHGTeam(team1)) {
              divisionMap[divId].teams[team1] = true;
            }
            if (isHGTeam(team2)) {
              divisionMap[divId].teams[team2] = true;
            }
          }
        }

        // Check if any division has HG teams
        var compEntry = { competitionId: compId, competitionName: compName, divisions: [] };
        var hasHG = false;
        var now = new Date().toISOString();

        var divKeys = Object.keys(divisionMap);
        for (var d = 0; d < divKeys.length; d++) {
          var dId = divKeys[d];
          var dInfo = divisionMap[dId];
          var teamNames = Object.keys(dInfo.teams);
          if (teamNames.length > 0) {
            hasHG = true;
            compEntry.divisions.push({ divisionId: dId, divisionName: dInfo.divisionName, teams: teamNames });
            // Add rows for sheet
            for (var t = 0; t < teamNames.length; t++) {
              newRows.push([compId, compName, orgKey, dId, dInfo.divisionName, teamNames[t], now]);
            }
          }
        }

        if (hasHG) {
          found.push(compEntry);
          consecutiveMisses = 0;
        } else {
          consecutiveMisses++;
        }

      } catch (fetchErr) {
        Logger.log('Scan error for compId ' + compId + ': ' + fetchErr.message);
        consecutiveMisses++;
      }

      Utilities.sleep(100);
    }

    // Write discovered rows to sheet
    if (newRows.length > 0) {
      var writeRow = sheet.getLastRow() + 1;
      sheet.getRange(writeRow, 1, newRows.length, 7).setValues(newRows);
      Logger.log('Wrote ' + newRows.length + ' rows to Squadi_Lookup');
    }

    return {
      success: true,
      scannedRange: [scanFrom, compId - 1],
      found: found,
      newRowsWritten: newRows.length
    };

  } finally {
    // Release lock
    props.deleteProperty(SCAN_LOCK_KEY);
  }
}

/**
 * Auto-detect Squadi config for HG teams.
 * Returns cached lookup data or triggers a scan.
 * @param {boolean} forceRescan - Force a fresh scan
 * @returns {Object} { success, competitions }
 */
function autoDetectSquadiConfig(forceRescan) {
  var sheet = ensureSquadiLookupSheet();
  var lastRow = sheet.getLastRow();

  // If we have cached data and not forcing rescan, return it
  if (!forceRescan && lastRow > 1) {
    var data = sheet.getRange(2, 1, lastRow - 1, 7).getValues();
    return { success: true, competitions: groupLookupData(data), fromCache: true };
  }

  // Run scan
  var scanResult = scanSquadiCompetitions(forceRescan);
  if (!scanResult.success) return scanResult;

  // Re-read sheet for complete data
  var finalLastRow = sheet.getLastRow();
  if (finalLastRow <= 1) {
    return { success: true, competitions: [], scannedRange: scanResult.scannedRange, message: 'No HG teams found' };
  }

  var allData = sheet.getRange(2, 1, finalLastRow - 1, 7).getValues();
  return {
    success: true,
    competitions: groupLookupData(allData),
    scannedRange: scanResult.scannedRange,
    newRowsWritten: scanResult.newRowsWritten
  };
}

/**
 * Groups flat Squadi_Lookup rows into competition > division > teams hierarchy.
 */
function groupLookupData(rows) {
  var compMap = {};
  for (var i = 0; i < rows.length; i++) {
    var compId = String(rows[i][0]);
    var compName = rows[i][1] || '';
    var orgKey = rows[i][2] || '';
    var divId = String(rows[i][3]);
    var divName = rows[i][4] || '';
    var teamName = rows[i][5] || '';

    if (!compMap[compId]) {
      compMap[compId] = { id: compId, name: compName, orgKey: orgKey, divisions: {} };
    }
    if (!compMap[compId].divisions[divId]) {
      compMap[compId].divisions[divId] = { id: divId, name: divName, teams: [] };
    }
    compMap[compId].divisions[divId].teams.push(teamName);
  }

  // Convert to arrays
  var result = [];
  var compKeys = Object.keys(compMap);
  for (var c = 0; c < compKeys.length; c++) {
    var comp = compMap[compKeys[c]];
    var divs = [];
    var divKeys = Object.keys(comp.divisions);
    for (var d = 0; d < divKeys.length; d++) {
      divs.push(comp.divisions[divKeys[d]]);
    }
    result.push({ id: comp.id, name: comp.name, orgKey: comp.orgKey, divisions: divs });
  }
  return result;
}

/**
 * Get fixture data for a specific team, using its ResultsApi config.
 * Caches results in CacheService for 6 hours.
 * @param {string} teamID
 * @param {boolean} forceRefresh - bypass cache
 * @returns {Object} { success, teamFixtures, divisionResults } or { success:false, error }
 */
function getFixtureDataForTeam(teamID, forceRefresh) {
  // Load team's ResultsApi config
  var teams = loadMasterTeamList();
  if (teams.error) throw new Error(teams.error);

  var team = null;
  for (var i = 0; i < teams.length; i++) {
    if (teams[i].teamID == teamID) { team = teams[i]; break; }
  }
  if (!team) throw new Error('Team not found: ' + teamID);
  if (!team.resultsApi) throw new Error('No fixture config for this team');

  var config;
  try {
    config = JSON.parse(team.resultsApi);
  } catch (e) {
    throw new Error('Invalid fixture config JSON: ' + e.message);
  }

  // Check cache (include config hash so changes like roundOffset invalidate cache)
  var configStr = JSON.stringify(config);
  var configHash = 0;
  for (var ch = 0; ch < configStr.length; ch++) {
    configHash = ((configHash << 5) - configHash + configStr.charCodeAt(ch)) | 0;
  }
  var cacheKey = 'FIXTURE_' + teamID + '_' + Math.abs(configHash) + '_v2';
  if (!forceRefresh) {
    try {
      var cache = CacheService.getScriptCache();
      var cached = cache.get(cacheKey);
      if (cached) {
        Logger.log('Returning cached fixture data for team ' + teamID);
        return JSON.parse(cached);
      }
    } catch (e) {
      Logger.log('Cache read error: ' + e.message);
    }
  }

  var result;
  if (config.source === 'gameday') {
    result = fetchGameDayFixtureData(config);
  } else if (config.source === 'squadi') {
    if (!config.competitionId || !config.divisionId || !config.squadiTeamName) {
      throw new Error('Incomplete Squadi config: need competitionId, divisionId, squadiTeamName');
    }
    result = fetchSquadiFixtureData(config);
  } else {
    throw new Error('Unknown fixture source: ' + config.source);
  }

  if (!result.success) return result;

  // Cache the result (6 hours)
  try {
    var cache2 = CacheService.getScriptCache();
    var jsonStr = JSON.stringify(result);
    if (jsonStr.length <= 100000) {
      cache2.put(cacheKey, jsonStr, 21600);
      Logger.log('Cached fixture data for team ' + teamID + ' (' + jsonStr.length + ' bytes)');
    } else {
      Logger.log('Fixture data too large to cache (' + jsonStr.length + ' bytes)');
    }
  } catch (e) {
    Logger.log('Cache write error: ' + e.message);
  }

  return result;
}

/**
 * Fetch and transform Squadi fixture data into standardised format.
 */
function fetchSquadiFixtureData(config) {
  var apiResult = fetchSquadiFixtures(config.competitionId, config.divisionId);
  if (apiResult.error) {
    return { success: false, error: apiResult.error, message: apiResult.message || apiResult.error };
  }

  var teamFixtures = [];
  var divisionResults = [];
  var squadiName = config.squadiTeamName.toLowerCase();

  for (var r = 0; r < apiResult.rounds.length; r++) {
    var round = apiResult.rounds[r];
    var roundName = round.name || ('Round ' + (r + 1));
    var roundNum = parseInt(roundName.replace(/[^0-9]/g, ''), 10) || (r + 1);
    var roundMatches = [];

    for (var m = 0; m < round.matches.length; m++) {
      var match = round.matches[m];
      var t1Name = (match.team1 && match.team1.name) || '';
      var t2Name = (match.team2 && match.team2.name) || '';

      var isTeam1 = t1Name.toLowerCase() === squadiName;
      var isTeam2 = t2Name.toLowerCase() === squadiName;

      if (isTeam1 || isTeam2) {
        var opponent = isTeam1 ? t2Name : t1Name;
        var ourScore = null;
        var theirScore = null;
        var ourResultId = isTeam1 ? match.team1ResultId : match.team2ResultId;

        var status = 'upcoming';
        if (ourResultId === 7) {
          status = 'bye';
          opponent = 'Bye';
        } else if (ourResultId === 9) {
          status = 'abandoned';
        } else if (match.matchStatus === 'ENDED' && ourResultId != null) {
          status = 'normal';
          ourScore = isTeam1 ? match.team1Score : match.team2Score;
          theirScore = isTeam1 ? match.team2Score : match.team1Score;
        } else if (match.team1Score != null && match.team2Score != null && match.startTime) {
          // Check if game has scores and date has passed - treat as completed even if status isn't 'ENDED'
          var gameDateTime = new Date(match.startTime);
          var now = new Date();
          if (gameDateTime < now) {
            status = 'normal';
            ourScore = isTeam1 ? match.team1Score : match.team2Score;
            theirScore = isTeam1 ? match.team2Score : match.team1Score;
            Logger.log('Game marked as completed due to scores and past date: ' + match.id + ', date: ' + match.startTime);
          }
        }

        var date = '';
        var time = '';
        if (match.startTime) {
          var dt = new Date(match.startTime);
          date = Utilities.formatDate(dt, Session.getScriptTimeZone(), 'yyyy-MM-dd');
          time = Utilities.formatDate(dt, Session.getScriptTimeZone(), 'h:mm a');
        }

        var venue = '';
        var venueDetails = {};
        if (match.venueCourt) {
          var courtName = match.venueCourt.name || '';
          var venueName = (match.venueCourt.venue && match.venueCourt.venue.shortName) || '';
          venue = venueName ? (venueName + ' ' + courtName) : courtName;

          // Extract detailed venue information
          venueDetails = {
            courtName: courtName,
            courtNumber: match.venueCourt.courtNumber || null,
            venueName: match.venueCourt.venue ? match.venueCourt.venue.name : '',
            venueShortName: venueName,
            street: match.venueCourt.venue ? match.venueCourt.venue.street1 : '',
            suburb: match.venueCourt.venue ? match.venueCourt.venue.suburb : '',
            lat: match.venueCourt.lat || null,
            lng: match.venueCourt.lng || null,
            venueLat: match.venueCourt.venue ? match.venueCourt.venue.lat : null,
            venueLng: match.venueCourt.venue ? match.venueCourt.venue.lng : null
          };
        }

        // Extract team information including logos and IDs
        var opponentTeam = isTeam1 ? match.team2 : match.team1;
        var opponentDetails = {
          id: opponentTeam.id,
          name: opponentTeam.name,
          logoUrl: opponentTeam.logoUrl,
          teamUniqueKey: opponentTeam.teamUniqueKey,
          alias: opponentTeam.alias
        };

        teamFixtures.push({
          matchId: match.id,
          roundName: roundName,
          roundNum: roundNum,
          opponent: opponent,
          opponentDetails: opponentDetails,
          date: date,
          time: time,
          venue: venue,
          venueDetails: venueDetails,
          status: status,
          ourScore: ourScore,
          theirScore: theirScore,
          lineupConfirmed: isTeam1 ? match.team1LineupConfirmed : match.team2LineupConfirmed,
          opponentLineupConfirmed: isTeam1 ? match.team2LineupConfirmed : match.team1LineupConfirmed,
          hasPenalty: match.hasPenalty || false,
          livestreamUrl: match.livestreamURL,
          matchDuration: match.matchDuration,
          isResultsLocked: match.isResultsLocked || false
        });
      }

      roundMatches.push({
        matchId: match.id,
        team1: t1Name,
        team2: t2Name,
        score1: match.team1Score,
        score2: match.team2Score,
        team1ResultId: match.team1ResultId,
        team2ResultId: match.team2ResultId,
        status: match.matchStatus === 'ENDED' ? 'ended' : 'upcoming'
      });
    }

    divisionResults.push({
      roundName: roundName,
      roundNum: roundNum,
      matches: roundMatches
    });
  }

  teamFixtures.sort(function(a, b) { return a.roundNum - b.roundNum; });
  divisionResults.sort(function(a, b) { return a.roundNum - b.roundNum; });

  return {
    success: true,
    teamFixtures: teamFixtures,
    divisionResults: divisionResults,
    divisionName: (apiResult.division && apiResult.division.name) || ''
  };
}


/**
 * Assemble a consolidated team info payload combining sheet data and Squadi-derived metadata.
 * Returned keys: success, info: { teamID, sheetName, ourLogo, nextFixture, ladder, lastUpdated }
 */
function getTeamInfo(teamID, forceRefresh) {
  var cacheKey = 'TEAM_INFO_' + teamID;
  try {
    if (!forceRefresh) {
      try {
        var cache = CacheService.getScriptCache();
        var cached = cache.get(cacheKey);
        if (cached) {
          return JSON.parse(cached);
        }
      } catch (e) {
        Logger.log('getTeamInfo: cache read failed: ' + e.message);
      }
    }

    var teams = loadMasterTeamList();
    if (teams.error) throw new Error(teams.error);

    var team = null;
    for (var i = 0; i < teams.length; i++) {
      if (teams[i].teamID == teamID) { team = teams[i]; break; }
    }
    if (!team) throw new Error('Team not found: ' + teamID);

    var sheetName = team.sheetName;
    var sheetData = loadTeamData(sheetName);
    if (sheetData.error) throw new Error(sheetData.error);
    var teamData = {};
    try { teamData = JSON.parse(sheetData.teamData || '{"players":[],"games":[]}'); } catch (e) { teamData = sheetData.teamData || {}; }

    var info = {
      teamID: teamID,
      sheetName: sheetName,
      ourLogo: teamData.logoUrl || teamData.teamLogo || teamData.teamLogoUrl || teamData.logo || null,
      lastUpdated: Date.now(),
      nextFixture: null,
      ladder: null
    };

    // Derive club slug and include it in the response for client-side logic
    function _deriveClubSlug(name) {
      if (!name) return 'hazel-glen';
      var n = String(name).toLowerCase().trim();
      if (n.indexOf('hg ') === 0 || n.indexOf('hazel') === 0) return 'hazel-glen';
      if (n.indexOf('dc') === 0 || n.indexOf('dandenong') === 0) return 'dcgarnets';
      if (n.indexOf('montmorency') === 0) return 'montmorency';
      if (n.indexOf('titans') === 0) return 'titans';
      // fallback: slugify first two words
      var toks = n.split(/\s+/).slice(0,2).join('-').replace(/[^a-z0-9-]+/g,'-').replace(/(^-|-$)/g,'');
      return toks || 'hazel-glen';
    }

    info.clubSlug = _deriveClubSlug(team.teamName || teamData.teamName || 'hazel-glen');

    // If no explicit team logo, prefer club-level PNG asset (server-side fallback)
    if (!info.ourLogo) {
      // Prefer PNG filenames — the client now uses `data/club-logos.json` for exact mapping.
      info.ourLogo = '/assets/team-logos/' + info.clubSlug + '.png';
      // Last-resort fallback kept for legacy filenames
      if (!info.ourLogo) info.ourLogo = '/assets/team-logos/hg13fury.png';
    }

    // If we have a Squadi config, try to enrich with fixture and ladder info
    if (team.resultsApi) {
      try {
        var config = JSON.parse(team.resultsApi);
        if (config.source === 'squadi') {
          // Get fixtures for this team
          try {
            var fixturesRes = getFixtureDataForTeam(teamID, forceRefresh);
            if (fixturesRes && fixturesRes.success && Array.isArray(fixturesRes.teamFixtures)) {
              // Pick next upcoming fixture (first with status 'upcoming' or 'normal' and not a bye)
              var next = null;
              for (var f = 0; f < fixturesRes.teamFixtures.length; f++) {
                var tf = fixturesRes.teamFixtures[f];
                if (tf.status === 'bye') continue;
                // Choose upcoming first, otherwise accept normal future matches
                if (!next && (tf.status === 'upcoming' || tf.status === 'normal')) next = tf;
              }
              if (next) info.nextFixture = next;
            }
          } catch (e) {
            Logger.log('getTeamInfo: fixture fetch failed: ' + e.message);
          }

          // Ladder and logo from Squadi ladder api
          try {
            var ladderRes = getSquadiLadderForTeam(teamID, forceRefresh);
            if (ladderRes && ladderRes.success && ladderRes.ladder) {
              info.ladder = ladderRes.ladder;
              // If ourLogo missing, try ladder Logo column for this team
              if (!info.ourLogo && Array.isArray(ladderRes.ladder.rows)) {
                // Use robust matching (slug compare / contains) to prefer Squadi ladder logo when available
                var teamSlug = (teamData.teamName || team.name || '').toString().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                for (var r = 0; r < ladderRes.ladder.rows.length; r++) {
                  var row = ladderRes.ladder.rows[r] || {};
                  var rowName = (row.TEAM || '').toString().toLowerCase();
                  var rowSlug = rowName.replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

                  // exact slug match, or substring match as fallback
                  if ((rowSlug && rowSlug === teamSlug) || (rowName && rowName.indexOf((teamData.teamName || team.name || '').toString().toLowerCase()) !== -1)) {
                    if (row.Logo) { info.ourLogo = row.Logo; break; }
                  }
                }
              }
            }
          } catch (e) {
            Logger.log('getTeamInfo: ladder fetch failed: ' + e.message);
          }
        }
      } catch (e) {
        Logger.log('getTeamInfo: invalid resultsApi JSON: ' + e.message);
      }
    }

    var out = { success: true, info: info };
    try {
      var cache2 = CacheService.getScriptCache();
      cache2.put(cacheKey, JSON.stringify(out), 600); // cache 10 minutes
    } catch (e) {}
    return out;
  } catch (e) {
    Logger.log('getTeamInfo fatal: ' + e.message);
    return { success: false, error: e.message };
  }
}

/**
 * Fetch fixture data from GameDay (mygameday.app) by scraping the embedded
 * `var matches` JavaScript array from the public HTML pages.
 *
 * Config fields: { source:'gameday', compID, client, teamName }
 *   - compID:    GameDay competition ID (e.g. "655969")
 *   - client:    GameDay client string (e.g. "0-9074-0-655969-0")
 *   - teamName:  Team name as it appears on GameDay (e.g. "Hazel Glen 6")
 *
 * @param {Object} config - parsed ResultsApi JSON
 * @returns {Object} { success, teamFixtures, divisionResults, divisionName }
 */
function fetchGameDayFixtureData(config) {
  if (!config.compID || !config.client || !config.teamName) {
    return { success: false, error: 'Incomplete GameDay config: need compID, client, teamName' };
  }

  // Step 1: Fetch the fixture page to discover maxRounds
  var baseUrl = 'https://websites.mygameday.app/comp_info.cgi';
  var firstUrl = baseUrl + '?a=ROUND&round=1&client=' + config.client + '&pool=1';

  var fetchOpts = {
    'method': 'get',
    'muteHttpExceptions': true,
    'headers': {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15'
    }
  };

  try {
    var firstResponse = UrlFetchApp.fetch(firstUrl, fetchOpts);
    if (firstResponse.getResponseCode() !== 200) {
      return { success: false, error: 'GameDay returned HTTP ' + firstResponse.getResponseCode() };
    }

    var firstHtml = firstResponse.getContentText();
    var maxRoundsMatch = firstHtml.match(/maxRounds\s*=\s*(\d+)/);
    var maxRounds = maxRoundsMatch ? parseInt(maxRoundsMatch[1], 10) : 1;
    Logger.log('GameDay: maxRounds = ' + maxRounds + ' for compID ' + config.compID);

    // Step 2: Fetch all rounds (we already have round 1)
    var allMatches = extractGameDayMatches(firstHtml);

    if (maxRounds > 1) {
      var urls = [];
      for (var r = 2; r <= maxRounds; r++) {
        urls.push(baseUrl + '?a=ROUND&round=' + r + '&client=' + config.client + '&pool=1');
      }
      // UrlFetchApp.fetchAll for parallel requests
      var requests = urls.map(function(u) {
        return { 'url': u, 'method': 'get', 'muteHttpExceptions': true, 'headers': fetchOpts.headers };
      });
      var responses = UrlFetchApp.fetchAll(requests);
      for (var i = 0; i < responses.length; i++) {
        if (responses[i].getResponseCode() === 200) {
          var roundMatches = extractGameDayMatches(responses[i].getContentText());
          allMatches = allMatches.concat(roundMatches);
        }
      }
    }

    Logger.log('GameDay: total matches extracted = ' + allMatches.length);

    // Step 3: Transform into our standard format
    var teamName = config.teamName.toLowerCase();
    var roundOffset = parseInt(config.roundOffset, 10) || 0;
    var teamFixtures = [];
    var roundsMap = {};  // roundNum -> { roundName, matches[] }

    for (var j = 0; j < allMatches.length; j++) {
      var gm = allMatches[j];
      var rawRound = parseInt(gm.Round, 10) || 0;
      var roundNum = rawRound + roundOffset;
      var roundName = 'Round ' + roundNum;
      var matchId = parseInt(gm.FixtureID, 10) || 0;

      // Build division results for all matches
      if (!roundsMap[roundNum]) {
        roundsMap[roundNum] = { roundName: roundName, roundNum: roundNum, matches: [] };
      }

      var gmStatus = 'upcoming';
      if (parseInt(gm.isBye, 10) === 1) {
        gmStatus = 'bye';
      } else if (parseInt(gm.PastGame, 10) === 1 && gm.FinalisationString === 'FINAL') {
        gmStatus = 'normal';
      } else if (parseInt(gm.PastGame, 10) === 1) {
        gmStatus = 'normal';
      }

      roundsMap[roundNum].matches.push({
        matchId: matchId,
        team1: gm.HomeName || '',
        team2: gm.AwayName || '',
        score1: parseInt(gm.HomeScore, 10) || 0,
        score2: parseInt(gm.AwayScore, 10) || 0,
        status: gmStatus === 'upcoming' ? 'upcoming' : 'ended'
      });

      // Check if our team is involved
      var homeName = (gm.HomeNameFMT || gm.HomeName || '').toLowerCase();
      var awayName = (gm.AwayNameFMT || gm.AwayName || '').toLowerCase();
      var isHome = homeName === teamName;
      var isAway = awayName === teamName;

      if (isHome || isAway) {
        var opponent = isHome ? (gm.AwayName || '') : (gm.HomeName || '');
        var ourScore = null;
        var theirScore = null;
        var fixtureStatus = 'upcoming';

        if (parseInt(gm.isBye, 10) === 1) {
          fixtureStatus = 'bye';
          opponent = 'Bye';
        } else if (parseInt(gm.PastGame, 10) === 1) {
          fixtureStatus = 'normal';
          ourScore = parseInt(isHome ? gm.HomeScore : gm.AwayScore, 10) || 0;
          theirScore = parseInt(isHome ? gm.AwayScore : gm.HomeScore, 10) || 0;
        }

        // Parse date/time from TimeDateRaw (format: "2025-11-21 19:25:00")
        var date = '';
        var time = '';
        if (gm.TimeDateRaw) {
          var parts = gm.TimeDateRaw.split(' ');
          date = parts[0] || '';
          if (parts[1]) {
            // Convert "19:25:00" to "7:25 PM"
            var timeParts = parts[1].split(':');
            var hours = parseInt(timeParts[0], 10);
            var minutes = timeParts[1] || '00';
            var ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12;
            if (hours === 0) hours = 12;
            time = hours + ':' + minutes + ' ' + ampm;
          }
        }

        teamFixtures.push({
          matchId: matchId,
          roundName: roundName,
          roundNum: roundNum,
          opponent: opponent,
          date: date,
          time: time,
          venue: gm.VenueName || gm.Venue || '',
          status: fixtureStatus,
          ourScore: ourScore,
          theirScore: theirScore
        });
      }
    }

    // Convert roundsMap to sorted array
    var divisionResults = [];
    var roundNums = Object.keys(roundsMap).sort(function(a, b) { return a - b; });
    for (var k = 0; k < roundNums.length; k++) {
      divisionResults.push(roundsMap[roundNums[k]]);
    }

    teamFixtures.sort(function(a, b) { return a.roundNum - b.roundNum; });

    return {
      success: true,
      teamFixtures: teamFixtures,
      divisionResults: divisionResults,
      divisionName: allMatches.length > 0 ? (allMatches[0].CompName || '') : ''
    };

  } catch (e) {
    Logger.log('GameDay fetch error: ' + e.message);
    return { success: false, error: 'GameDay error: ' + e.message };
  }
}

/**
 * Extract the `var matches = [...]` JavaScript array from a GameDay HTML page.
 * @param {string} html - Full HTML page content
 * @returns {Array} Array of match objects
 */
function extractGameDayMatches(html) {
  var matchesRegex = /var\s+matches\s*=\s*(\[[\s\S]*?\]);/;
  var found = html.match(matchesRegex);
  if (!found || !found[1]) return [];

  try {
    return JSON.parse(found[1]);
  } catch (e) {
    Logger.log('Failed to parse GameDay matches JSON: ' + e.message);
    return [];
  }
}

/**
 * Get ladder data for a specific team, using its ResultsApi config.
 * Supports both Squadi (API) and GameDay (computed from fixture results).
 * Caches results in CacheService for 1 hour.
 * @param {string} teamID
 * @param {boolean} forceRefresh - bypass cache
 * @returns {Object} { success, ladder: { headers, rows }, divisionName, lastUpdated }
 */
function getSquadiLadderForTeam(teamID, forceRefresh) {
  var teams = loadMasterTeamList();
  if (teams.error) throw new Error(teams.error);

  var team = null;
  for (var i = 0; i < teams.length; i++) {
    if (teams[i].teamID == teamID) { team = teams[i]; break; }
  }
  if (!team) throw new Error('Team not found: ' + teamID);
  if (!team.resultsApi) throw new Error('No fixture config for this team');

  var config;
  try {
    config = JSON.parse(team.resultsApi);
  } catch (e) {
    throw new Error('Invalid ResultsApi JSON: ' + e.message);
  }

  var cacheKey = 'LADDER_' + teamID;
  if (!forceRefresh) {
    try {
      var cache = CacheService.getScriptCache();
      var cached = cache.get(cacheKey);
      if (cached) {
        Logger.log('Returning cached ladder for team ' + teamID);
        return JSON.parse(cached);
      }
    } catch (e) {
      Logger.log('Cache read error: ' + e.message);
    }
  }

  var result;
  if (config.source === 'gameday') {
    result = computeGameDayLadder(config, teamID);
  } else if (config.source === 'squadi') {
    if (!config.divisionId || !config.competitionKey) {
      throw new Error('Squadi config missing divisionId or competitionKey');
    }
    result = fetchSquadiLadderData(config);
  } else {
    throw new Error('Unknown ladder source: ' + config.source);
  }

  if (!result.success) return result;

  // Cache for 1 hour
  try {
    var cacheObj = CacheService.getScriptCache();
    var jsonStr = JSON.stringify(result);
    if (jsonStr.length <= 100000) {
      cacheObj.put(cacheKey, jsonStr, 3600);
    }
  } catch (e) {
    Logger.log('Ladder cache write error: ' + e.message);
  }

  return result;
}

/**
 * Fetch Squadi ladder from API.
 */
function fetchSquadiLadderData(config) {
  var AUTH_TOKEN = loadAuthToken();
  if (!AUTH_TOKEN || AUTH_TOKEN === 'PASTE_NEW_TOKEN_HERE') {
    return { success: false, error: 'AUTH_TOKEN_MISSING' };
  }

  var url = 'https://api-netball.squadi.com/livescores/teams/ladder/v2'
    + '?divisionIds=' + config.divisionId
    + '&competitionKey=' + config.competitionKey
    + '&filteredOutCompStatuses=1&showForm=1&sportRefId=1';

  var options = {
    'method': 'get',
    'headers': {
      'Authorization': AUTH_TOKEN,
      'Accept': 'application/json',
      'Origin': 'https://registration.netballconnect.com',
      'Referer': 'https://registration.netballconnect.com/',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.2 Safari/605.1.15'
    },
    'muteHttpExceptions': true
  };

  try {
    var response = UrlFetchApp.fetch(url, options);
    var responseCode = response.getResponseCode();

    if (responseCode === 401) {
      return { success: false, error: 'AUTH_TOKEN_EXPIRED' };
    }
    if (responseCode !== 200) {
      return { success: false, error: 'Squadi API Error: ' + responseCode };
    }

    var data = JSON.parse(response.getContentText());
    var ladders = data.ladders || [];

    if (ladders.length === 0) {
      return { success: true, ladder: null, divisionName: '', lastUpdated: new Date().toISOString(), message: 'No ladder data available' };
    }

    var headers = ['POS', 'TEAM', 'P', 'W', 'L', 'D', 'FF', 'FG', 'For', 'Agst', '% Won', 'PTS', 'GD', 'PPG', 'Logo'];
    var rows = ladders.map(function(entry) {
      return {
        'POS': entry.rk || '',
        'TEAM': entry.name || '',
        'P': entry.P || '0',
        'W': entry.W || '0',
        'L': entry.L || '0',
        'D': entry.D || '0',
        'FF': entry.FL || '0',
        'FG': entry.FW || '0',
        'For': entry.F || '0',
        'Agst': entry.A || '0',
        '% Won': entry.win ? (parseFloat(entry.win) * 100).toFixed(0) + '%' : '0%',
        'PTS': entry.PTS || '0',
        'GD': entry.goalDifference || '0',
        'PPG': entry.ppg ? parseFloat(entry.ppg).toFixed(2) : '0.00',
        'Logo': entry.logoUrl || ''
      };
    });

    return {
      success: true,
      ladder: { headers: headers, rows: rows },
      divisionName: ladders[0].divisionName || '',
      lastUpdated: new Date().toISOString(),
      squadiTeamName: config.squadiTeamName || ''
    };
  } catch (e) {
    Logger.log('Squadi ladder fetch error: ' + e.message);
    return { success: false, error: 'Network error: ' + e.message };
  }
}

/**
 * Compute ladder standings from GameDay fixture results.
 * Fetches all match data and calculates W/L/D/For/Against for each team.
 */
function computeGameDayLadder(config, teamID) {
  // Get fixture data (uses cache if available)
  var fixtureResult = fetchGameDayFixtureData(config);
  if (!fixtureResult.success) return fixtureResult;

  // Build standings from divisionResults
  var standings = {};  // teamName -> { P, W, L, D, For, Agst }

  for (var r = 0; r < fixtureResult.divisionResults.length; r++) {
    var round = fixtureResult.divisionResults[r];
    for (var m = 0; m < round.matches.length; m++) {
      var match = round.matches[m];
      if (match.status !== 'ended') continue;

      var t1 = match.team1;
      var t2 = match.team2;
      var s1 = parseInt(match.score1, 10) || 0;
      var s2 = parseInt(match.score2, 10) || 0;

      if (!t1 || !t2) continue;

      if (!standings[t1]) standings[t1] = { P: 0, W: 0, L: 0, D: 0, For: 0, Agst: 0 };
      if (!standings[t2]) standings[t2] = { P: 0, W: 0, L: 0, D: 0, For: 0, Agst: 0 };

      standings[t1].P++;
      standings[t2].P++;
      standings[t1].For += s1;
      standings[t1].Agst += s2;
      standings[t2].For += s2;
      standings[t2].Agst += s1;

      if (s1 > s2) {
        standings[t1].W++;
        standings[t2].L++;
      } else if (s2 > s1) {
        standings[t2].W++;
        standings[t1].L++;
      } else {
        standings[t1].D++;
        standings[t2].D++;
      }
    }
  }

  // Sort by: Points (W*4 + D*2), then percentage
  var teamNames = Object.keys(standings);
  teamNames.sort(function(a, b) {
    var ptsA = standings[a].W * 4 + standings[a].D * 2;
    var ptsB = standings[b].W * 4 + standings[b].D * 2;
    if (ptsB !== ptsA) return ptsB - ptsA;
    // Tiebreak by percentage
    var pctA = standings[a].Agst > 0 ? (standings[a].For / standings[a].Agst * 100) : 0;
    var pctB = standings[b].Agst > 0 ? (standings[b].For / standings[b].Agst * 100) : 0;
    return pctB - pctA;
  });

  var headers = ['POS', 'TEAM', 'P', 'W', 'L', 'D', 'For', 'Agst', '%', '% Won', 'PTS'];
  var rows = teamNames.map(function(name, idx) {
    var s = standings[name];
    var pts = s.W * 4 + s.D * 2;
    var pct = s.Agst > 0 ? (s.For / s.Agst * 100).toFixed(1) : '0.0';
    var winPct = s.P > 0 ? (s.W / s.P * 100).toFixed(0) + '%' : '0%';
    return {
      'POS': String(idx + 1),
      'TEAM': name,
      'P': String(s.P),
      'W': String(s.W),
      'L': String(s.L),
      'D': String(s.D),
      'For': String(s.For),
      'Agst': String(s.Agst),
      '%': pct,
      '% Won': winPct,
      'PTS': String(pts)
    };
  });

  return {
    success: true,
    ladder: { headers: headers, rows: rows },
    divisionName: fixtureResult.divisionName || '',
    lastUpdated: new Date().toISOString(),
    gamedayTeamName: config.teamName || ''
  };
}

// === AI QUEUE MANAGEMENT (Phase 1: Background Infrastructure) ===

/**
 * Computes a short hash of the game fields that matter for AI analysis.
 * Only scores, lineup positions/goals, quarter notes, and captain are included.
 * Metadata changes (location, date, opponent name) do NOT change the hash.
 * @param {Object} game - Game object from team data
 * @returns {string} 16-char hex hash
 */
function calculateGameDataHash(game) {
  // Sheet format stores quarters as array: [{positions, ourGsGoals, ourGaGoals, opponentGsGoals, opponentGaGoals, notes}]
  // Only hash the fields AI actually analyzes (positions, goals, notes, captain)
  var relevantData = {
    quarters: (game.quarters || []).map(function(q) {
      return {
        positions: q.positions || null,
        ourGsGoals: q.ourGsGoals || 0,
        ourGaGoals: q.ourGaGoals || 0,
        opponentGsGoals: q.opponentGsGoals || 0,
        opponentGaGoals: q.opponentGaGoals || 0,
        notes: q.notes || null
      };
    }),
    captain: game.captain || null
  };
  var jsonStr = JSON.stringify(relevantData);
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, jsonStr);
  return bytes.map(function(b) {
    return ('0' + (b & 0xff).toString(16)).slice(-2);
  }).join('').substring(0, 16);
}

/**
 * Queue a game for background AI summary generation.
 * Stores job in PropertiesService with key: ai_queue_{gameID}_{sheetName}
 * Uses hash-based change detection — won't re-queue if data is unchanged.
 * @param {Object} params - { gameID, sheetName, teamID, forceRefresh }
 * @returns {Object} { success, message }
 */
function queueGameAI(params) {
  try {
    var gameID = params.gameID;
    var sheetName = params.sheetName;
    var teamID = params.teamID;
    var forceRefresh = params.forceRefresh || false;

    if (!gameID || !sheetName || !teamID) {
      return { success: false, error: 'Missing required params: gameID, sheetName, teamID' };
    }

    var teamDataResult = loadTeamData(sheetName);
    if (!teamDataResult || !teamDataResult.teamData) {
      return { success: false, error: 'Team data not found for sheet: ' + sheetName };
    }

    var parsed;
    try {
      parsed = JSON.parse(teamDataResult.teamData);
    } catch (e) {
      return { success: false, error: 'Invalid team data JSON' };
    }

    var game = null;
    var games = parsed.games || [];
    for (var i = 0; i < games.length; i++) {
      // Sheet format uses 'id'; PWA format uses 'gameID' — support both
      if (games[i].id === gameID || games[i].gameID === gameID) {
        game = games[i];
        break;
      }
    }

    if (!game) {
      return { success: false, error: 'Game not found: ' + gameID };
    }

    // Require a played game (status=normal) with at least one quarter of positions
    if (game.status !== 'normal') {
      return { success: false, error: 'Game status is not normal (status: ' + game.status + ')' };
    }
    var quarters = game.quarters || [];
    var hasPositions = quarters.some(function(q) { return q && q.positions && Object.keys(q.positions).length > 0; });
    if (!hasPositions) {
      return { success: false, error: 'Game has no lineup data yet' };
    }

    var currentHash = calculateGameDataHash(game);

    // Skip if data unchanged and not forced
    if (!forceRefresh && game.aiSummary && game.aiSummary.gameDataHash === currentHash) {
      return { success: true, message: 'AI summary already up-to-date (hash unchanged)', skipped: true };
    }

    // Use canonical game ID from the sheet record (may be 'id' or 'gameID')
    var canonicalGameID = game.id || game.gameID || gameID;

    var props = PropertiesService.getScriptProperties();
    var queueKey = 'ai_queue_' + canonicalGameID + '_' + sheetName;

    var job = {
      gameID: canonicalGameID,
      sheetName: sheetName,
      teamID: teamID,
      type: 'game_summary',
      queuedAt: new Date().toISOString(),
      lastKnownHash: currentHash,
      forceRefresh: forceRefresh,
      attempts: 0,
      lastError: null,
      priority: 1
    };

    props.setProperty(queueKey, JSON.stringify(job));
    Logger.log('queueGameAI: queued ' + queueKey);
    return { success: true, message: 'Game queued for AI processing', queued: true };
  } catch (e) {
    Logger.log('queueGameAI error: ' + e.message);
    return { success: false, error: e.message };
  }
}

/**
 * Retrieve all queued AI jobs from PropertiesService.
 * Filters for keys starting with 'ai_queue_'.
 * @returns {Array} Array of { key, job } objects
 */
function getQueuedJobs() {
  var props = PropertiesService.getScriptProperties();
  var allProps = props.getProperties();
  var jobs = [];
  var keys = Object.keys(allProps);
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    if (key.indexOf('ai_queue_') === 0) {
      try {
        var job = JSON.parse(allProps[key]);
        jobs.push({ key: key, job: job });
      } catch (e) {
        Logger.log('getQueuedJobs: could not parse job ' + key + ': ' + e.message);
      }
    }
  }
  return jobs;
}

/**
 * Ensures the AI_Knowledge_Base sheet exists with correct headers.
 * Creates it if missing. Safe to call on every trigger run (fast if already exists).
 * @returns {Sheet} The AI_Knowledge_Base sheet
 */
function ensureAIKnowledgeBaseSheet() {
  var ss = getSpreadsheet();
  var sheetName = 'AI_Knowledge_Base';
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow([
      'Timestamp', 'TeamID', 'GameID', 'ModuleType', 'Status',
      'GameDataHash', 'OutputJSON', 'ModelUsed', 'TokensUsed',
      'ProcessingTimeMs', 'Attempts', 'LastError', 'Version', 'CacheUntil', 'Notes'
    ]);
    Logger.log('ensureAIKnowledgeBaseSheet: created AI_Knowledge_Base sheet');
  }
  return sheet;
}

// === AI PHASE 2: EVENT ANALYZER (Structured JSON Output) ===

/**
 * Pre-compute player stats from the quarters array.
 * Deterministic — no AI needed. Returns a map of playerName → stats.
 * @param {Array} quarters - Sheet format quarters array
 * @returns {Object} { playerName: { quartersPlayed, positions, goals } }
 */
function computePlayerStatsFromQuarters(quarters) {
  var stats = {};
  var quarterNames = ['Q1', 'Q2', 'Q3', 'Q4'];

  (quarters || []).forEach(function(q, idx) {
    var qName = quarterNames[idx] || ('Q' + (idx + 1));
    var positions = q.positions || {};
    var scoringPositions = { GS: q.ourGsGoals || 0, GA: q.ourGaGoals || 0 };

    Object.keys(positions).forEach(function(pos) {
      var name = positions[pos];
      if (!name) return;
      if (!stats[name]) stats[name] = { quartersPlayed: 0, positions: [], goals: 0, positionMap: {} };
      stats[name].quartersPlayed++;
      if (stats[name].positions.indexOf(pos) === -1) stats[name].positions.push(pos);
      // Track goals scored (GS and GA positions only)
      if (scoringPositions[pos] !== undefined) {
        stats[name].goals += scoringPositions[pos];
      }
    });
  });

  return stats;
}

/**
 * Phase 2 Event Analyzer: calls Gemini and returns structured JSON output.
 * Returns { facts, playerContributions, keyMoments, summary, tokensUsed, processingTimeMs }.
 * Throws if Gemini call fails or JSON cannot be parsed.
 * @param {Object} game - Sheet format game object
 * @param {Object} teamInfo - { teamName, season }
 * @returns {Object} Structured event analysis
 */
function callGeminiEventAnalyzer(game, teamInfo) {
  var apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured in Script Properties');

  var teamName = teamInfo.teamName || 'Team';
  var opponent = game.opponent || 'Opponent';
  var quarters = game.quarters || [];
  var quarterNames = ['Q1', 'Q2', 'Q3', 'Q4'];

  // Pre-compute stats to give Gemini accurate numbers
  var playerStats = computePlayerStatsFromQuarters(quarters);

  // Build per-quarter data summary
  var quarterData = [];
  var totalUs = 0;
  var totalThem = 0;
  quarters.forEach(function(q, idx) {
    var qName = quarterNames[idx] || ('Q' + (idx + 1));
    var us = (q.ourGsGoals || 0) + (q.ourGaGoals || 0);
    var them = (q.opponentGsGoals || 0) + (q.opponentGaGoals || 0);
    totalUs += us;
    totalThem += them;
    var positions = q.positions || {};
    var lineupStr = ['GS','GA','WA','C','WD','GD','GK']
      .filter(function(p) { return positions[p]; })
      .map(function(p) { return p + ':' + positions[p]; }).join(', ');
    quarterData.push({
      quarter: qName, us: us, them: them, diff: us - them,
      lineup: lineupStr, notes: q.notes || ''
    });
  });

  var result = totalUs > totalThem ? 'win' : (totalUs < totalThem ? 'loss' : 'draw');
  var margin = Math.abs(totalUs - totalThem);

  // Build player list for prompt
  var playerList = Object.keys(playerStats).map(function(name) {
    var s = playerStats[name];
    return name + ' (' + s.positions.join('/') + ', ' + s.quartersPlayed + 'Q, ' + s.goals + ' goals)';
  }).join('; ');

  var prompt = 'You are an expert netball analyst. Analyze this game and return a structured JSON object.\n\n' +
    'TEAM: ' + teamName + ' vs ' + opponent + '\n' +
    'RESULT: ' + result.toUpperCase() + ' ' + totalUs + '-' + totalThem + ' (margin: ' + margin + ')\n\n' +
    'QUARTER DATA:\n' + quarterData.map(function(q) {
      return q.quarter + ': Us ' + q.us + ' Them ' + q.them + ' (' + (q.diff >= 0 ? '+' : '') + q.diff + ')' +
        (q.lineup ? ' | ' + q.lineup : '') + (q.notes ? ' | Notes: ' + q.notes : '');
    }).join('\n') + '\n\n' +
    'PLAYER STATS (pre-computed):\n' + playerList + '\n\n' +
    getNetballKnowledgePreamble() + '\n\n' +
    'Return ONLY valid JSON matching this exact schema (no markdown, no explanation):\n' +
    '{\n' +
    '  "facts": {\n' +
    '    "result": "win|loss|draw",\n' +
    '    "margin": <number>,\n' +
    '    "totalScore": { "us": <n>, "them": <n> },\n' +
    '    "quarters": {\n' +
    '      "Q1": { "score": { "us": <n>, "them": <n> }, "momentum": "positive|negative|neutral" },\n' +
    '      "Q2": { "score": { "us": <n>, "them": <n> }, "momentum": "positive|negative|neutral" },\n' +
    '      "Q3": { "score": { "us": <n>, "them": <n> }, "momentum": "positive|negative|neutral" },\n' +
    '      "Q4": { "score": { "us": <n>, "them": <n> }, "momentum": "positive|negative|neutral" }\n' +
    '    },\n' +
    '    "strongestQuarter": "Q1|Q2|Q3|Q4",\n' +
    '    "weakestQuarter": "Q1|Q2|Q3|Q4",\n' +
    '    "closingProblem": <true|false>\n' +
    '  },\n' +
    '  "playerContributions": [\n' +
    '    { "name": "<string>", "quartersPlayed": <n>, "positions": ["<pos>"], "goals": <n>, "impact": "high|medium|low" }\n' +
    '  ],\n' +
    '  "keyMoments": [\n' +
    '    { "quarter": "Q1|Q2|Q3|Q4", "description": "<string>", "source": "coach_notes|inference" }\n' +
    '  ],\n' +
    '  "summary": "<2-3 sentence factual summary of what happened>"\n' +
    '}\n\n' +
    'Rules: closingProblem=true if Q4 momentum is negative or team lost Q4. ' +
    'Use exact player stats provided above. impact=high if >30% of team goals or played all 4Q in key position. ' +
    'keyMoments max 3 items. summary is factual only, no recommendations.';

  var startMs = Date.now();
  var response = UrlFetchApp.fetch(
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + apiKey,
    {
      method: 'POST',
      contentType: 'application/json',
      payload: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,       // Lower temp for structured output
          maxOutputTokens: 1200,
          responseMimeType: 'application/json'
        }
      }),
      muteHttpExceptions: true
    }
  );

  var processingTimeMs = Date.now() - startMs;
  var responseCode = response.getResponseCode();
  var responseText = response.getContentText();

  if (responseCode === 429) {
    var quotaErr = new Error('Quota exceeded (HTTP 429)');
    quotaErr.isQuotaError = true;
    throw quotaErr;
  }
  if (responseCode !== 200) {
    throw new Error('Gemini API error ' + responseCode + ': ' + responseText.substring(0, 100));
  }

  var json;
  try {
    json = JSON.parse(responseText);
  } catch (e) {
    throw new Error('Invalid JSON from Gemini: ' + e.message);
  }

  if (!json.candidates || !json.candidates[0] || !json.candidates[0].content ||
      !json.candidates[0].content.parts || !json.candidates[0].content.parts[0]) {
    throw new Error('Unexpected Gemini response format');
  }

  var rawText = json.candidates[0].content.parts[0].text;
  var usageMetadata = json.usageMetadata || {};
  var tokensUsed = (usageMetadata.promptTokenCount || 0) + (usageMetadata.candidatesTokenCount || 0);

  // Parse the structured JSON from Gemini's response
  var analysisStr = rawText.trim();
  // Strip markdown code fences if present (some models add them despite instructions)
  analysisStr = analysisStr.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  var analysis = JSON.parse(analysisStr); // Will throw if invalid — processAIQueue handles it

  return {
    facts: analysis.facts || {},
    playerContributions: analysis.playerContributions || [],
    keyMoments: analysis.keyMoments || [],
    summary: analysis.summary || '',
    tokensUsed: tokensUsed,
    processingTimeMs: processingTimeMs
  };
}

/**
 * Call Gemini API for background game AI summary generation.
 * Designed for background processing — concise prompt, 800 token limit.
 * Throws errors with isQuotaError=true on HTTP 429 for retry logic.
 * @param {Object} game - Game object with scores/lineup/notes
 * @param {Object} teamInfo - { teamName, season }
 * @returns {Object} { text: string, tokensUsed: number, processingTimeMs: number }
 */
function callGeminiBackgroundGameAI(game, teamInfo) {
  var apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured in Script Properties');
  }

  var teamName = teamInfo.teamName || 'Team';
  var opponent = game.opponent || 'Opponent';
  // Sheet format: quarters is an array [{positions, ourGsGoals, ourGaGoals, opponentGsGoals, opponentGaGoals, notes}]
  var quarters = game.quarters || [];
  var quarterNames = ['Q1', 'Q2', 'Q3', 'Q4'];

  // Compute per-quarter and total scores from quarters array
  var totalUs = 0;
  var totalThem = 0;
  var quarterLines = [];
  var lineupLines = [];

  quarters.forEach(function(q, idx) {
    var qName = quarterNames[idx] || ('Q' + (idx + 1));
    var us = (q.ourGsGoals || 0) + (q.ourGaGoals || 0);
    var them = (q.opponentGsGoals || 0) + (q.opponentGaGoals || 0);
    totalUs += us;
    totalThem += them;
    var diff = us - them;
    quarterLines.push(qName + ': Us ' + us + ' - Them ' + them + ' (' + (diff >= 0 ? '+' : '') + diff + ')');

    if (q.positions && Object.keys(q.positions).length > 0) {
      var parts = [];
      ['GS', 'GA', 'WA', 'C', 'WD', 'GD', 'GK'].forEach(function(pos) {
        if (q.positions[pos]) parts.push(pos + ': ' + q.positions[pos]);
      });
      if (parts.length > 0) lineupLines.push(qName + ': ' + parts.join(', '));
    }
    if (q.notes) lineupLines.push(qName + ' Notes: ' + q.notes);
  });

  var finalUs = totalUs;
  var finalThem = totalThem;
  var result = finalUs > finalThem ? 'Win' : (finalUs < finalThem ? 'Loss' : 'Draw');

  var prompt = 'You are an expert netball coach assistant. Analyze this game and provide a concise summary.\n\n' +
    getNetballKnowledgePreamble() +
    '\n## GAME DATA\n\n' +
    'Team: ' + teamName + '\n' +
    'Opponent: ' + opponent + '\n' +
    'Result: ' + result + ' ' + finalUs + '-' + finalThem + '\n\n' +
    '## QUARTER SCORES\n' + (quarterLines.length > 0 ? quarterLines.join('\n') : 'No quarter data') + '\n\n';

  if (lineupLines.length > 0) {
    prompt += '## LINEUPS & NOTES\n' + lineupLines.join('\n') + '\n\n';
  }

  prompt += '---\nProvide a concise game summary (3-5 sentences) covering: result and margin, ' +
    'quarter momentum shifts, key player contributions by name and position, ' +
    'and one tactical observation. Use netball-specific language.';

  var startMs = Date.now();
  var response = UrlFetchApp.fetch(
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + apiKey,
    {
      method: 'POST',
      contentType: 'application/json',
      payload: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 800
        }
      }),
      muteHttpExceptions: true
    }
  );

  var processingTimeMs = Date.now() - startMs;
  var responseCode = response.getResponseCode();
  var responseText = response.getContentText();

  if (responseCode === 429) {
    var quotaErr = new Error('Quota exceeded (HTTP 429)');
    quotaErr.isQuotaError = true;
    throw quotaErr;
  }

  if (responseCode !== 200) {
    Logger.log('Gemini background error: ' + responseCode + ' - ' + responseText.substring(0, 200));
    throw new Error('Gemini API error ' + responseCode + ': ' + responseText.substring(0, 100));
  }

  var json;
  try {
    json = JSON.parse(responseText);
  } catch (e) {
    throw new Error('Invalid JSON from Gemini: ' + e.message);
  }

  if (!json.candidates || !json.candidates[0] || !json.candidates[0].content ||
      !json.candidates[0].content.parts || !json.candidates[0].content.parts[0]) {
    throw new Error('Unexpected Gemini response format');
  }

  var summaryText = json.candidates[0].content.parts[0].text;
  var usageMetadata = json.usageMetadata || {};
  var tokensUsed = (usageMetadata.promptTokenCount || 0) + (usageMetadata.candidatesTokenCount || 0);

  return {
    text: summaryText,
    tokensUsed: tokensUsed,
    processingTimeMs: processingTimeMs
  };
}

/**
 * Main background queue processor — called every 10 minutes via time-based trigger.
 * Processes all ai_queue_* jobs: loads game data, calls Gemini, saves result, logs metrics.
 * Performance budget: max 25 jobs per run, stops at 4.5 min to avoid Apps Script timeout.
 */
function processAIQueue() {
  var startTime = Date.now();
  Logger.log('processAIQueue: starting run at ' + new Date().toISOString());

  var jobs = getQueuedJobs();
  if (jobs.length === 0) {
    Logger.log('processAIQueue: no jobs in queue');
    return;
  }

  Logger.log('processAIQueue: ' + jobs.length + ' jobs found');

  var maxJobs = 25; // Conservative batch size within 5-min execution limit
  var processed = 0;
  var succeeded = 0;
  var failed = 0;

  // Load master team list once for team name lookup
  var teamList = null;
  try {
    teamList = loadMasterTeamList();
  } catch (e) {
    Logger.log('processAIQueue: could not load team list (non-fatal): ' + e.message);
  }

  var props = PropertiesService.getScriptProperties();

  for (var i = 0; i < jobs.length && processed < maxJobs; i++) {
    var jobEntry = jobs[i];
    var key = jobEntry.key;
    var job = jobEntry.job;

    // Time budget check: stop at 4.5 min (270,000ms)
    if (Date.now() - startTime > 270000) {
      Logger.log('processAIQueue: approaching time limit, stopping after ' + processed + ' jobs');
      break;
    }

    processed++;
    Logger.log('processAIQueue: processing ' + key + ' (attempt ' + ((job.attempts || 0) + 1) + '/3)');

    try {
      // Load team data
      var teamDataResult = loadTeamData(job.sheetName);
      if (!teamDataResult || !teamDataResult.teamData) {
        Logger.log('processAIQueue: team data not found for ' + job.sheetName + ', removing job');
        props.deleteProperty(key);
        logClientMetric('ai_queue_failed', 'data_missing', job.teamID,
          JSON.stringify({ gameID: job.gameID, reason: 'Team data not found' }));
        failed++;
        continue;
      }

      var parsed;
      try {
        parsed = JSON.parse(teamDataResult.teamData);
      } catch (parseErr) {
        Logger.log('processAIQueue: invalid JSON for ' + job.sheetName + ', removing job');
        props.deleteProperty(key);
        logClientMetric('ai_queue_failed', 'invalid_json', job.teamID,
          JSON.stringify({ gameID: job.gameID }));
        failed++;
        continue;
      }

      // Find the game — sheet format uses 'id', support both
      var game = null;
      var gameIndex = -1;
      var games = parsed.games || [];
      for (var j = 0; j < games.length; j++) {
        if (games[j].id === job.gameID || games[j].gameID === job.gameID) {
          game = games[j];
          gameIndex = j;
          break;
        }
      }

      if (!game) {
        Logger.log('processAIQueue: game ' + job.gameID + ' not found, removing job');
        props.deleteProperty(key);
        logClientMetric('ai_queue_failed', 'game_not_found', job.teamID,
          JSON.stringify({ gameID: job.gameID }));
        failed++;
        continue;
      }

      // Change detection: skip if data is unchanged since queuing
      var currentHash = calculateGameDataHash(game);
      if (!job.forceRefresh && game.aiSummary &&
          game.aiSummary.gameDataHash === currentHash &&
          game.aiSummary.gameDataHash === job.lastKnownHash) {
        Logger.log('processAIQueue: hash unchanged for ' + job.gameID + ', removing job (no-op)');
        props.deleteProperty(key);
        succeeded++;
        continue;
      }

      // Resolve team name for prompt
      var teamInfo = { teamName: job.teamID, season: '' };
      if (teamList && Array.isArray(teamList)) {
        for (var t = 0; t < teamList.length; t++) {
          if (teamList[t].teamID === job.teamID) {
            teamInfo = {
              teamName: teamList[t].teamName || job.teamID,
              season: teamList[t].season || ''
            };
            break;
          }
        }
      }

      // Call Gemini — try structured Event Analyzer first, fall back to plain text
      var aiResult;
      var useEventAnalyzer = true;
      try {
        aiResult = callGeminiEventAnalyzer(game, teamInfo);
      } catch (analyzerErr) {
        // If quota error, re-throw so retry logic handles it
        if (analyzerErr.isQuotaError) throw analyzerErr;
        Logger.log('processAIQueue: EventAnalyzer failed, falling back to plain text: ' + analyzerErr.message);
        useEventAnalyzer = false;
        aiResult = callGeminiBackgroundGameAI(game, teamInfo);
      }

      // Build aiSummary — structured if Event Analyzer succeeded, plain text if fallback
      var aiSummary;
      if (useEventAnalyzer) {
        aiSummary = {
          text: aiResult.summary,
          eventAnalyzer: {
            facts: aiResult.facts,
            playerContributions: aiResult.playerContributions,
            keyMoments: aiResult.keyMoments
          },
          gameDataHash: currentHash,
          generatedAt: new Date().toISOString(),
          background: true,
          moduleVersion: 2
        };
      } else {
        aiSummary = {
          text: aiResult.text,
          gameDataHash: currentHash,
          generatedAt: new Date().toISOString(),
          background: true,
          moduleVersion: 1
        };
      }
      // Use a script-level lock to prevent concurrent triggers overwriting each other.
      // Re-read team data inside the lock to get the freshest base before writing.
      var lock = LockService.getScriptLock();
      var lockAcquired = false;
      try {
        lock.waitLock(20000); // Wait up to 20 seconds for lock
        lockAcquired = true;

        // Re-read freshest version of team data (Gemini call took 3-8s; another process may have written)
        var freshDataResult = loadTeamData(job.sheetName);
        var freshParsed = JSON.parse(freshDataResult.teamData || '{}');
        var freshGameIndex = -1;
        var freshGames = freshParsed.games || [];
        for (var k = 0; k < freshGames.length; k++) {
          if (freshGames[k].id === job.gameID || freshGames[k].gameID === job.gameID) {
            freshGameIndex = k;
            break;
          }
        }
        if (freshGameIndex >= 0) {
          var ss = getSpreadsheet();
          var teamSheet = ss.getSheetByName(job.sheetName);
          if (teamSheet) {
            // Write aiSummary to C1 (separate AI map) to avoid 50k char limit in A1.
            // C1 stores { gameID: aiSummary } — never touched by frontend syncs.
            var existingAIJSON = teamSheet.getRange('C1').getValue();
            var aiMap = {};
            if (existingAIJSON) {
              try { aiMap = JSON.parse(existingAIJSON); } catch (e) { /* start fresh */ }
            }
            aiMap[job.gameID] = aiSummary;
            var aiPayload = JSON.stringify(aiMap);
            teamSheet.getRange('C1').setValue(aiPayload);
            SpreadsheetApp.flush();
            Logger.log('processAIQueue: wrote aiSummary to C1 for ' + job.gameID + ' (' + aiPayload.length + ' bytes in C1)');

            // Verification read: confirm C1 write persisted
            var verifyAI = teamSheet.getRange('C1').getValue();
            if (!verifyAI) {
              throw new Error('Write verification failed: C1 is empty after setValue+flush');
            }
            try {
              var verifyMap = JSON.parse(verifyAI);
              var hasAI = verifyMap[job.gameID] && verifyMap[job.gameID].generatedAt;
              Logger.log('processAIQueue: verify read — aiSummary present in C1: ' + hasAI);
              if (!hasAI) {
                throw new Error('Write verification failed: gameID not in C1 after write');
              }
            } catch (verifyErr) {
              if (verifyErr.message.indexOf('Write verification') === 0) throw verifyErr;
              Logger.log('processAIQueue: verify parse error (non-fatal): ' + verifyErr.message);
            }
          } else {
            Logger.log('processAIQueue: sheet not found: ' + job.sheetName);
            throw new Error('Sheet not found: ' + job.sheetName);
          }
        } else {
          Logger.log('processAIQueue: game ' + job.gameID + ' not found in fresh data (' + freshGames.length + ' games)');
          throw new Error('Game not found in fresh data: ' + job.gameID);
        }
      } catch (lockErr) {
        Logger.log('processAIQueue: lock/write error: ' + lockErr.message);
        throw lockErr; // Propagate to retry logic
      } finally {
        if (lockAcquired) lock.releaseLock();
      }

      // Log to AI_Knowledge_Base sheet
      try {
        var kbSheet = ensureAIKnowledgeBaseSheet();
        var kbOutputJSON = useEventAnalyzer
          ? JSON.stringify({ facts: aiResult.facts, playerContributions: aiResult.playerContributions, keyMoments: aiResult.keyMoments, summary: aiResult.summary })
          : JSON.stringify({ summary: aiResult.text });
        kbSheet.appendRow([
          new Date().toISOString(),
          job.teamID,
          job.gameID,
          'event_analyzer',
          'success',
          currentHash,
          kbOutputJSON,
          'gemini-2.0-flash',
          aiResult.tokensUsed,
          aiResult.processingTimeMs,
          (job.attempts || 0) + 1,
          null,
          useEventAnalyzer ? '2.0' : '1.0',
          null,
          null
        ]);
      } catch (kbErr) {
        Logger.log('processAIQueue: AI_Knowledge_Base write error (non-fatal): ' + kbErr.message);
      }

      // Remove from queue on success
      props.deleteProperty(key);
      succeeded++;
      logClientMetric('ai_queue_success', aiResult.tokensUsed, job.teamID,
        JSON.stringify({ gameID: job.gameID, processingTimeMs: aiResult.processingTimeMs }));
      Logger.log('processAIQueue: completed ' + job.gameID + ' in ' + aiResult.processingTimeMs + 'ms');

    } catch (jobErr) {
      Logger.log('processAIQueue: error for ' + job.gameID + ': ' + jobErr.message);

      var isQuota = jobErr.isQuotaError ||
        jobErr.message.indexOf('429') !== -1 ||
        jobErr.message.indexOf('Quota') !== -1;
      var newAttempts = (job.attempts || 0) + 1;

      if (newAttempts >= 3) {
        // Max retries exhausted — remove job and log failure
        props.deleteProperty(key);
        failed++;
        logClientMetric('ai_queue_failed', 'max_retries', job.teamID,
          JSON.stringify({ gameID: job.gameID, lastError: jobErr.message, attempts: newAttempts }));
        Logger.log('processAIQueue: job ' + job.gameID + ' failed after 3 attempts, removed');

        // Log failure to AI_Knowledge_Base sheet
        try {
          var kbSheetFail = ensureAIKnowledgeBaseSheet();
          kbSheetFail.appendRow([
            new Date().toISOString(),
            job.teamID,
            job.gameID,
            'event_analyzer',
            'failed',
            job.lastKnownHash || '',
            null,
            'gemini-2.0-flash',
            0,
            0,
            newAttempts,
            jobErr.message,
            '1.0',
            null,
            null
          ]);
        } catch (kbErrFail) {
          Logger.log('processAIQueue: KB failure row error (non-fatal): ' + kbErrFail.message);
        }
      } else {
        // Update job with incremented attempt count and retry
        job.attempts = newAttempts;
        job.lastError = jobErr.message;
        job.lastAttemptAt = new Date().toISOString();
        props.setProperty(key, JSON.stringify(job));
        logClientMetric('ai_queue_retry', newAttempts, job.teamID,
          JSON.stringify({ gameID: job.gameID, isQuota: isQuota, error: jobErr.message }));
        Logger.log('processAIQueue: job ' + job.gameID + ' will retry (attempt ' + newAttempts + '/3)');

        // Quota error: stop processing remaining jobs this run to avoid wasting time
        if (isQuota) {
          Logger.log('processAIQueue: quota error detected, stopping batch early');
          break;
        }
      }
    }
  }

  var totalTimeMs = Date.now() - startTime;
  Logger.log('processAIQueue: done — processed=' + processed +
    ' succeeded=' + succeeded + ' failed=' + failed + ' time=' + totalTimeMs + 'ms');
  logClientMetric('ai_queue_run', processed, 'system',
    JSON.stringify({ succeeded: succeeded, failed: failed, totalTimeMs: totalTimeMs }));
}

/**
 * Create the time-based trigger for processAIQueue (every 10 minutes).
 * Run this once from the Apps Script console to set up automation.
 * Safe to run multiple times — detects and skips if trigger already exists.
 * @returns {Object} { success, message }
 */
function setupAIQueueTrigger() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'processAIQueue') {
      Logger.log('setupAIQueueTrigger: trigger already exists');
      return { success: true, message: 'Trigger already exists (processAIQueue every 10 min)' };
    }
  }
  ScriptApp.newTrigger('processAIQueue')
    .timeBased()
    .everyMinutes(10)
    .create();
  Logger.log('setupAIQueueTrigger: created 10-minute trigger for processAIQueue');
  return { success: true, message: 'Trigger created: processAIQueue every 10 minutes' };
}

/**
 * Queue all eligible games for a single team through the Event Analyzer pipeline.
 * Eligible = status 'normal' + at least one quarter with position data.
 * @param {string} teamID
 * @param {string} sheetName
 * @param {boolean} forceRefresh - if true, re-queues even if AI summary is up-to-date
 * @returns {Object} { queued, skipped, errors, details }
 */
function queueAllGamesForTeam(teamID, sheetName, forceRefresh) {
  var queued = 0, skipped = 0, errors = 0;
  var details = [];

  try {
    var teamDataResult = loadTeamData(sheetName);
    if (!teamDataResult || !teamDataResult.teamData) {
      return { success: false, error: 'Team data not found for sheet: ' + sheetName };
    }
    var parsed;
    try { parsed = JSON.parse(teamDataResult.teamData); } catch(e) {
      return { success: false, error: 'Invalid team data JSON for sheet: ' + sheetName };
    }

    var games = parsed.games || [];
    for (var i = 0; i < games.length; i++) {
      var game = games[i];
      if (game.status !== 'normal') continue;

      var quarters = game.quarters || [];
      var hasPositions = quarters.some(function(q) {
        return q && q.positions && Object.keys(q.positions).length > 0;
      });
      if (!hasPositions) {
        skipped++;
        continue;
      }

      var gameID = game.id || game.gameID;
      var res = queueGameAI({ gameID: gameID, sheetName: sheetName, teamID: teamID, forceRefresh: forceRefresh || false });
      if (res.success && res.queued) {
        queued++;
        details.push({ gameID: gameID, status: 'queued' });
      } else if (res.success && res.skipped) {
        skipped++;
      } else {
        errors++;
        details.push({ gameID: gameID, status: 'error', error: res.error });
      }
    }
  } catch (e) {
    Logger.log('queueAllGamesForTeam error (team=' + teamID + '): ' + e.message);
    return { success: false, error: e.message };
  }

  return { success: true, teamID: teamID, sheetName: sheetName, queued: queued, skipped: skipped, errors: errors, details: details };
}

/**
 * Queue all eligible games for ALL active teams through the Event Analyzer pipeline.
 * Run this once to bootstrap Pattern Detector data for all existing games.
 * @param {boolean} forceRefresh - if true, re-queues even if AI summary is up-to-date
 * @returns {Object} { success, teams, totalQueued, totalSkipped, totalErrors, results }
 */
function queueAllGames(forceRefresh) {
  Logger.log('queueAllGames: start (forceRefresh=' + forceRefresh + ')');
  var teams = loadMasterTeamList();
  if (!Array.isArray(teams)) {
    return { success: false, error: 'Failed to load team list: ' + (teams.error || 'unknown') };
  }

  var active = teams.filter(function(t) { return !t.archived && t.sheetName; });
  var totalQueued = 0, totalSkipped = 0, totalErrors = 0;
  var results = [];

  for (var i = 0; i < active.length; i++) {
    var team = active[i];
    try {
      var res = queueAllGamesForTeam(team.teamID, team.sheetName, forceRefresh);
      totalQueued += res.queued || 0;
      totalSkipped += res.skipped || 0;
      totalErrors += res.errors || 0;
      results.push({ teamID: team.teamID, name: team.name, queued: res.queued, skipped: res.skipped, errors: res.errors });
    } catch (e) {
      Logger.log('queueAllGames: error for team ' + team.teamID + ': ' + e.message);
      totalErrors++;
      results.push({ teamID: team.teamID, name: team.name, error: e.message });
    }
  }

  Logger.log('queueAllGames: done — queued=' + totalQueued + ' skipped=' + totalSkipped + ' errors=' + totalErrors);
  return { success: true, teams: active.length, totalQueued: totalQueued, totalSkipped: totalSkipped, totalErrors: totalErrors, results: results };
}

/**
 * Set up time-based triggers for the Opposition Scouting pipeline:
 * - Saturday 6 PM (Melbourne): collectOppositionFixtures (weekly)
 * - Sunday 10 AM (Melbourne): processOppositionAIQueue (weekly)
 * Safe to run multiple times — skips triggers that already exist.
 * @returns {Object} { success, message, created }
 */
function setupOppositionTriggers() {
  var created = [];
  var triggers = ScriptApp.getProjectTriggers();
  var existingHandlers = triggers.map(function(t) { return t.getHandlerFunction(); });

  if (existingHandlers.indexOf('collectOppositionFixtures') === -1) {
    ScriptApp.newTrigger('collectOppositionFixtures')
      .timeBased()
      .onWeekDay(ScriptApp.WeekDay.SATURDAY)
      .atHour(18) // 6 PM — Apps Script uses server time; configured for Melbourne ~UTC+11
      .create();
    created.push('collectOppositionFixtures (Saturday 6 PM)');
    Logger.log('setupOppositionTriggers: created Saturday trigger for collectOppositionFixtures');
  } else {
    Logger.log('setupOppositionTriggers: collectOppositionFixtures trigger already exists');
  }

  if (existingHandlers.indexOf('processOppositionAIQueue') === -1) {
    ScriptApp.newTrigger('processOppositionAIQueue')
      .timeBased()
      .onWeekDay(ScriptApp.WeekDay.SUNDAY)
      .atHour(10) // 10 AM
      .create();
    created.push('processOppositionAIQueue (Sunday 10 AM)');
    Logger.log('setupOppositionTriggers: created Sunday trigger for processOppositionAIQueue');
  } else {
    Logger.log('setupOppositionTriggers: processOppositionAIQueue trigger already exists');
  }

  var msg = created.length > 0
    ? 'Created triggers: ' + created.join(', ')
    : 'All opposition triggers already exist';
  return { success: true, message: msg, created: created };
}

// ========================================
// PATTERN DETECTOR (Phase 3)
// Reads last N games' eventAnalyzer outputs and identifies multi-game trends.
// Cached 1 week in AI_Knowledge_Base sheet and returned to frontend.
// ========================================

/**
 * Generate or retrieve cached pattern analysis for a team.
 * Reads the last `gameCount` games with aiSummary.eventAnalyzer data,
 * calls Gemini for trend detection, and caches for 1 week.
 * @param {string} teamID
 * @param {string} sheetName
 * @param {boolean} forceRefresh
 * @returns {Object} PatternDetector result
 */
function generatePatternDetector(teamID, sheetName, forceRefresh) {
  Logger.log('generatePatternDetector: start for ' + teamID);
  var startTime = Date.now();

  // Load team data (merges C1 aiSummary into games)
  var teamDataResult = loadTeamData(sheetName);
  if (teamDataResult.error) return { success: false, error: teamDataResult.error };
  var teamData = JSON.parse(teamDataResult.teamData || '{}');

  // Find games with eventAnalyzer data, sorted newest first
  var games = (teamData.games || []).filter(function(g) {
    return g.status === 'normal' && g.aiSummary && g.aiSummary.eventAnalyzer;
  });
  games.sort(function(a, b) {
    // Sort by round descending
    return (parseInt(b.round, 10) || 0) - (parseInt(a.round, 10) || 0);
  });

  var recentGames = games.slice(0, 5);

  if (recentGames.length < 2) {
    return { success: false, error: 'Not enough analyzed games yet (need at least 2 with AI summaries)' };
  }

  // Cache check: look for unexpired pattern in AI_Knowledge_Base
  if (!forceRefresh) {
    var cached = getPatternDetectorCache(teamID);
    if (cached) {
      Logger.log('generatePatternDetector: returning cached result for ' + teamID);
      return { success: true, source: 'cache', cached: true, data: cached };
    }
  }

  // Build prompt from recent game eventAnalyzer data
  var gameContexts = recentGames.map(function(g) {
    var ea = g.aiSummary.eventAnalyzer;
    var facts = ea.facts || {};
    var players = (ea.playerContributions || []).map(function(p) {
      return p.name + ' (' + p.positions.join('/') + ') ' + p.goals + ' goals impact=' + p.impact;
    }).join(', ');
    return 'Round ' + g.round + ' vs ' + (g.opponent || '?') + ': ' +
      (facts.result || '?') + ' ' + (facts.totalScore ? facts.totalScore.us + '-' + facts.totalScore.them : '') +
      ' strongestQ=' + (facts.strongestQuarter || '?') +
      ' weakestQ=' + (facts.weakestQuarter || '?') +
      ' closingProblem=' + (facts.closingProblem || false) +
      ' | Players: ' + (players || 'none');
  }).join('\n');

  // Get team name
  var teamsList = loadMasterTeamList();
  var teamName = teamID;
  for (var i = 0; i < teamsList.length; i++) {
    if (teamsList[i].teamID === teamID) { teamName = teamsList[i].teamName || teamID; break; }
  }

  var apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!apiKey) return { success: false, error: 'GEMINI_API_KEY not configured' };

  var prompt = 'You are a netball analyst detecting multi-game patterns for ' + teamName + '.\n\n' +
    'RECENT GAME DATA (newest first, ' + recentGames.length + ' games):\n' + gameContexts + '\n\n' +
    'Identify patterns across these games. Respond with JSON only (no markdown):\n' +
    '{\n' +
    '  "patterns": {\n' +
    '    "closing": { "trend": "consistent_weakness|improving|stable|volatile", "severity": "high|medium|low|positive", "evidence": ["Round X: Q4 -3", ...], "since": "Round N" },\n' +
    '    "defense": { "trend": "improving|declining|stable", "severity": "high|medium|low|positive", "evidence": [...] },\n' +
    '    "attack": { "trend": "...", "severity": "...", "evidence": [...] },\n' +
    '    "momentum": { "trend": "...", "severity": "...", "evidence": [...] }\n' +
    '  },\n' +
    '  "playerTrajectories": [\n' +
    '    { "name": "...", "trend": "stable_high_performer|improving|declining|inconsistent", "consistency": "high|medium|low", "recentForm": "strong|average|weak", "note": "1 sentence" }\n' +
    '  ],\n' +
    '  "combinationEffectiveness": [\n' +
    '    { "players": ["Name1", "Name2"], "positions": ["GS", "GA"], "gamesPlayed": N, "chemistry_level": "developing|established|elite", "note": "..." }\n' +
    '  ],\n' +
    '  "summary": "2-3 sentence overall pattern summary for the coach"\n' +
    '}\n' +
    'Base everything on the data above. If a pattern has fewer than 2 data points, mark confidence low.';

  var url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + apiKey;
  var payload = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: 'application/json', temperature: 0.3, maxOutputTokens: 1500 }
  };
  var response = UrlFetchApp.fetch(url, {
    method: 'POST', contentType: 'application/json',
    payload: JSON.stringify(payload), muteHttpExceptions: true
  });

  var processingTimeMs = Date.now() - startTime;
  var responseCode = response.getResponseCode();
  if (responseCode !== 200) {
    var errText = response.getContentText();
    if (errText.indexOf('429') !== -1 || errText.indexOf('RESOURCE_EXHAUSTED') !== -1) {
      return { success: false, error: 'Gemini quota exceeded — try again in a few minutes' };
    }
    return { success: false, error: 'Gemini API error ' + responseCode };
  }

  var respData = JSON.parse(response.getContentText());
  var tokensUsed = (respData.usageMetadata && respData.usageMetadata.totalTokenCount) || 0;
  var text = respData.candidates[0].content.parts[0].text;
  var parsed = JSON.parse(text);

  var cacheUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  var result = {
    teamID: teamID,
    generatedAt: new Date().toISOString(),
    cacheUntil: cacheUntil,
    gameCount: recentGames.length,
    patterns: parsed.patterns || {},
    playerTrajectories: parsed.playerTrajectories || [],
    combinationEffectiveness: parsed.combinationEffectiveness || [],
    summary: parsed.summary || ''
  };

  // Store in AI_Knowledge_Base
  try {
    var kbSheet = ensureAIKnowledgeBaseSheet();
    kbSheet.appendRow([
      result.generatedAt, teamID, null, 'pattern_detector', 'success',
      null, JSON.stringify(result), 'gemini-2.0-flash',
      tokensUsed, processingTimeMs, 1, null, '1.0', cacheUntil,
      'games_analyzed=' + recentGames.length
    ]);
  } catch (kbErr) {
    Logger.log('generatePatternDetector: KB write error (non-fatal): ' + kbErr.message);
  }

  logClientMetric('pattern_detector_generated', tokensUsed, teamID,
    JSON.stringify({ gameCount: recentGames.length, processingTimeMs: processingTimeMs }));
  Logger.log('generatePatternDetector: done in ' + processingTimeMs + 'ms, ' + tokensUsed + ' tokens');

  return { success: true, source: 'generated', cached: false, data: result };
}

/**
 * Check AI_Knowledge_Base for an unexpired pattern_detector result for this team.
 * @param {string} teamID
 * @returns {Object|null}
 */
function getPatternDetectorCache(teamID) {
  try {
    var ss = getSpreadsheet();
    var kbSheet = ss.getSheetByName('AI_Knowledge_Base');
    if (!kbSheet) return null;
    var data = kbSheet.getDataRange().getValues();
    var now = new Date();
    // Scan from newest (bottom) to find most recent valid pattern_detector for this team
    for (var i = data.length - 1; i >= 1; i--) {
      var row = data[i];
      if (row[1] === teamID && row[3] === 'pattern_detector' && row[4] === 'success') {
        var cacheUntil = row[13] ? new Date(row[13]) : null;
        if (cacheUntil && cacheUntil > now && row[6]) {
          return JSON.parse(row[6]);
        }
      }
    }
  } catch (e) {
    Logger.log('getPatternDetectorCache: error (non-fatal): ' + e.message);
  }
  return null;
}

// ========================================
// OPPOSITION SCOUTING SYSTEM
// ========================================

/**
 * Create the OppositionScouting sheet if it doesn't exist.
 * Safe to call multiple times — skips if already present.
 * @returns {Sheet}
 */
function ensureOppositionScoutingSheetExists() {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName('OppositionScouting');
  if (sheet) return sheet;

  sheet = ss.insertSheet('OppositionScouting');
  var headers = ['Timestamp', 'TeamID', 'Opponent', 'Round', 'GameDate', 'AISummary', 'AnalyticsJSON', 'GeneratedAt', 'CacheUntil', 'Status'];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

  // Header formatting
  var headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#4a4a4a');
  headerRange.setFontColor('#ffffff');

  // Column widths
  var widths = [120, 100, 150, 80, 120, 400, 800, 200, 150, 100];
  for (var i = 0; i < widths.length; i++) {
    sheet.setColumnWidth(i + 1, widths[i]);
  }

  sheet.setFrozenRows(1);
  Logger.log('ensureOppositionScoutingSheetExists: created OppositionScouting sheet');
  return sheet;
}

/**
 * Save an opposition scouting result to the OppositionScouting sheet.
 * Appends a new row (does not deduplicate; query by teamID+opponent+round).
 * @param {Object} data - { teamID, opponent, round, gameDate, aiSummary, analytics }
 */
function saveOppositionScoutingData(data) {
  var sheet = ensureOppositionScoutingSheetExists();
  var now = new Date().toISOString();
  var cacheUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  sheet.appendRow([
    now,                                          // A: Timestamp
    data.teamID || '',                            // B: TeamID
    data.opponent || '',                          // C: Opponent
    data.round || 0,                              // D: Round
    data.gameDate || '',                          // E: GameDate
    data.aiSummary || '',                         // F: AISummary (plain text ~500 chars)
    JSON.stringify(data.analytics || {}),         // G: AnalyticsJSON
    data.generatedAt || now,                      // H: GeneratedAt
    cacheUntil,                                   // I: CacheUntil
    'ready'                                       // J: Status
  ]);
  Logger.log('saveOppositionScoutingData: saved ' + data.opponent + ' R' + data.round + ' for ' + data.teamID);
}

/**
 * Calculate head-to-head history between this team and an opponent.
 * @param {Object} teamData - parsed team data with games array
 * @param {string} opponentName
 * @returns {Object} { games, wins, losses, draws, formTrend, quarterTotals }
 */
function calculateHeadToHeadHistory(teamData, opponentName) {
  var games = (teamData.games || []).filter(function(g) {
    return g.status === 'normal' &&
           g.opponent &&
           g.opponent.toLowerCase().indexOf(opponentName.toLowerCase()) !== -1;
  });

  var wins = 0, losses = 0, draws = 0;
  var formChars = [];
  var quarterTotals = { Q1: { us: 0, them: 0 }, Q2: { us: 0, them: 0 }, Q3: { us: 0, them: 0 }, Q4: { us: 0, them: 0 } };

  games.forEach(function(g) {
    var quarters = g.quarters || [];
    var usTotal = 0, themTotal = 0;
    var qNames = ['Q1', 'Q2', 'Q3', 'Q4'];
    quarters.forEach(function(q, idx) {
      if (!q) return;
      var usQ = (q.ourGsGoals || 0) + (q.ourGaGoals || 0);
      var themQ = (q.opponentGsGoals || 0) + (q.opponentGaGoals || 0);
      usTotal += usQ;
      themTotal += themQ;
      var qKey = qNames[idx];
      if (qKey) {
        quarterTotals[qKey].us += usQ;
        quarterTotals[qKey].them += themQ;
      }
    });
    if (usTotal > themTotal) { wins++; formChars.push('W'); }
    else if (usTotal < themTotal) { losses++; formChars.push('L'); }
    else { draws++; formChars.push('D'); }
  });

  return {
    games: games.length,
    wins: wins,
    losses: losses,
    draws: draws,
    formTrend: formChars.join(''),
    quarterTotals: quarterTotals
  };
}

/**
 * Generate all 26 opposition analytics using Gemini.
 * Groups A-G: Quarter Strength, Relative Strength, Efficiency,
 * Vulnerabilities, Predictive, Advanced Patterns, Situational.
 * @param {Object} config - { teamName, opponent, round, ladderData, h2h, gameDate }
 * @returns {Object} { summary, analytics, tokensUsed, processingTimeMs }
 */
function generateOppositionAnalytics(config) {
  var apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured in Script Properties');

  var ladderInfo = config.ladderData || {};
  var h2h = config.h2h || {};

  var prompt = 'You are a netball analyst. Generate opposition scouting for a team about to play ' + config.opponent + '.\n\n' +
    'CONTEXT:\n' +
    '- Our team: ' + config.teamName + '\n' +
    '- Opponent: ' + config.opponent + '\n' +
    '- Round: ' + config.round + '\n' +
    '- Game date: ' + (config.gameDate || 'TBD') + '\n' +
    '- Opponent ladder position: ' + (ladderInfo.position || 'unknown') + ' of ' + (ladderInfo.totalTeams || 'unknown') + '\n' +
    '- Opponent record: ' + (ladderInfo.wins || 0) + 'W ' + (ladderInfo.losses || 0) + 'L ' + (ladderInfo.draws || 0) + 'D\n' +
    '- Opponent form (recent): ' + (ladderInfo.form || 'unknown') + '\n' +
    '- H2H history: ' + h2h.wins + 'W ' + h2h.losses + 'L ' + h2h.draws + 'D across ' + h2h.games + ' games\n' +
    '- H2H quarter totals: Q1 us ' + (h2h.quarterTotals && h2h.quarterTotals.Q1 ? h2h.quarterTotals.Q1.us : 0) +
      ' them ' + (h2h.quarterTotals && h2h.quarterTotals.Q1 ? h2h.quarterTotals.Q1.them : 0) +
      ' | Q2 us ' + (h2h.quarterTotals && h2h.quarterTotals.Q2 ? h2h.quarterTotals.Q2.us : 0) +
      ' them ' + (h2h.quarterTotals && h2h.quarterTotals.Q2 ? h2h.quarterTotals.Q2.them : 0) +
      ' | Q3 us ' + (h2h.quarterTotals && h2h.quarterTotals.Q3 ? h2h.quarterTotals.Q3.us : 0) +
      ' them ' + (h2h.quarterTotals && h2h.quarterTotals.Q3 ? h2h.quarterTotals.Q3.them : 0) +
      ' | Q4 us ' + (h2h.quarterTotals && h2h.quarterTotals.Q4 ? h2h.quarterTotals.Q4.us : 0) +
      ' them ' + (h2h.quarterTotals && h2h.quarterTotals.Q4 ? h2h.quarterTotals.Q4.them : 0) + '\n\n' +
    'Respond with JSON only (no markdown). Schema:\n' +
    '{\n' +
    '  "summary": "2-3 sentence tactical summary for the coach (~300 chars)",\n' +
    '  "groups": {\n' +
    '    "A": {\n' +
    '      "label": "Quarter Strength",\n' +
    '      "insights": [\n' +
    '        { "title": "Q1 Strength", "description": "...", "metric": "...", "confidence": "high|medium|low" },\n' +
    '        { "title": "Q2 Strength", "description": "...", "metric": "...", "confidence": "..." },\n' +
    '        { "title": "Q3 Strength", "description": "...", "metric": "...", "confidence": "..." },\n' +
    '        { "title": "Q4 Strength", "description": "...", "metric": "...", "confidence": "..." }\n' +
    '      ]\n' +
    '    },\n' +
    '    "B": { "label": "Relative Strength", "insights": [ 3 insights about matchup advantages ] },\n' +
    '    "C": { "label": "Efficiency", "insights": [ 3 insights about shooting/possession ] },\n' +
    '    "D": { "label": "Vulnerabilities", "insights": [ 3 insights about weaknesses to exploit ] },\n' +
    '    "E": { "label": "Predictive", "insights": [ 3 insights about trajectory/momentum ] },\n' +
    '    "F": { "label": "Advanced Patterns", "insights": [ 5 insights about formations/combos ] },\n' +
    '    "G": { "label": "Situational", "insights": [ 2 insights about home/away/pressure ] }\n' +
    '  }\n' +
    '}\n' +
    'Total: exactly 26 insights (4+3+3+3+3+5+2). Base analysis on the data provided. If data is limited, use low confidence.\n';

  var startTime = Date.now();
  var url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + apiKey;
  var payload = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: 'application/json', temperature: 0.4, maxOutputTokens: 2048 }
  };

  var response = UrlFetchApp.fetch(url, {
    method: 'POST',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  var processingTimeMs = Date.now() - startTime;
  var responseCode = response.getResponseCode();
  if (responseCode !== 200) {
    var errText = response.getContentText();
    if (errText.indexOf('429') !== -1 || errText.indexOf('RESOURCE_EXHAUSTED') !== -1) {
      var err = new Error('Gemini quota exceeded (429)');
      err.isQuotaError = true;
      throw err;
    }
    throw new Error('Gemini API error ' + responseCode + ': ' + errText.substring(0, 200));
  }

  var responseData = JSON.parse(response.getContentText());
  var tokensUsed = (responseData.usageMetadata && responseData.usageMetadata.totalTokenCount) || 0;
  var text = responseData.candidates[0].content.parts[0].text;
  var parsed = JSON.parse(text);

  return {
    summary: parsed.summary || '',
    analytics: { groups: parsed.groups || {}, summary: parsed.summary || '' },
    tokensUsed: tokensUsed,
    processingTimeMs: processingTimeMs
  };
}

/**
 * Fast data refresh (~2 sec) — fetches upcoming fixtures and ladder positions.
 * No AI calls. Returns match list with ladder info.
 * @param {string} teamID
 * @returns {Object} { success, fixturesUpdated, matches, message }
 */
function collectOppositionFixturesImmediate(teamID) {
  Logger.log('collectOppositionFixturesImmediate: start for ' + teamID);
  var teamDataResult = loadTeamData('data_' + teamID.replace('team_', 'team_'));
  if (teamDataResult.error) {
    // Try finding the sheetName from master list
    var teams = loadMasterTeamList();
    var team = null;
    for (var i = 0; i < teams.length; i++) {
      if (teams[i].teamID === teamID) { team = teams[i]; break; }
    }
    if (!team) return { success: false, error: 'Team not found: ' + teamID };
    teamDataResult = loadTeamData(team.sheetName);
    if (teamDataResult.error) return { success: false, error: teamDataResult.error };
  }

  var teamData = JSON.parse(teamDataResult.teamData || '{}');
  var upcoming = (teamData.games || []).filter(function(g) { return g.status === 'upcoming'; });

  if (upcoming.length === 0) {
    return { success: true, fixturesUpdated: 0, matches: [], message: 'No upcoming games found' };
  }

  // Try to get ladder data (non-fatal if unavailable)
  var ladderData = null;
  try {
    var ladderResult = getSquadiLadderForTeam(teamID, true);
    if (ladderResult && ladderResult.success) ladderData = ladderResult;
  } catch (e) {
    Logger.log('collectOppositionFixturesImmediate: ladder fetch failed (non-fatal): ' + e.message);
  }

  var matches = upcoming.map(function(g) {
    var opponentLadder = null;
    if (ladderData && ladderData.standings) {
      var opp = g.opponent || '';
      for (var j = 0; j < ladderData.standings.length; j++) {
        if (fuzzyOpponentMatch(ladderData.standings[j].team || '', opp)) {
          opponentLadder = ladderData.standings[j];
          break;
        }
      }
    }
    return {
      round: g.round || 0,
      opponent: g.opponent || '',
      date: g.date || '',
      gameID: g.id || g.gameID || '',
      ladderFetched: !!opponentLadder,
      position: opponentLadder ? opponentLadder.position : null,
      wins: opponentLadder ? opponentLadder.wins : null,
      losses: opponentLadder ? opponentLadder.losses : null,
      draws: opponentLadder ? opponentLadder.draws : null,
      form: opponentLadder ? (opponentLadder.form || null) : null
    };
  });

  Logger.log('collectOppositionFixturesImmediate: found ' + matches.length + ' upcoming games');
  return {
    success: true,
    fixturesUpdated: matches.length,
    matches: matches,
    message: 'Fixture data refreshed for ' + matches.length + ' upcoming game(s)'
  };
}

/**
 * Queue an opposition AI job for background processing.
 * Key: opposition_queue_{teamID}_{round}_{sheetName}
 * @param {Object} jobData - { teamID, sheetName, opponent, round, gameDate }
 * @returns {Object} { success, queued, queueKey }
 */
function queueOppositionAI(jobData) {
  var props = PropertiesService.getScriptProperties();
  var queueKey = 'opposition_queue_' + jobData.teamID + '_' + jobData.round + '_' + jobData.sheetName;
  var job = {
    teamID: jobData.teamID,
    sheetName: jobData.sheetName,
    opponent: jobData.opponent || '',
    round: jobData.round || 0,
    gameDate: jobData.gameDate || '',
    queuedAt: new Date().toISOString(),
    attempts: 0
  };
  props.setProperty(queueKey, JSON.stringify(job));
  Logger.log('queueOppositionAI: queued ' + queueKey);
  return { success: true, queued: true, queueKey: queueKey, message: 'Queued opposition AI for ' + job.opponent + ' R' + job.round };
}

/**
 * Generate all 26 analytics immediately for a specific upcoming game.
 * Slow (~15-30 sec) — coach-triggered for urgent needs.
 * @param {string} teamID
 * @param {string|number} round
 * @returns {Object} { success, opponent, round, generated, generatedTimeMs, analytics, message }
 */
function generateOppositionInsightsImmediately(teamID, round, gameID) {
  Logger.log('generateOppositionInsightsImmediately: start ' + teamID + ' R' + round + (gameID ? ' gameID=' + gameID : ''));
  var startTime = Date.now();

  // Load team data
  var teams = loadMasterTeamList();
  if (teams.error) return { success: false, error: teams.error };
  var team = null;
  for (var i = 0; i < teams.length; i++) {
    if (teams[i].teamID === teamID) { team = teams[i]; break; }
  }
  if (!team) return { success: false, error: 'Team not found: ' + teamID };

  var teamDataResult = loadTeamData(team.sheetName);
  if (teamDataResult.error) return { success: false, error: teamDataResult.error };
  var teamData = JSON.parse(teamDataResult.teamData || '{}');

  // Find game: by explicit gameID, or by round+upcoming
  var roundNum = parseInt(round, 10);
  var game = null;
  var games = teamData.games || [];
  for (var j = 0; j < games.length; j++) {
    if (gameID) {
      // When gameID provided, match by ID regardless of status (allows testing with past games)
      if (games[j].id === gameID || games[j].gameID === gameID) { game = games[j]; break; }
    } else if (parseInt(games[j].round, 10) === roundNum && games[j].status === 'upcoming') {
      game = games[j];
      break;
    }
  }
  if (!game) return { success: false, error: 'No upcoming game found for round ' + round };

  var opponent = game.opponent || 'Unknown';

  // Fetch ladder data (non-fatal)
  var ladderData = null;
  try {
    var ladderResult = getSquadiLadderForTeam(teamID, true);
    if (ladderResult && ladderResult.success && ladderResult.standings) {
      for (var k = 0; k < ladderResult.standings.length; k++) {
        if (fuzzyOpponentMatch(ladderResult.standings[k].team || '', opponent)) {
          ladderData = ladderResult.standings[k];
          break;
        }
      }
    }
  } catch (e) {
    Logger.log('generateOppositionInsightsImmediately: ladder fetch failed (non-fatal): ' + e.message);
  }

  // H2H history
  var h2h = calculateHeadToHeadHistory(teamData, opponent);

  // Generate analytics
  var analyticsResult = generateOppositionAnalytics({
    teamName: team.teamName || teamID,
    opponent: opponent,
    round: roundNum,
    gameDate: game.date || '',
    ladderData: ladderData || {},
    h2h: h2h
  });

  // Save to sheet
  saveOppositionScoutingData({
    teamID: teamID,
    opponent: opponent,
    round: roundNum,
    gameDate: game.date || '',
    aiSummary: analyticsResult.summary,
    analytics: analyticsResult.analytics,
    generatedAt: new Date().toISOString()
  });

  var generatedTimeMs = Date.now() - startTime;
  logClientMetric('opposition_scouting_generated', analyticsResult.tokensUsed, teamID,
    JSON.stringify({ opponent: opponent, round: roundNum, generatedTimeMs: generatedTimeMs }));

  Logger.log('generateOppositionInsightsImmediately: done for ' + opponent + ' R' + round + ' in ' + generatedTimeMs + 'ms');
  return {
    success: true,
    opponent: opponent,
    round: roundNum,
    generated: true,
    generatedTimeMs: generatedTimeMs,
    analytics: analyticsResult.analytics,
    summary: analyticsResult.summary,
    message: 'Opposition insights generated for ' + opponent + ' (R' + round + ')'
  };
}

/**
 * Process all queued opposition AI jobs.
 * Designed as a time-based trigger (Sunday 10 AM) but can also be called manually.
 * Uses PropertiesService.getScriptProperties() (required for trigger context).
 */
function processOppositionAIQueue() {
  var startTime = Date.now();
  Logger.log('processOppositionAIQueue: starting at ' + new Date().toISOString());

  var props = PropertiesService.getScriptProperties();
  var allKeys = props.getKeys();
  var oppKeys = allKeys.filter(function(k) { return k.indexOf('opposition_queue_') === 0; });

  if (oppKeys.length === 0) {
    Logger.log('processOppositionAIQueue: no jobs in queue');
    return;
  }

  Logger.log('processOppositionAIQueue: ' + oppKeys.length + ' job(s) found');
  var succeeded = 0, failed = 0;

  for (var i = 0; i < oppKeys.length; i++) {
    // Time budget: stop at 12 min (720,000ms) to stay well under 15-min trigger limit
    if (Date.now() - startTime > 720000) {
      Logger.log('processOppositionAIQueue: approaching time limit, stopping');
      break;
    }

    var key = oppKeys[i];
    var job;
    try {
      job = JSON.parse(props.getProperty(key) || '{}');
    } catch (e) {
      props.deleteProperty(key);
      continue;
    }

    Logger.log('processOppositionAIQueue: processing ' + key + ' attempt ' + ((job.attempts || 0) + 1) + '/3');

    try {
      var teamDataResult = loadTeamData(job.sheetName);
      if (teamDataResult.error) throw new Error('Team data error: ' + teamDataResult.error);

      var teamData = JSON.parse(teamDataResult.teamData || '{}');
      var teams = loadMasterTeamList();
      var team = null;
      for (var t = 0; t < teams.length; t++) {
        if (teams[t].teamID === job.teamID) { team = teams[t]; break; }
      }
      var teamName = team ? (team.teamName || job.teamID) : job.teamID;

      // Fetch fresh ladder
      var ladderData = null;
      try {
        var lResult = getSquadiLadderForTeam(job.teamID, true);
        if (lResult && lResult.success && lResult.standings) {
          for (var s = 0; s < lResult.standings.length; s++) {
            if (fuzzyOpponentMatch(lResult.standings[s].team || '', job.opponent)) {
              ladderData = lResult.standings[s];
              break;
            }
          }
        }
      } catch (e) {
        Logger.log('processOppositionAIQueue: ladder fetch failed (non-fatal): ' + e.message);
      }

      var h2h = calculateHeadToHeadHistory(teamData, job.opponent);

      var analyticsResult = generateOppositionAnalytics({
        teamName: teamName,
        opponent: job.opponent,
        round: job.round,
        gameDate: job.gameDate || '',
        ladderData: ladderData || {},
        h2h: h2h
      });

      saveOppositionScoutingData({
        teamID: job.teamID,
        opponent: job.opponent,
        round: job.round,
        gameDate: job.gameDate || '',
        aiSummary: analyticsResult.summary,
        analytics: analyticsResult.analytics,
        generatedAt: new Date().toISOString()
      });

      props.deleteProperty(key);
      succeeded++;
      logClientMetric('opposition_scouting_queued_done', analyticsResult.tokensUsed, job.teamID,
        JSON.stringify({ opponent: job.opponent, round: job.round }));
      Logger.log('processOppositionAIQueue: completed ' + job.opponent + ' R' + job.round);

    } catch (jobErr) {
      Logger.log('processOppositionAIQueue: error for ' + key + ': ' + jobErr.message);
      var newAttempts = (job.attempts || 0) + 1;
      if (newAttempts >= 3) {
        props.deleteProperty(key);
        failed++;
        logClientMetric('opposition_scouting_failed', 'max_retries', job.teamID,
          JSON.stringify({ opponent: job.opponent, round: job.round, error: jobErr.message }));
        Logger.log('processOppositionAIQueue: job failed after 3 attempts — removed: ' + key);
      } else {
        job.attempts = newAttempts;
        job.lastError = jobErr.message;
        props.setProperty(key, JSON.stringify(job));
      }
    }
  }

  var totalMs = Date.now() - startTime;
  logClientMetric('opposition_queue_run', succeeded, 'system',
    JSON.stringify({ succeeded: succeeded, failed: failed, totalTimeMs: totalMs }));
  Logger.log('processOppositionAIQueue: done — ' + succeeded + ' succeeded, ' + failed + ' failed in ' + totalMs + 'ms');
}

/**
 * Get the most recent opposition scouting data for a team+opponent+round combination.
 * @param {string} teamID
 * @param {string} opponent
 * @param {number} round
 * @returns {Object|null}
 */
function getOppositionScoutingData(teamID, opponent, round) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName('OppositionScouting');
  if (!sheet) return null;

  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return null;

  var roundNum = parseInt(round, 10);
  var best = null;

  for (var i = data.length - 1; i >= 1; i--) {  // newest first (last row = newest append)
    var row = data[i];
    if (row[1] === teamID && parseInt(row[3], 10) === roundNum &&
        row[2] && row[2].toString().toLowerCase().indexOf(opponent.toLowerCase()) !== -1) {
      best = {
        timestamp: row[0],
        teamID: row[1],
        opponent: row[2],
        round: row[3],
        gameDate: row[4],
        aiSummary: row[5],
        analytics: row[6] ? JSON.parse(row[6]) : null,
        generatedAt: row[7],
        cacheUntil: row[8],
        status: row[9]
      };
      break;
    }
  }

  return best;
}

// ========================================
// END OPPOSITION SCOUTING
// ========================================

// --- AI Insights using Gemini ---
// Legacy function for GET requests (kept for backwards compatibility)
function getAIInsights(teamID, sheetName) {
  throw new Error('Please update the app to use the enhanced AI insights');
}

/**
 * Returns netball coaching knowledge preamble for AI prompts
 * Focused on insights derivable from scoring and position data
 */
function getNetballKnowledgePreamble() {
  return `## NETBALL COACHING KNOWLEDGE
(Focused on interpreting scoring and position statistics)

### Position Roles & What Their Stats Mean

**SCORING POSITIONS (GS & GA):**
- **GS (Goal Shooter)**: Primary scorer, plays in shooting circle only. Typically scores 60-70% of team goals. Relies on good feeding from GA/WA. High goals = good positioning and finishing. Low goals despite playing time = may need better feeds or is being well-defended.
- **GA (Goal Attack)**: Secondary scorer AND feeder. Can be a "shooting GA" (high personal goals) or "feeding GA" (enables GS). If GA outscores GS consistently, either GA is exceptional or GS needs more support. GA scoring 30-40% of goals is typical.

**MIDCOURT POSITIONS (WA, C, WD):**
- **WA (Wing Attack)**: Primary feeder to shooters. Cannot score. Impact shows indirectly through GS/GA goals when WA is on court. A good WA lifts the whole attacking unit's output.
- **C (Centre)**: THE KEY CONNECTOR - appears in both attacking and defensive units. High workrate position. A good Centre improves BOTH the attacking unit's goals scored AND the defensive unit's goals against. Compare team +/- with different Centres to identify impact.
- **WD (Wing Defence)**: Disrupts opposition attack. Impact shows in lower goals AGAINST when on court. Works with GD to pressure the ball before it reaches the circle.

**DEFENSIVE POSITIONS (GD & GK):**
- **GD (Goal Defence)**: Pressures opposition GA. Measured by goals conceded when on court. Lower = better. Works as a unit with GK - hard to separate individual impact.
- **GK (Goal Keeper)**: Last line of defence against GS. Same measurement - goals against when on court. GK-GD pairs that play together regularly develop communication and should show improving stats over time.

### Understanding Plus/Minus (+/-) for Units

**ATTACKING UNIT (GS-GA-WA-C):**
- Measures goals scored MINUS goals conceded when these 4 play together
- Positive +/- means outscoring opponents with this unit
- Best attacking units typically show +1.5 to +3.0 per quarter
- If high goals FOR but also high goals AGAINST = exciting but leaky
- Compare different GS-GA pairs to find best shooting chemistry

**DEFENSIVE UNIT (GK-GD-WD-C):**
- Measures the same but focus on goals AGAINST being low
- A defensive unit allowing <3 goals/quarter is excellent
- The C links both units - a drop in defensive +/- when C changes highlights Centre importance
- Consistent GK-GD pairs outperform rotating pairs (communication builds over 8-12 quarters together)

**THE CENTRE'S DUAL IMPACT:**
- Centre is the ONLY position in both attacking and defensive units
- Compare team performance with different Centres to see who lifts both ends
- A Centre who improves attacking +/- but hurts defensive +/- may be too attack-focused
- Best Centres maintain or improve BOTH unit stats

### GS-GA Scoring Pair Chemistry

**Signs of Good Chemistry (in the stats):**
- Combined goals consistently high across games
- Balanced split (not one player doing everything)
- Goals stay high even against tough opponents
- Low variance game-to-game

**Signs of Poor Chemistry:**
- One shooter dominates while other is starved
- Combined output varies wildly between games
- Goals drop significantly against any pressure

**Building Chemistry:**
- Pairs need 8-12 quarters together to develop timing
- Short-term rotation hurts chemistry but aids development
- For important games, use established pairs; for development games, experiment

### GK-GD Defensive Pair Analysis

**What to Look For:**
- Goals against per quarter when paired together
- Consistency across games (low variance = reliable)
- Performance against strong vs weak opponents

**Good Defensive Pair Indicators:**
- <3.5 goals against per quarter average
- Maintain performance in Q3/Q4 (don't fade)
- Goals against doesn't spike against good teams

**Pair Development:**
- Defence requires MORE time together than attack (reading each other's positioning)
- 10-15 quarters together before judging a new pair
- Verbal communication is critical - shy players may struggle initially

### Quarter-by-Quarter Patterns (Junior Context)

**Q1 - The Fresh Start:**
- Often highest scoring quarter (energy, focus)
- Team that wins Q1 wins ~65% of games
- Start your most reliable combinations

**Q2 - Pre-Halftime Drift:**
- Concentration often drops in juniors
- Good time to test new combinations (lower stakes)
- If consistently losing Q2, address focus/hydration

**Q3 - The Danger Quarter:**
- Post-halftime lethargy is real in junior netball
- Teams often lose focus, give up leads
- If your team loses Q3 consistently, improve halftime routine
- Consider using best defenders to "hold" rather than attack

**Q4 - The Fitness Test:**
- Fitter teams close strong
- If fading in Q4, consider more rotation earlier OR fitness work
- Big games: use your best closers regardless of fairness
- Development games: give everyone Q4 time

### Junior Netball Benchmarks

**Scoring by Age Group (approximate team totals):**
- U11: 8-15 goals/game typical, 2-3 per quarter per shooter is good
- U13: 15-28 goals/game typical, 3-5 per quarter per shooter is good
- U15: 25-40 goals/game typical, 5-8 per quarter per shooter is good
- High variance is NORMAL - don't overreact to single games

**Realistic Expectations:**
- Winning 50%+ of quarters = competitive team
- +2 average quarter differential = strong team
- Consistency matters more than peaks
- Development > winning at junior level (but winning helps confidence)

### Position Development Pathways

**Natural Progressions:**
- WA → GA (learns circle movement, then adds shooting)
- WD → GD (learns defensive pressure, then circle defence)
- C → any midcourt position (most transferable skills)
- GS ↔ GK (height often determines, but skills transfer)

**Versatility Indicators:**
- 3+ positions played = high game IQ
- Maintains performance across positions = true versatility
- Stats drop in new position initially = NORMAL (allow 4-6 quarters to adjust)

**Development vs Results Trade-off:**
- Trying new positions hurts short-term stats
- Players who only play one position plateau faster
- Rotate in low-stakes games, specialize in important games

---

`;
}

/**
 * Enhanced AI insights using pre-calculated analytics from the frontend
 * @param {Object} analytics - Rich analytics data passed from the PWA
 * @returns {string} AI-generated insights in markdown format
 */
function getAIInsightsWithAnalytics(analytics) {
  var apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured in Script Properties');
  }

  var teamName = analytics.teamName || 'Team';
  var record = analytics.record || {};
  var scoring = analytics.scoring || {};
  var quarterAnalysis = analytics.quarterAnalysis || {};
  var leaderboards = analytics.leaderboards || {};
  var combinations = analytics.combinations || {};
  var form = analytics.form || [];
  var gameResults = analytics.gameResults || [];
  var players = analytics.players || [];

  // Build comprehensive prompt with netball knowledge and team data
  var prompt = 'You are an expert netball coach assistant analyzing ' + teamName + '. ' +
    'Use your netball knowledge to provide specific, actionable insights.\n\n' +
    getNetballKnowledgePreamble();

  // SECTION 1: Team Overview
  prompt += '## TEAM OVERVIEW\n';
  prompt += 'Record: ' + record.wins + 'W-' + record.losses + 'L-' + record.draws + 'D (' + record.winRate + '% win rate) from ' + record.gameCount + ' games\n';
  prompt += 'Goals: ' + scoring.goalsFor + ' scored, ' + scoring.goalsAgainst + ' conceded (diff: ' + (scoring.goalDiff > 0 ? '+' : '') + scoring.goalDiff + ')\n';
  prompt += 'Averages: ' + scoring.avgFor + ' goals/game scored, ' + scoring.avgAgainst + ' goals/game conceded\n';
  if (form.length > 0) {
    prompt += 'Recent form (last ' + form.length + ' games): ' + form.join('-') + '\n';
  }
  prompt += '\n';

  // SECTION 2: Quarter-by-Quarter Analysis
  if (quarterAnalysis.bestQuarter) {
    prompt += '## QUARTER ANALYSIS\n';
    prompt += 'Best quarter: ' + quarterAnalysis.bestQuarter + ' (avg +' + quarterAnalysis.bestQuarterDiff + ' differential)\n';
    if (quarterAnalysis.stats) {
      var qs = quarterAnalysis.stats;
      ['Q1', 'Q2', 'Q3', 'Q4'].forEach(function(q) {
        if (qs[q] && qs[q].games > 0) {
          var avgFor = Math.round((qs[q].for / qs[q].games) * 10) / 10;
          var avgAgainst = Math.round((qs[q].against / qs[q].games) * 10) / 10;
          var diff = avgFor - avgAgainst;
          prompt += q + ': avg ' + avgFor + ' scored, ' + avgAgainst + ' conceded (' + (diff >= 0 ? '+' : '') + diff.toFixed(1) + ')\n';
        }
      });
    }
    prompt += '\n';
  }

  // SECTION 3: Game Results (with opponent ladder rank when available)
  if (gameResults.length > 0) {
    prompt += '## GAME-BY-GAME RESULTS\n';
    gameResults.forEach(function(g) {
      var rankInfo = g.opponentRank ? ' [opp ranked ' + g.opponentRank + ']' : '';
      prompt += 'R' + g.round + ' vs ' + g.opponent + rankInfo + ': ' + g.score + ' (' + g.result + ', ' + (g.diff >= 0 ? '+' : '') + g.diff + ')\n';
    });
    prompt += '\n';
  }

  // SECTION 3.5: Strength of Schedule & Division Context
  var sos = analytics.strengthOfSchedule;
  if (sos) {
    prompt += '## STRENGTH OF SCHEDULE\n';
    prompt += 'Rating: ' + sos.rating + '/100 (' + sos.label + ')\n';
    prompt += 'Average opponent position: ' + sos.avgOpponentPosition + ' (from ' + sos.gamesMatched + ' matched games)\n';
    prompt += 'Context: Factor opponent strength when evaluating wins/losses. A win against a top-3 team is more impressive than against a bottom team.\n\n';
  }
  var divCtx = analytics.divisionContext;
  if (divCtx && divCtx.length > 0) {
    prompt += '## DIVISION STANDINGS (W-L-D)\n';
    divCtx.forEach(function(t) {
      prompt += t.team + ': ' + t.record + '\n';
    });
    prompt += '\n';
  }

  // SECTION 4: Offensive Leaders
  prompt += '## OFFENSIVE ANALYSIS\n';
  if (leaderboards.topScorers && leaderboards.topScorers.length > 0) {
    prompt += 'Top scorers (by total goals):\n';
    leaderboards.topScorers.forEach(function(s, i) {
      prompt += (i + 1) + '. ' + s.name + ': ' + s.goals + ' goals in ' + s.quarters + ' quarters (' + s.avg + '/quarter)\n';
    });
  }
  if (leaderboards.topScorersByEfficiency && leaderboards.topScorersByEfficiency.length > 0) {
    prompt += 'Most efficient scorers (min 3 quarters):\n';
    leaderboards.topScorersByEfficiency.forEach(function(s, i) {
      prompt += (i + 1) + '. ' + s.name + ': ' + s.avg + ' goals/quarter over ' + s.quarters + ' quarters\n';
    });
  }
  if (leaderboards.topScoringPairs && leaderboards.topScoringPairs.length > 0) {
    prompt += 'Best GS-GA pairs:\n';
    leaderboards.topScoringPairs.forEach(function(p, i) {
      prompt += (i + 1) + '. ' + p.players + ': ' + p.goals + ' goals in ' + p.quarters + ' quarters together (' + p.avg + '/quarter)\n';
    });
  }
  prompt += '\n';

  // SECTION 5: Defensive Leaders
  prompt += '## DEFENSIVE ANALYSIS\n';
  if (leaderboards.topDefenders && leaderboards.topDefenders.length > 0) {
    prompt += 'Most efficient defenders (GD/GK, lowest goals conceded/quarter, min 3 quarters):\n';
    leaderboards.topDefenders.forEach(function(d, i) {
      prompt += (i + 1) + '. ' + d.name + ': ' + d.avg + ' goals against/quarter over ' + d.quarters + ' quarters\n';
    });
  }
  if (leaderboards.topDefensivePairs && leaderboards.topDefensivePairs.length > 0) {
    prompt += 'Best GD-GK defensive pairs:\n';
    leaderboards.topDefensivePairs.forEach(function(p, i) {
      prompt += (i + 1) + '. ' + p.players + ': ' + p.avg + ' goals against/quarter over ' + p.quarters + ' quarters together\n';
    });
  }
  prompt += '\n';

  // SECTION 6: Lineup Combinations
  prompt += '## LINEUP COMBINATIONS\n';
  if (combinations.bestAttackingUnit) {
    var au = combinations.bestAttackingUnit;
    prompt += 'Best attacking unit (GS-GA-WA-C): ' + au.players.GS + ', ' + au.players.GA + ', ' + au.players.WA + ', ' + au.players.C + '\n';
    prompt += '  - ' + au.quarters + ' quarters together, ' + au.avgFor + ' goals/quarter, +/- ' + au.plusMinus + '\n';
  }
  if (combinations.bestDefensiveUnit) {
    var du = combinations.bestDefensiveUnit;
    prompt += 'Best defensive unit (GK-GD-WD-C): ' + du.players.GK + ', ' + du.players.GD + ', ' + du.players.WD + ', ' + du.players.C + '\n';
    prompt += '  - ' + du.quarters + ' quarters together, ' + du.avgAgainst + ' goals against/quarter, +/- ' + du.plusMinus + '\n';
  }
  prompt += '\n';

  // SECTION 7: Roster
  prompt += '## ROSTER (' + players.length + ' players)\n';
  players.forEach(function(p) {
    var desc = p.name;
    if (p.fillIn) desc += ' (fill-in)';
    if (p.favPosition) desc += ' [prefers ' + p.favPosition + ']';
    prompt += '- ' + desc + '\n';
  });
  prompt += '\n';

  // Instructions for response format
  prompt += '---\n';
  prompt += 'Based on this data, provide insights in this exact format (be specific with player names and stats):\n\n';
  prompt += '**Season Summary**\n[2-3 sentences on overall performance, form trend, and goal differential]\n\n';
  prompt += '**Key Strengths**\n[2-3 bullet points highlighting what the data shows they do well - cite specific players/pairs/stats]\n\n';
  prompt += '**Areas to Improve**\n[2-3 bullet points with specific, constructive suggestions based on weak quarters or stats]\n\n';
  prompt += '**Lineup Recommendations**\n[Specific pairing or unit suggestions based on the combination data]\n\n';
  prompt += '**Tactical Tips**\n[2-3 actionable tips for the next game based on patterns in the data]';

  // Call Gemini API
  var response = UrlFetchApp.fetch(
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + apiKey,
    {
      method: 'POST',
      contentType: 'application/json',
      payload: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1500
        }
      }),
      muteHttpExceptions: true
    }
  );

  var responseCode = response.getResponseCode();
  var responseText = response.getContentText();

  if (responseCode !== 200) {
    Logger.log('Gemini API error: ' + responseCode + ' - ' + responseText);
    try {
      var errJson = JSON.parse(responseText);
      var errMsg = errJson.error && errJson.error.message ? errJson.error.message : responseText;
      throw new Error('Gemini: ' + errMsg);
    } catch (parseErr) {
      throw new Error('Gemini API error ' + responseCode + ': ' + responseText.substring(0, 200));
    }
  }

  var json = JSON.parse(responseText);
  if (json.candidates && json.candidates[0] && json.candidates[0].content && json.candidates[0].content.parts) {
    return json.candidates[0].content.parts[0].text;
  } else {
    throw new Error('Unexpected Gemini response format');
  }
}

/**
 * Generate AI insights for a single game with player contributions
 * @param {Object} gameData - Game analysis data from the frontend
 * @returns {string} AI-generated game summary in markdown format
 */
function getGameAIInsights(gameData) {
  var apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured in Script Properties');
  }

  var teamName = gameData.teamName || 'Team';
  var round = gameData.round || '?';
  var opponent = gameData.opponent || 'Opponent';
  var result = gameData.result || 'Unknown';
  var finalScore = gameData.finalScore || { us: 0, them: 0 };
  var quarterBreakdown = gameData.quarterBreakdown || [];
  var playerContributions = gameData.playerContributions || [];
  var captain = gameData.captain;
  var location = gameData.location;

  // Build the prompt with netball knowledge
  var prompt = 'You are an expert netball coach assistant. Analyze this game for ' + teamName + ' and provide a detailed summary of the performance with specific player callouts.\n\n' +
    getNetballKnowledgePreamble() +
    '## GAME DATA\n\n';

  // Game Overview
  prompt += '### GAME OVERVIEW\n';
  prompt += 'Round ' + round + ' vs ' + opponent + '\n';
  prompt += 'Final Score: ' + finalScore.us + ' - ' + finalScore.them + ' (' + result + ', diff: ' + (gameData.scoreDiff >= 0 ? '+' : '') + gameData.scoreDiff + ')\n';
  if (location) prompt += 'Location: ' + location + '\n';
  if (captain) prompt += 'Captain: ' + captain + '\n';
  prompt += '\n';

  // Quarter-by-Quarter Breakdown
  prompt += '## QUARTER-BY-QUARTER BREAKDOWN\n';
  quarterBreakdown.forEach(function(q) {
    prompt += q.quarter + ': ' + q.us + '-' + q.them + ' (' + (q.diff >= 0 ? '+' : '') + q.diff + ')\n';
    if (q.lineup && Object.keys(q.lineup).length > 0) {
      var lineupParts = [];
      ['GS', 'GA', 'WA', 'C', 'WD', 'GD', 'GK'].forEach(function(pos) {
        if (q.lineup[pos]) {
          lineupParts.push(pos + ': ' + q.lineup[pos]);
        }
      });
      if (lineupParts.length > 0) {
        prompt += '  Lineup: ' + lineupParts.join(', ') + '\n';
      }
    }
  });
  prompt += '\n';

  // Player Contributions
  prompt += '## PLAYER CONTRIBUTIONS\n';
  if (playerContributions.length > 0) {
    playerContributions.forEach(function(p) {
      var desc = p.name + ': ' + p.quarters + ' quarters played';
      if (p.positions && p.positions.length > 0) {
        desc += ' (' + p.positions.join('/') + ')';
      }
      if (p.goalsScored > 0) {
        desc += ', ' + p.goalsScored + ' goals';
        if (p.quartersAtGS > 0 && p.quartersAtGA > 0) {
          desc += ' (played both GS and GA)';
        }
      }
      if (p.quartersDefending > 0) {
        desc += ', ' + p.quartersDefending + ' quarters on defense';
      }
      prompt += '- ' + desc + '\n';
    });
  } else {
    prompt += 'No player data available.\n';
  }
  prompt += '\n';

  // Coach Notes (if any)
  var coachNotes = gameData.coachNotes || [];
  if (coachNotes.length > 0) {
    prompt += '## COACH NOTES\n';
    prompt += 'The coach recorded these observations during the game:\n';
    coachNotes.forEach(function(n) {
      prompt += '- ' + n.quarter + ': ' + n.notes + '\n';
    });
    prompt += '\n';
  }

  // Instructions
  prompt += '---\n';
  prompt += 'Provide a game summary in this exact format (be specific with player names):\n\n';
  prompt += '**Match Summary**\n[2-3 sentences summarizing the game flow - who controlled early, any momentum shifts, how it finished]\n\n';
  prompt += '**Key Performers**\n[2-3 bullet points highlighting standout players by name with specific stats - goals scored, defensive efforts, versatility]\n\n';
  prompt += '**Quarter Analysis**\n[Brief analysis of which quarters were strongest/weakest and why based on lineups]\n\n';
  prompt += '**Tactical Observations**\n[2-3 observations about what worked well or could improve - specific to this game\'s lineup decisions]\n\n';
  prompt += '**Player Development Notes**\n[1-2 notes about players who showed growth, tried new positions, or could be developed further]';

  if (coachNotes.length > 0) {
    prompt += '\n\n**Important:** Incorporate the coach\'s notes into your analysis where relevant. Reference specific observations the coach made and connect them to the stats and lineup data.';
  }

  // Call Gemini API
  var response = UrlFetchApp.fetch(
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + apiKey,
    {
      method: 'POST',
      contentType: 'application/json',
      payload: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1200
        }
      }),
      muteHttpExceptions: true
    }
  );

  var responseCode = response.getResponseCode();
  var responseText = response.getContentText();

  if (responseCode !== 200) {
    Logger.log('Gemini API error (game): ' + responseCode + ' - ' + responseText);
    try {
      var errJson = JSON.parse(responseText);
      var errMsg = errJson.error && errJson.error.message ? errJson.error.message : responseText;
      throw new Error('Gemini: ' + errMsg);
    } catch (parseErr) {
      throw new Error('Gemini API error ' + responseCode + ': ' + responseText.substring(0, 200));
    }
  }

  var json = JSON.parse(responseText);
  if (json.candidates && json.candidates[0] && json.candidates[0].content && json.candidates[0].content.parts) {
    return json.candidates[0].content.parts[0].text;
  } else {
    throw new Error('Unexpected Gemini response format');
  }
}

/**
 * Generate AI insights for an individual player's season performance
 * @param {Object} playerData - Player analysis data from the frontend
 * @returns {string} AI-generated player summary in markdown format
 */
function getPlayerAIInsights(playerData) {
  var apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured in Script Properties');
  }

  var playerName = playerData.name || 'Player';
  var teamName = playerData.teamName || 'Team';
  var isFillIn = playerData.fillIn || false;
  var favPosition = playerData.favPosition || null;
  var stats = playerData.stats || {};
  var positionBreakdown = playerData.positionBreakdown || [];
  var gameHistory = playerData.gameHistory || [];
  var teamContext = playerData.teamContext || {};

  // Build prompt with netball knowledge
  var prompt = 'You are an expert netball coach providing a personalized player development report for ' + playerName + ' from ' + teamName + '.\n\n' +
    getNetballKnowledgePreamble() +
    '## PLAYER DATA\n\n';

  // Player Overview
  prompt += '### PLAYER PROFILE\n';
  prompt += 'Name: ' + playerName + '\n';
  if (isFillIn) prompt += 'Status: Fill-in player\n';
  if (favPosition) prompt += 'Preferred Position: ' + favPosition + '\n';
  prompt += '\n';

  // Season Stats
  prompt += '### SEASON STATISTICS\n';
  prompt += 'Games Played: ' + (stats.gamesPlayed || 0) + '\n';
  prompt += 'Quarters Played: ' + (stats.quartersPlayed || 0) + '\n';
  prompt += 'Total Goals: ' + (stats.totalGoals || 0) + '\n';
  if (stats.gamesPlayed > 0) {
    prompt += 'Goals Per Game: ' + (stats.avgGoalsPerGame || '0.0') + '\n';
  }
  if (stats.quartersPlayed > 0 && stats.totalGoals > 0) {
    var goalsPerQuarter = (stats.totalGoals / stats.quartersPlayed).toFixed(2);
    prompt += 'Goals Per Quarter (when scoring): ' + goalsPerQuarter + '\n';
  }
  prompt += '\n';

  // Position Breakdown
  if (positionBreakdown.length > 0) {
    prompt += '### POSITIONS PLAYED\n';
    positionBreakdown.forEach(function(p) {
      prompt += '- ' + p.position + ': ' + p.count + ' quarters (' + p.percentage + '%)\n';
    });
    prompt += '\n';

    // Calculate versatility
    var numPositions = positionBreakdown.length;
    if (numPositions >= 4) {
      prompt += 'Versatility: HIGH - played ' + numPositions + ' different positions\n';
    } else if (numPositions >= 2) {
      prompt += 'Versatility: MODERATE - played ' + numPositions + ' positions\n';
    } else {
      prompt += 'Versatility: SPECIALIST - focused on ' + positionBreakdown[0].position + '\n';
    }
    prompt += '\n';
  }

  // Game-by-Game History (detailed)
  if (gameHistory.length > 0) {
    prompt += '### GAME-BY-GAME PERFORMANCE\n';
    gameHistory.forEach(function(g) {
      var posStr = g.positions && g.positions.length > 0 ? g.positions.join('/') : 'unknown';
      var goalStr = g.goals > 0 ? ', scored ' + g.goals + ' goals' : '';
      var resultStr = g.result ? g.result : '';
      var scoreStr = g.score ? ' ' + g.score : '';
      var quartersStr = g.quartersInGame ? ', played ' + g.quartersInGame + '/4 quarters' : '';

      prompt += '\n**Round ' + g.round + ' vs ' + g.opponent + '** (' + resultStr + scoreStr + ')\n';
      prompt += '- Positions: ' + posStr + quartersStr + goalStr + '\n';

      // Add quarter-by-quarter detail if available
      if (g.quarterDetails && g.quarterDetails.length > 0) {
        g.quarterDetails.forEach(function(qd) {
          var qGoalStr = qd.goals > 0 ? ' - ' + qd.goals + ' goals' : '';
          prompt += '- ' + qd.quarter + ': ' + qd.position + qGoalStr + '\n';
        });
      }
    });
    prompt += '\n';
  }

  // Team Context
  if (teamContext.teamRecord) {
    prompt += '### TEAM CONTEXT\n';
    prompt += 'Team Record: ' + teamContext.teamRecord + '\n';
    if (teamContext.topScorers && teamContext.topScorers.length > 0) {
      prompt += 'Team Top Scorers: ' + teamContext.topScorers.join(', ') + '\n';
    }
    prompt += '\n';
  }

  // Instructions
  prompt += '---\n';
  prompt += 'Provide a personalized player report in this exact format (be encouraging but specific):\n\n';
  prompt += '**Season Summary**\n[2-3 sentences summarizing their overall contribution to the team this season - total impact, consistency, and role]\n\n';
  prompt += '**Round-by-Round Performance**\n[For EACH round they played, provide a 1-sentence insight about their performance that game. Format as:\n- R1 vs [Opponent]: [Brief insight about their contribution, position played, goals if any]\n- R2 vs [Opponent]: [Brief insight]\n...and so on for each game]\n\n';
  prompt += '**Strengths**\n[2-3 bullet points on what they do well, based on positions played and stats across the season]\n\n';
  prompt += '**Development Areas**\n[2-3 constructive suggestions for improvement based on their position history and game performances]\n\n';
  prompt += '**Position Recommendation**\n[Based on their stats and versatility, suggest their best position(s) and any positions worth trying]\n\n';
  prompt += '**Goals for Next Games**\n[2-3 specific, achievable goals for upcoming games based on their trajectory]';

  // Call Gemini API
  var response = UrlFetchApp.fetch(
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + apiKey,
    {
      method: 'POST',
      contentType: 'application/json',
      payload: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1500
        }
      }),
      muteHttpExceptions: true
    }
  );

  var responseCode = response.getResponseCode();
  var responseText = response.getContentText();

  if (responseCode !== 200) {
    Logger.log('Gemini API error (player): ' + responseCode + ' - ' + responseText);
    try {
      var errJson = JSON.parse(responseText);
      var errMsg = errJson.error && errJson.error.message ? errJson.error.message : responseText;
      throw new Error('Gemini: ' + errMsg);
    } catch (parseErr) {
      throw new Error('Gemini API error ' + responseCode + ': ' + responseText.substring(0, 200));
    }
  }

  var json = JSON.parse(responseText);
  if (json.candidates && json.candidates[0] && json.candidates[0].content && json.candidates[0].content.parts) {
    return json.candidates[0].content.parts[0].text;
  } else {
    throw new Error('Unexpected Gemini response format');
  }
}

/**
 * Generate training focus suggestions from aggregated game notes
 * @param {Object} data - Training data with notes and stats from the frontend
 * @returns {string} AI-generated training suggestions in markdown format
 */
function getTrainingFocus(data) {
  var apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured in Script Properties');
  }

  var prompt = getNetballKnowledgePreamble();

  prompt += '\n\n# TRAINING FOCUS ANALYSIS\n\n';
  prompt += 'You are analyzing a junior netball team\'s season to recommend training focus areas based on coach observations and performance data.\n\n';

  prompt += '## TEAM CONTEXT\n';
  prompt += 'Team: ' + (data.teamName || 'Team') + '\n';
  prompt += 'Record: ' + data.seasonRecord.wins + 'W-' + data.seasonRecord.losses + 'L-' + data.seasonRecord.draws + 'D';
  if (data.seasonRecord.gameCount > 0) {
    prompt += ' (' + data.seasonRecord.winRate + '% win rate from ' + data.seasonRecord.gameCount + ' games)';
  }
  prompt += '\n\n';

  // Coach notes from RECENT games (primary focus)
  prompt += '## RECENT GAMES (Primary Focus)\n';
  prompt += 'These are the most recent games - prioritize addressing these observations:\n\n';
  if (data.recentGameNotes && data.recentGameNotes.length > 0) {
    data.recentGameNotes.forEach(function(game) {
      prompt += '### Round ' + game.round + ' vs ' + game.opponent + ' (' + game.result + ')\n';
      game.notes.forEach(function(n) {
        prompt += '- ' + n.quarter + ': ' + n.text + '\n';
      });
      prompt += '\n';
    });
  } else {
    prompt += 'No recent notes recorded.\n\n';
  }

  // Coach notes from EARLIER games (context for persistent issues)
  if (data.earlierGameNotes && data.earlierGameNotes.length > 0) {
    prompt += '## EARLIER SEASON (Context)\n';
    prompt += 'Notes from earlier in the season - look for persistent patterns that are STILL appearing in recent games:\n\n';
    data.earlierGameNotes.forEach(function(game) {
      prompt += '### Round ' + game.round + ' vs ' + game.opponent + ' (' + game.result + ')\n';
      game.notes.forEach(function(n) {
        prompt += '- ' + n.quarter + ': ' + n.text + '\n';
      });
      prompt += '\n';
    });
  }

  // Note patterns from recent games (higher priority)
  if (data.recentNoteFrequency && Object.keys(data.recentNoteFrequency).length > 0) {
    prompt += '## RECENT PATTERNS (High Priority)\n';
    prompt += 'Keywords/names mentioned in recent games:\n';
    var recentKeywords = Object.keys(data.recentNoteFrequency).sort(function(a, b) {
      return data.recentNoteFrequency[b] - data.recentNoteFrequency[a];
    });
    recentKeywords.forEach(function(keyword) {
      prompt += '- "' + keyword + '": ' + data.recentNoteFrequency[keyword] + ' times\n';
    });
    prompt += '\n';
  }

  // Note patterns from earlier games (persistent issues)
  if (data.earlierNoteFrequency && Object.keys(data.earlierNoteFrequency).length > 0) {
    prompt += '## SEASON-LONG PATTERNS\n';
    prompt += 'Keywords mentioned earlier in season (flag if still appearing recently):\n';
    var earlierKeywords = Object.keys(data.earlierNoteFrequency).sort(function(a, b) {
      return data.earlierNoteFrequency[b] - data.earlierNoteFrequency[a];
    });
    earlierKeywords.forEach(function(keyword) {
      var stillAppearing = data.recentNoteFrequency && data.recentNoteFrequency[keyword];
      prompt += '- "' + keyword + '": ' + data.earlierNoteFrequency[keyword] + ' times' + (stillAppearing ? ' (STILL APPEARING in recent games)' : '') + '\n';
    });
    prompt += '\n';
  }

  // Statistical context
  prompt += '## STATISTICAL CONTEXT\n';
  if (data.weakQuarters && Object.keys(data.weakQuarters).length > 0) {
    prompt += 'Weak quarters (avg differential below -1):\n';
    Object.keys(data.weakQuarters).forEach(function(q) {
      prompt += '- ' + q + ': avg ' + data.weakQuarters[q].avgDiff + ' differential\n';
    });
    prompt += '\n';
  }
  if (data.form && data.form.length > 0) {
    prompt += 'Recent form: ' + data.form.join('-') + '\n';
  }
  if (data.playerStats && data.playerStats.length > 0) {
    prompt += '\nTop scorers:\n';
    data.playerStats.forEach(function(p, i) {
      prompt += (i + 1) + '. ' + p.name + ': ' + p.goals + ' goals in ' + p.quarters + ' quarters\n';
    });
  }
  prompt += '\n';

  // Training sessions conducted (NEW)
  if (data.trainingSessions && data.trainingSessions.length > 0) {
    prompt += '## TRAINING SESSIONS CONDUCTED\n';
    prompt += 'Recent training sessions and attendance:\n\n';
    data.trainingSessions.forEach(function(session) {
      prompt += '### ' + session.date + ' - ' + session.focus + '\n';
      if (session.attended && session.attended.length > 0) {
        prompt += '- Attended: ' + session.attended.join(', ') + '\n';
      }
      if (session.missed && session.missed.length > 0) {
        prompt += '- Missed: ' + session.missed.join(', ') + '\n';
      }
      if (session.notes) {
        prompt += '- Coach notes: ' + session.notes + '\n';
      }
      prompt += '\n';
    });
  }

  // Training effectiveness analysis (issue timeline - NEW)
  if (data.issueTimeline && data.issueTimeline.length > 0) {
    prompt += '## TRAINING EFFECTIVENESS ANALYSIS\n';
    prompt += 'Correlating game notes with training sessions:\n\n';
    data.issueTimeline.forEach(function(issue) {
      prompt += '### Issue: "' + issue.issue + '"\n';
      prompt += '- First noted: ' + issue.firstMentioned;
      if (issue.playersWithIssue && issue.playersWithIssue.length > 0) {
        prompt += ' for ' + issue.playersWithIssue.join(', ');
      }
      prompt += '\n';

      if (issue.trainingSinceFirst && issue.trainingSinceFirst.length > 0) {
        prompt += '- Training conducted to address this:\n';
        issue.trainingSinceFirst.forEach(function(session) {
          prompt += '  - ' + session.date + ' (' + session.focus + ')';
          if (session.attended && session.attended.length > 0) {
            prompt += ' - Attended: ' + session.attended.join(', ');
          }
          if (session.missed && session.missed.length > 0) {
            prompt += ' - MISSED: ' + session.missed.join(', ');
          }
          prompt += '\n';
        });
      }

      if (issue.stillAppearingFor && issue.stillAppearingFor.length > 0) {
        prompt += '- STILL APPEARING for: ' + issue.stillAppearingFor.join(', ') + '\n';
      }
      prompt += '\n';
    });
  }

  // Player training attendance (NEW)
  if (data.playerTrainingAttendance && Object.keys(data.playerTrainingAttendance).length > 0) {
    prompt += '## PLAYER TRAINING ATTENDANCE\n';
    var attendanceEntries = Object.keys(data.playerTrainingAttendance).map(function(name) {
      var att = data.playerTrainingAttendance[name];
      return { name: name, rate: att.rate, attended: att.attended, missed: att.missed };
    });
    // Sort by attendance rate ascending (lowest first - most concerning)
    attendanceEntries.sort(function(a, b) { return a.rate - b.rate; });
    attendanceEntries.forEach(function(entry) {
      var concern = entry.rate < 75 ? ' (LOW - may be missing key skills work)' : '';
      prompt += '- ' + entry.name + ': ' + entry.rate + '% attendance (' + entry.attended + '/' + (entry.attended + entry.missed) + ' sessions)' + concern + '\n';
    });
    prompt += '\n';
  }

  // Instructions for response
  prompt += '---\n\n';
  prompt += 'Based on the coach\'s notes, training sessions, and statistics, provide training recommendations in this format:\n\n';
  prompt += '**Team Focus Areas**\n';
  prompt += '[2-3 team-wide issues identified from RECENT games, with specific drill suggestions appropriate for junior players. Note if any issues are persistent from earlier in the season.]\n\n';
  prompt += '**Individual Focus Areas**\n';
  prompt += '[1-2 player-specific development areas if specific players are mentioned in RECENT notes - skip this section if no individual patterns found]\n\n';
  prompt += '**Training Effectiveness**\n';
  prompt += '[If training sessions have been conducted: note what\'s working (issues that improved after training), what needs reinforcement (persistent issues despite training), and any players who missed key sessions and may need catch-up work. If no training sessions recorded, skip this section.]\n\n';
  prompt += '**Priority This Week**\n';
  prompt += '[Top 2 most impactful things to address at training THIS WEEK, based on the most recent games. If an issue keeps appearing from earlier in the season, flag it as "persistent". If a player missed training on a skill they\'re struggling with, recommend 1:1 catch-up.]\n\n';
  prompt += 'IMPORTANT: Prioritize issues from RECENT games over older notes. Only mention earlier season patterns if they are STILL appearing in recent games (persistent issues). If training session data is available, correlate attendance with improvement - players who attended relevant training should show improvement, while those who missed may still struggle. Be specific with drill suggestions. Reference the actual notes the coach made. Keep language encouraging and developmentally appropriate for junior players.';

  // Call Gemini API
  var response = UrlFetchApp.fetch(
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + apiKey,
    {
      method: 'POST',
      contentType: 'application/json',
      payload: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1500
        }
      }),
      muteHttpExceptions: true
    }
  );

  var responseCode = response.getResponseCode();
  var responseText = response.getContentText();

  if (responseCode !== 200) {
    Logger.log('Gemini API error (training): ' + responseCode + ' - ' + responseText);
    try {
      var errJson = JSON.parse(responseText);
      var errMsg = errJson.error && errJson.error.message ? errJson.error.message : responseText;
      throw new Error('Gemini: ' + errMsg);
    } catch (parseErr) {
      throw new Error('Gemini API error ' + responseCode + ': ' + responseText.substring(0, 200));
    }
  }

  var json = JSON.parse(responseText);
  if (json.candidates && json.candidates[0] && json.candidates[0].content && json.candidates[0].content.parts) {
    return json.candidates[0].content.parts[0].text;
  } else {
    throw new Error('Unexpected Gemini response format');
  }
}

/**
 * Training Correlator (Phase 4) — structured JSON output.
 * Same inputs as getTrainingFocus but returns machine-readable correlation data
 * the frontend can render as priority cards with severity and catch-up flags.
 *
 * Returns: {
 *   success, generatedAt,
 *   teamFocus: [{ issue, priority:'high'|'medium'|'low', persistent, drills }],
 *   individualFocus: [{ player, area, recommendation, catchUp }],
 *   effectiveness: [{ issue, status:'improving'|'needs_work'|'unknown', detail }],
 *   priorityThisWeek: [{ focus, rationale, type:'team'|'individual' }]
 * }
 */
function generateTrainingCorrelation(data) {
  var apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured');

  var prompt = getNetballKnowledgePreamble();
  prompt += '\n\n# TRAINING CORRELATOR — STRUCTURED OUTPUT\n\n';
  prompt += 'You are analyzing a junior netball team\'s coaching notes, training sessions, and attendance to produce a structured training correlation report.\n\n';

  prompt += '## TEAM: ' + (data.teamName || 'Team') + '\n';
  prompt += 'Record: ' + data.seasonRecord.wins + 'W-' + data.seasonRecord.losses + 'L-' + data.seasonRecord.draws + 'D\n\n';

  if (data.recentGameNotes && data.recentGameNotes.length > 0) {
    prompt += '## RECENT GAMES (last 3 with notes — primary focus)\n';
    data.recentGameNotes.forEach(function(g) {
      prompt += 'R' + g.round + ' vs ' + g.opponent + ' (' + g.result + '):\n';
      g.notes.forEach(function(n) { prompt += '  ' + n.quarter + ': ' + n.text + '\n'; });
    });
    prompt += '\n';
  }

  if (data.earlierGameNotes && data.earlierGameNotes.length > 0) {
    prompt += '## EARLIER SEASON (context — flag persistent issues)\n';
    data.earlierGameNotes.forEach(function(g) {
      prompt += 'R' + g.round + ' vs ' + g.opponent + ': ' + g.notes.map(function(n){ return n.text; }).join(' | ') + '\n';
    });
    prompt += '\n';
  }

  if (data.trainingSessions && data.trainingSessions.length > 0) {
    prompt += '## TRAINING SESSIONS\n';
    data.trainingSessions.forEach(function(s) {
      prompt += s.date + ' — ' + s.focus;
      if (s.attended && s.attended.length) prompt += ' | Attended: ' + s.attended.join(', ');
      if (s.missed && s.missed.length) prompt += ' | Missed: ' + s.missed.join(', ');
      if (s.notes) prompt += ' | Notes: ' + s.notes;
      prompt += '\n';
    });
    prompt += '\n';
  }

  if (data.playerTrainingAttendance && Object.keys(data.playerTrainingAttendance).length > 0) {
    prompt += '## PLAYER ATTENDANCE RATES\n';
    Object.keys(data.playerTrainingAttendance).forEach(function(name) {
      var a = data.playerTrainingAttendance[name];
      prompt += name + ': ' + a.rate + '% (' + a.attended + '/' + (a.attended + a.missed) + ' sessions)\n';
    });
    prompt += '\n';
  }

  if (data.issueTimeline && data.issueTimeline.length > 0) {
    prompt += '## ISSUE TIMELINE\n';
    data.issueTimeline.forEach(function(iss) {
      prompt += 'Issue "' + iss.issue + '" — first seen ' + iss.firstMentioned;
      if (iss.stillAppearingFor && iss.stillAppearingFor.length) prompt += ' — STILL appearing for: ' + iss.stillAppearingFor.join(', ');
      prompt += '\n';
      if (iss.trainingSinceFirst && iss.trainingSinceFirst.length) {
        iss.trainingSinceFirst.forEach(function(ts) {
          prompt += '  Training: ' + ts.date + ' (' + ts.focus + ')';
          if (ts.missed && ts.missed.length) prompt += ' MISSED by ' + ts.missed.join(', ');
          prompt += '\n';
        });
      }
    });
    prompt += '\n';
  }

  prompt += '---\n\n';
  prompt += 'Respond ONLY with a valid JSON object (no markdown, no code fences) in this exact schema:\n';
  prompt += '{\n';
  prompt += '  "teamFocus": [\n    { "issue": "string (max 60 chars)", "priority": "high|medium|low", "persistent": true|false, "drills": "string (1-2 specific drills, max 100 chars)" }\n  ],\n';
  prompt += '  "individualFocus": [\n    { "player": "string", "area": "string (max 60 chars)", "recommendation": "string (max 100 chars)", "catchUp": true|false }\n  ],\n';
  prompt += '  "effectiveness": [\n    { "issue": "string (max 60 chars)", "status": "improving|needs_work|unknown", "detail": "string (max 100 chars)" }\n  ],\n';
  prompt += '  "priorityThisWeek": [\n    { "focus": "string (max 80 chars)", "rationale": "string (max 120 chars)", "type": "team|individual" }\n  ]\n';
  prompt += '}\n\n';
  prompt += 'Rules:\n';
  prompt += '- teamFocus: 2-3 items max, ordered by priority (high first). Mark persistent:true if issue appeared both early and recent season.\n';
  prompt += '- individualFocus: only include if a specific player is mentioned in RECENT game notes. Mark catchUp:true if they missed training on that skill.\n';
  prompt += '- effectiveness: only if training sessions exist. "improving" = issue reduced after training. "needs_work" = persists despite training. "unknown" = insufficient data.\n';
  prompt += '- priorityThisWeek: 2 items max. Type "individual" if a single player, "team" if group.\n';
  prompt += '- Skip empty arrays (do not include empty [] arrays).\n';
  prompt += '- Respond ONLY with the JSON. No other text.';

  var response = UrlFetchApp.fetch(
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + apiKey,
    {
      method: 'POST',
      contentType: 'application/json',
      payload: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 1200 }
      }),
      muteHttpExceptions: true
    }
  );

  var code = response.getResponseCode();
  var text = response.getContentText();
  if (code !== 200) {
    try {
      var errBody = JSON.parse(text);
      throw new Error('Gemini: ' + (errBody.error && errBody.error.message ? errBody.error.message : text));
    } catch (pe) { throw new Error('Gemini API error ' + code); }
  }

  var parsed = JSON.parse(text);
  var rawText = parsed.candidates[0].content.parts[0].text || '';
  // Strip possible markdown fences
  rawText = rawText.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();

  var correlation;
  try {
    correlation = JSON.parse(rawText);
  } catch (e) {
    throw new Error('Gemini returned invalid JSON: ' + rawText.substring(0, 100));
  }

  return { success: true, generatedAt: new Date().toISOString(), correlation: correlation };
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

    var headers = teamsSheet.getRange(1, 1, 1, 14).getValues()[0];
    var expectedHeaders = ['Team ID', 'Year', 'Season', 'Name', 'Sheet Name', 'Ladder Name', 'Ladder API', 'Results API', 'Archived', 'Player Count', 'Last Modified', 'PIN', 'PinToken', 'Coach'];
    var needsUpdate = false;

    for (var i = 0; i < expectedHeaders.length; i++) {
      if (!headers[i] || headers[i] === '') {
        headers[i] = expectedHeaders[i];
        needsUpdate = true;
      }
    }

    if (needsUpdate) {
      teamsSheet.getRange(1, 1, 1, 14).setValues([headers]);
      Logger.log("Updated Teams sheet headers: " + JSON.stringify(headers));
    }
  } catch (e) {
    Logger.log("Error in ensureTeamsSheetStructure: " + e.message);
  }
}

/**
 * Generates a random 16-character hex token for PIN-based device auth.
 */
function generatePinToken() {
  return Utilities.getUuid().replace(/-/g, '').substring(0, 16);
}

/**
 * Looks up PIN info for a team by teamID.
 * Returns { pin, pinToken, rowIndex } or null if not found.
 */
function getTeamPinInfo(teamID) {
  try {
    var ss = getSpreadsheet();
    var teamsSheet = ss.getSheetByName('Teams');
    var data = teamsSheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] == teamID) {
        return {
          pin: data[i][11] ? String(data[i][11]) : '',
          pinToken: data[i][12] ? String(data[i][12]) : '',
          rowIndex: i + 1
        };
      }
    }
    return null;
  } catch (e) {
    Logger.log('Error in getTeamPinInfo: ' + e.message);
    return null;
  }
}

/**
 * Looks up PIN info for a team by sheetName (used for saveTeamData auth check).
 * Returns { pin, pinToken } or null if not found.
 */
function getTeamPinInfoBySheetName(sheetName) {
  try {
    var ss = getSpreadsheet();
    var teamsSheet = ss.getSheetByName('Teams');
    var data = teamsSheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (data[i][4] == sheetName) {
        return {
          pin: data[i][11] ? String(data[i][11]) : '',
          pinToken: data[i][12] ? String(data[i][12]) : ''
        };
      }
    }
    return null;
  } catch (e) {
    Logger.log('Error in getTeamPinInfoBySheetName: ' + e.message);
    return null;
  }
}

/**
 * Checks if a write operation should be blocked due to PIN auth.
 * Returns true if auth FAILS (should block), false if auth passes or no PIN set.
 */
function checkPinAuthBySheetName(sheetName, clientToken) {
  try {
    var pinInfo = getTeamPinInfoBySheetName(sheetName);
    if (pinInfo && pinInfo.pin && String(pinInfo.pin).length >= 4) {
      return clientToken !== pinInfo.pinToken;
    }
    return false; // No PIN set, allow through
  } catch (e) {
    Logger.log('checkPinAuthBySheetName error: ' + e.message);
    return false; // On error, allow through (don't block saves)
  }
}

/**
 * Checks if a write operation should be blocked due to PIN auth (by teamID).
 * Returns true if auth FAILS (should block), false if auth passes or no PIN set.
 */
function checkPinAuthByTeamID(teamID, clientToken) {
  try {
    var pinInfo = getTeamPinInfo(teamID);
    if (pinInfo && pinInfo.pin && String(pinInfo.pin).length >= 4) {
      return clientToken !== pinInfo.pinToken;
    }
    return false; // No PIN set, allow through
  } catch (e) {
    Logger.log('checkPinAuthByTeamID error: ' + e.message);
    return false; // On error, allow through
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
        resultsApi: row[7] || '', // Column H
        archived: row[8] === true || row[8] === 'true' || row[8] === 'TRUE', // Column I
        playerCount: parseInt(row[9], 10) || 0, // Column J
        lastModified: row[10] || 0, // Column K - timestamp of last data change
        hasPin: !!(row[11]), // Column L - has PIN set (boolean, don't expose actual PIN)
        coach: row[13] || '' // Column N - coach name
      };
      Logger.log("Loaded team: " + team.name + ", archived=" + team.archived + ", players=" + team.playerCount + ", lastModified=" + team.lastModified);
      return team;
    });
    Logger.log("Total teams loaded: " + teams.length);
    return teams;
  } catch (e) {
    Logger.log("Error in loadMasterTeamList: " + e.message);
    return { error: e.message };
  }
}

/**
 * Rebuilds player counts for all teams by reading each team's A1 JSON and updating the Teams sheet.
 * Use sparingly (admin operation) to initialize or repair counts after a migration.
 */
function rebuildPlayerCounts() {
  try {
    var ss = getSpreadsheet();
    var teamsSheet = ss.getSheetByName('Teams');
    if (!teamsSheet) return { error: 'Teams sheet not found' };

    var data = teamsSheet.getDataRange().getValues();
    var updated = 0;

    // Start from row index 1 (skip header)
    for (var i = 1; i < data.length; i++) {
      try {
        var sheetName = data[i][4];
        if (!sheetName) continue;
        var teamSheet = ss.getSheetByName(sheetName);
        if (!teamSheet) continue;
        var json = teamSheet.getRange('A1').getValue() || '{}';
        var teamData = JSON.parse(json || '{}');
        var pc = (teamData.players && Array.isArray(teamData.players)) ? teamData.players.length : 0;
        teamsSheet.getRange(i + 1, 10).setValue(pc);
        updated++;
      } catch (e) {
        Logger.log('rebuildPlayerCounts: failed for row ' + (i + 1) + ': ' + e.message);
      }
    }

    // Invalidate getTeams cache
    try { CacheService.getScriptCache().remove('getTeamsResponse'); Logger.log('rebuildPlayerCounts: invalidated getTeams cache'); } catch (e) { Logger.log('rebuildPlayerCounts: failed to invalidate cache: ' + e.message); }

    return { success: true, updated: updated };
  } catch (e) {
    Logger.log('Error in rebuildPlayerCounts: ' + e.message);
    return { error: e.message };
  }
}

function createNewTeam(year, season, name, ladderName, ladderApi, resultsApi, coach) {
  try {
    var ss = getSpreadsheet();
    var teamsSheet = ss.getSheetByName('Teams');
    var teamID = 'team_' + new Date().getTime();
    var sheetName = 'data_' + teamID;
    var newTeamSheet = ss.insertSheet(sheetName);
    var initialData = { players: [], games: [] };
    newTeamSheet.getRange('A1').setValue(JSON.stringify(initialData));
    // Columns: teamID, year, season, name, sheetName, ladderName, ladderApi, resultsApi, archived, playerCount, lastModified, pin, pinToken, coach
    teamsSheet.appendRow([teamID, year, season, name, sheetName, ladderName || "", ladderApi || "", resultsApi || "", '', 0, '', '', '', coach || '']);
    // Invalidate cached teams list
    try { CacheService.getScriptCache().remove('getTeamsResponse'); Logger.log('createNewTeam: invalidated getTeams cache'); } catch (e) { Logger.log('createNewTeam: failed to invalidate cache: ' + e.message); }
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
        try { CacheService.getScriptCache().remove('getTeamsResponse'); Logger.log('updateTeam: invalidated getTeams cache'); } catch (e) { Logger.log('updateTeam: failed to invalidate cache: ' + e.message); }
        return loadMasterTeamList();
      }
    }
    throw new Error("Team not found for update.");
  } catch (e) {
    Logger.log("Error in updateTeam: " + e.message);
    return { error: e.message };
  }
}

/**
 * Updates team settings (teamName, year, season, archived) from PWA API
 * This is called by the updateTeam API action
 */
function updateTeamSettings(teamID, settings) {
  try {
    Logger.log("updateTeamSettings called with: teamID=" + teamID + ", settings=" + JSON.stringify(settings));
    var ss = getSpreadsheet();
    var teamsSheet = ss.getSheetByName('Teams');
    var data = teamsSheet.getDataRange().getValues();

    for (var i = 1; i < data.length; i++) {
      if (data[i][0] == teamID) {
        var row = i + 1;

        // Update specific fields if provided
        if (settings.teamName !== undefined) {
          teamsSheet.getRange(row, 4).setValue(settings.teamName); // Column D = Name
        }
        if (settings.year !== undefined) {
          teamsSheet.getRange(row, 2).setValue(settings.year); // Column B = Year
        }
        if (settings.season !== undefined) {
          teamsSheet.getRange(row, 3).setValue(settings.season); // Column C = Season
        }
        if (settings.ladderUrl !== undefined) {
          teamsSheet.getRange(row, 7).setValue(settings.ladderUrl); // Column G = Ladder API
        }
        if (settings.resultsApi !== undefined) {
          teamsSheet.getRange(row, 8).setValue(settings.resultsApi); // Column H = Results API / Squadi config
        }
        if (settings.archived !== undefined) {
          teamsSheet.getRange(row, 9).setValue(settings.archived ? 'true' : ''); // Column I = Archived
        }
        if (settings.coach !== undefined) {
          teamsSheet.getRange(row, 14).setValue(settings.coach || ''); // Column N = Coach
        }

        Logger.log("updateTeamSettings successful for row " + row);
        // Invalidate cached teams list to reflect changes immediately
        try {
          var cache = CacheService.getScriptCache();
          cache.remove('getTeamsResponse');
          Logger.log('updateTeamSettings: invalidated getTeams cache');
        } catch (e) {
          Logger.log('updateTeamSettings: failed to invalidate cache: ' + e.message);
        }
        return { success: true };
      }
    }
    throw new Error("Team not found: " + teamID);
  } catch (e) {
    Logger.log("Error in updateTeamSettings: " + e.message);
    return { error: e.message };
  }
}

/**
 * Return the raw Teams sheet row for a given teamID (columns A..I)
 */
function getTeamRowByID(teamID) {
  try {
    var ss = getSpreadsheet();
    var teamsSheet = ss.getSheetByName('Teams');
    var data = teamsSheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] == teamID) {
        var row = data[i];
        return {
          teamID: row[0],
          year: row[1],
          season: row[2],
          name: row[3],
          sheetName: row[4],
          ladderName: row[5],
          ladderApi: row[6],
          resultsApi: row[7],
          archived: row[8],
          playerCount: parseInt(row[9], 10) || 0
        };
      }
    }
    return { error: 'Team not found' };
  } catch (e) {
    return { error: e.message };
  }
}

/**
 * Append a client metric to a Diagnostics sheet for later inspection
 */
function logClientMetric(name, value, teams, extra) {
  try {
    var ss = getSpreadsheet();
    var sheetName = 'Diagnostics';
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      // Create sheet with headers
      sheet = ss.insertSheet(sheetName);
      sheet.appendRow(['timestamp', 'metric', 'value', 'teams', 'extra']);
    }
    var timestamp = new Date();
    sheet.appendRow([timestamp.toISOString(), name, String(value), String(teams), String(extra)]);
    return { success: true };
  } catch (e) {
    Logger.log('Error in logClientMetric: ' + e.message);
    return { error: e.message };
  }
}

/**
 * Return the most recent Diagnostics rows (newest first)
 */
function getDiagnostics(limit) {
  try {
    var ss = getSpreadsheet();
    var sheetName = 'Diagnostics';
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) return [];
    var data = sheet.getDataRange().getValues();
    if (data.length <= 1) return [];
    // Remove header, map to objects
    var rows = data.slice(1).map(function(r) {
      return { timestamp: r[0], metric: r[1], value: r[2], teams: r[3], extra: r[4] };
    });
    // Return newest 'limit' rows
    rows.reverse();
    return rows.slice(0, limit);
  } catch (e) {
    Logger.log('Error in getDiagnostics: ' + e.message);
    throw e;
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
    // Invalidate cached teams list
    try { CacheService.getScriptCache().remove('getTeamsResponse'); Logger.log('deleteTeam: invalidated getTeams cache'); } catch (e) { Logger.log('deleteTeam: failed to invalidate cache: ' + e.message); }
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

    // C1: separate AI summaries map { gameID: aiSummary } — avoids 50k char limit in A1
    var aiDataJSON = teamSheet.getRange('C1').getValue();
    var aiDataMerged = teamDataJSON;
    if (aiDataJSON) {
      try {
        var aiMap = JSON.parse(aiDataJSON);
        var parsed = JSON.parse(teamDataJSON || '{"players":[],"games":[]}');
        var games = parsed.games || [];
        for (var i = 0; i < games.length; i++) {
          var gid = games[i].id || games[i].gameID;
          if (gid && aiMap[gid]) {
            games[i].aiSummary = aiMap[gid];
          }
        }
        parsed.games = games;
        aiDataMerged = JSON.stringify(parsed);
      } catch (mergeErr) {
        Logger.log('loadTeamData: C1 merge error (non-fatal): ' + mergeErr.message);
      }
    }

    return {
      teamData: aiDataMerged || '{"players":[],"games":[]}',
      statsData: statsDataJSON || null
    };
  } catch (e) {
    Logger.log(e);
    return { error: e.message };
  }
}

function saveTeamData(sheetName, teamDataJSON, statsDataJSON, clientLastModified) {
  try {
    var ss = getSpreadsheet();
    var teamSheet = ss.getSheetByName(sheetName);
    if (!teamSheet) {
      throw new Error('Team data sheet not found: ' + sheetName);
    }

    // Check for stale data conflict if client provides its last known modification time
    if (clientLastModified) {
      var existingJSON = teamSheet.getRange('A1').getValue();
      if (existingJSON) {
        try {
          var existingData = JSON.parse(existingJSON);
          var serverLastModified = existingData._lastModified || 0;
          // If server data is newer than what client last saw, reject the save
          if (serverLastModified > clientLastModified) {
            return {
              success: false,
              error: 'STALE_DATA',
              message: 'Server has newer data. Please refresh before saving.',
              serverLastModified: serverLastModified
            };
          }
        } catch (e) {
          // If we can't parse existing data, allow the save
          Logger.log('Could not check stale data: ' + e.message);
        }
      }
    }

    // Ensure timestamp exists (client should set it, but add fallback)
    var teamData = JSON.parse(teamDataJSON || '{}');
    if (!teamData._lastModified) {
      teamData._lastModified = Date.now();
    }
    teamDataJSON = JSON.stringify(teamData);

    teamSheet.getRange('A1').setValue(teamDataJSON);
    if (statsDataJSON) {
      teamSheet.getRange('B1').setValue(statsDataJSON);
    }

    // Update player count and lastModified in Teams sheet for this team
    try {
      var teamData = JSON.parse(teamDataJSON || '{}');
      var pc = (teamData.players && Array.isArray(teamData.players)) ? teamData.players.length : 0;
      var lastMod = teamData._lastModified || Date.now();
      var ss = getSpreadsheet();
      var teamsSheet = ss.getSheetByName('Teams');
      var data = teamsSheet.getDataRange().getValues();
      for (var i = 1; i < data.length; i++) {
        if (data[i][4] == sheetName) { // Sheet Name column = index 4
          teamsSheet.getRange(i + 1, 10).setValue(pc); // Column J = Player Count
          teamsSheet.getRange(i + 1, 11).setValue(lastMod); // Column K = Last Modified
          Logger.log('Updated playerCount=' + pc + ', lastModified=' + lastMod + ' for ' + sheetName);
          break;
        }
      }
      // Invalidate cached teams list so next getTeams returns updated counts/timestamps
      try { CacheService.getScriptCache().remove('getTeamsResponse'); Logger.log('saveTeamData: invalidated getTeams cache'); } catch (e) { Logger.log('saveTeamData: failed to invalidate cache: ' + e.message); }
    } catch (e) {
      Logger.log('Failed to update playerCount/lastModified for ' + sheetName + ': ' + e.message);
    }

    return "OK";
  } catch (e) {
    Logger.log(e);
    return { error: e.message };
  }
}

/**
 * Loads the player library from the PlayerLibrary sheet.
 * Creates the sheet if it doesn't exist.
 * @returns {object} The player library data or error
 */
function loadPlayerLibrary() {
  try {
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName('PlayerLibrary');

    if (!sheet) {
      // Create the sheet with initial empty structure
      sheet = ss.insertSheet('PlayerLibrary');
      sheet.getRange('A1').setValue(JSON.stringify({ players: [] }));
      Logger.log("Created PlayerLibrary sheet with empty data");
      return { players: [] };
    }

    var dataJSON = sheet.getRange('A1').getValue();
    if (!dataJSON) {
      return { players: [] };
    }

    var data = JSON.parse(dataJSON);
    Logger.log("Loaded PlayerLibrary with " + (data.players ? data.players.length : 0) + " players");
    return data;
  } catch (e) {
    Logger.log("Error loading player library: " + e.message);
    return { error: e.message };
  }
}

/**
 * Saves the player library to the PlayerLibrary sheet.
 * Creates the sheet if it doesn't exist.
 * @param {string} playerLibraryJSON - JSON string of the player library
 * @returns {string|object} "OK" on success or error object
 */
function savePlayerLibrary(playerLibraryJSON) {
  try {
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName('PlayerLibrary');

    if (!sheet) {
      sheet = ss.insertSheet('PlayerLibrary');
      Logger.log("Created PlayerLibrary sheet");
    }

    sheet.getRange('A1').setValue(playerLibraryJSON);

    // Log the save for debugging
    var data = JSON.parse(playerLibraryJSON);
    Logger.log("Saved PlayerLibrary with " + (data.players ? data.players.length : 0) + " players");

    return "OK";
  } catch (e) {
    Logger.log("Error saving player library: " + e.message);
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

/**
 * Clean up test data from the spreadsheet
 * Called by test suites to remove TEST_* prefixed records
 *
 * Usage: Call this function after test runs to clean up test data
 * Example: cleanupTestData('TEST_CRUD_', 'Teams')
 *
 * @param {string} prefix - The prefix to search for (e.g., 'TEST_CRUD_', 'TEST_')
 * @param {string} sheetName - The sheet to clean up (e.g., 'Teams', 'Players', 'Games')
 * @returns {object} Cleanup result with count of deleted rows
 */
function cleanupTestData(prefix, sheetName) {
  _requireOwnerOrThrow();

  try {
    if (!prefix || !sheetName) {
      return { success: false, error: 'prefix and sheetName are required' };
    }

    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
      return { success: false, error: 'Sheet "' + sheetName + '" not found' };
    }

    var range = sheet.getDataRange();
    var values = range.getValues();
    var rowsToDelete = [];

    // Find all rows that match the prefix (check first column typically)
    for (var i = 1; i < values.length; i++) {
      var firstColValue = String(values[i][0]);
      if (firstColValue.indexOf(prefix) === 0) {
        rowsToDelete.push(i + 1); // Google Sheets is 1-indexed
      }
    }

    // Delete rows in reverse order to avoid index shifting
    for (var j = rowsToDelete.length - 1; j >= 0; j--) {
      sheet.deleteRow(rowsToDelete[j]);
    }

    var deletedCount = rowsToDelete.length;
    logEvent('CLEANUP', {
      action: 'delete_test_data',
      prefix: prefix,
      sheetName: sheetName,
      deletedCount: deletedCount
    });

    return {
      success: true,
      deletedCount: deletedCount,
      sheetName: sheetName,
      prefix: prefix
    };
  } catch (e) {
    logError('CLEANUP', e.message, {
      prefix: prefix,
      sheetName: sheetName
    });
    return { success: false, error: e.message };
  }
}

/**
 * Enhanced logging function for structured events
 * Provides consistent, searchable logging across the application
 *
 * @param {string} eventType - Type of event (e.g., 'DATA_OPERATION', 'ERROR', 'PERFORMANCE')
 * @param {object} data - Event data/details
 */
function logEvent(eventType, data) {
  try {
    var timestamp = new Date().toISOString();
    var userEmail = '';
    try {
      userEmail = Session.getActiveUser().getEmail();
    } catch(e) {
      userEmail = 'unknown';
    }

    var logEntry = {
      timestamp: timestamp,
      level: 'INFO',
      type: eventType,
      user: userEmail,
      data: data
    };

    // Log to console with structured format
    Logger.log('[' + eventType + '] ' + timestamp + ' | ' + JSON.stringify(data));

    // Optionally persist to Apps Script cache for recent activity tracking
    try {
      var cache = CacheService.getScriptCache();
      if (cache) {
        var recentLogs = cache.get('recent_logs');
        var logs = recentLogs ? JSON.parse(recentLogs) : [];
        logs.push(logEntry);

        // Keep only last 100 logs in cache (cache has size limits)
        if (logs.length > 100) {
          logs = logs.slice(-100);
        }

        cache.put('recent_logs', JSON.stringify(logs), 21600); // 6 hour expiry
      }
    } catch(cacheError) {
      // Cache not available in this context, continue with logging
    }
  } catch(e) {
    Logger.log('Logging error: ' + e.message);
  }
}

/**
 * Enhanced error logging function
 * Logs errors with full context for debugging
 *
 * @param {string} context - Context where error occurred
 * @param {string} message - Error message
 * @param {object} details - Additional error details
 */
function logError(context, message, details) {
  try {
    var timestamp = new Date().toISOString();
    var userEmail = '';
    try {
      userEmail = Session.getActiveUser().getEmail();
    } catch(e) {
      userEmail = 'unknown';
    }

    var errorLog = {
      timestamp: timestamp,
      level: 'ERROR',
      context: context,
      message: message,
      details: details || {},
      user: userEmail
    };

    // Log to console with error format
    Logger.log('ERROR [' + context + '] ' + timestamp + ': ' + message);
    if (details && Object.keys(details).length > 0) {
      Logger.log('  Details: ' + JSON.stringify(details));
    }

    // Store error in Apps Script cache for debugging
    try {
      var cache = CacheService.getScriptCache();
      if (cache) {
        var recentErrors = cache.get('recent_errors');
        var errors = recentErrors ? JSON.parse(recentErrors) : [];
        errors.push(errorLog);

        // Keep only last 50 errors
        if (errors.length > 50) {
          errors = errors.slice(-50);
        }

        cache.put('recent_errors', JSON.stringify(errors), 86400); // 24 hour expiry
      }
    } catch(cacheError) {
      // Cache not available
    }
  } catch(e) {
    Logger.log('Error logging failed: ' + e.message);
  }
}

/**
 * Get recent application logs for debugging
 * Owner-only function for monitoring application health
 *
 * @returns {object} Recent logs and errors
 */
function getApplicationLogs() {
  _requireOwnerOrThrow();

  try {
    var cache = CacheService.getScriptCache();
    var logs = [];
    var errors = [];

    try {
      var recentLogs = cache.get('recent_logs');
      logs = recentLogs ? JSON.parse(recentLogs) : [];
    } catch(e) {
      // Ignore parse errors
    }

    try {
      var recentErrors = cache.get('recent_errors');
      errors = recentErrors ? JSON.parse(recentErrors) : [];
    } catch(e) {
      // Ignore parse errors
    }

    return {
      success: true,
      timestamp: new Date().toISOString(),
      logs: logs,
      errors: errors,
      logCount: logs.length,
      errorCount: errors.length
    };
  } catch(e) {
    logError('GET_LOGS', e.message, {});
    return { success: false, error: e.message };
  }
}

/**
 * Clear application logs
 * Owner-only function to manage log storage
 *
 * @param {string} type - Type of logs to clear ('all', 'logs', 'errors')
 * @returns {object} Result of clear operation
 */
function clearApplicationLogs(type) {
  _requireOwnerOrThrow();

  try {
    type = type || 'all';
    var cache = CacheService.getScriptCache();

    if (type === 'all' || type === 'logs') {
      cache.remove('recent_logs');
      logEvent('LOGS_CLEARED', { type: 'logs' });
    }

    if (type === 'all' || type === 'errors') {
      cache.remove('recent_errors');
      logEvent('ERRORS_CLEARED', { type: 'errors' });
    }

    return {
      success: true,
      message: 'Cleared ' + type + ' logs',
      timestamp: new Date().toISOString()
    };
  } catch(e) {
    logError('CLEAR_LOGS', e.message, { type: type });
    return { success: false, error: e.message };
  }
}
