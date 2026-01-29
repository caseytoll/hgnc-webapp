/**
 * Script to analyze the Diagnostics sheet for getTeams_totalMs spikes and summarize slowest calls.
 * Usage: Run in Apps Script editor attached to your spreadsheet.
 * Output: Logs summary and optionally writes a summary sheet.
 */
function summarizeGetTeamsPerformance() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var diagSheet = ss.getSheetByName('Diagnostics');
  if (!diagSheet) {
    Logger.log('Diagnostics sheet not found.');
    return;
  }
  var data = diagSheet.getDataRange().getValues();
  if (data.length <= 1) {
    Logger.log('No diagnostics data.');
    return;
  }
  var rows = data.slice(1).filter(function(r) { return r[1] === 'getTeams_totalMs'; });
  if (rows.length === 0) {
    Logger.log('No getTeams_totalMs entries found.');
    return;
  }
  // Parse and sort by ms descending
  var parsed = rows.map(function(r) {
    return {
      timestamp: r[0],
      ms: parseInt(r[2], 10),
      teams: r[3],
      extra: r[4]
    };
  }).sort(function(a, b) { return b.ms - a.ms; });

  // Log top 10 slowest
  Logger.log('Top 10 slowest getTeams_totalMs:');
  parsed.slice(0, 10).forEach(function(row, i) {
    Logger.log((i+1) + '. ' + row.timestamp + ' | ' + row.ms + ' ms | teams: ' + row.teams + ' | extra: ' + row.extra);
  });

  // Calculate stats
  var avg = parsed.reduce(function(sum, r) { return sum + r.ms; }, 0) / parsed.length;
  var max = parsed[0].ms;
  var min = parsed[parsed.length-1].ms;
  Logger.log('Average: ' + avg.toFixed(1) + ' ms, Max: ' + max + ' ms, Min: ' + min + ' ms, Count: ' + parsed.length);

  // Optionally, write summary to a new sheet
  var summarySheet = ss.getSheetByName('DiagnosticsSummary') || ss.insertSheet('DiagnosticsSummary');
  summarySheet.clear();
  summarySheet.appendRow(['Timestamp', 'ms', 'teams', 'extra']);
  parsed.slice(0, 50).forEach(function(r) {
    summarySheet.appendRow([r.timestamp, r.ms, r.teams, r.extra]);
  });
  summarySheet.appendRow([]);
  summarySheet.appendRow(['Average', avg.toFixed(1)]);
  summarySheet.appendRow(['Max', max]);
  summarySheet.appendRow(['Min', min]);
  summarySheet.appendRow(['Count', parsed.length]);
}
