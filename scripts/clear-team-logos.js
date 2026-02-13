// Script to clear all team logo fields in teams-sample.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const teamsFile = path.join(__dirname, 'teams-sample.js');
const outputFile = path.join(__dirname, 'teams-sample.js');

// Dynamically import the teams data (object with a 'teams' array)
const { default: teamsDataRaw } = await import(teamsFile + '?t=' + Date.now());
let teamsData = teamsDataRaw;

// Remove the logo field from each team in the 'teams' array
const newTeams = teamsData.teams.map(team => {
  const { logo, ...rest } = team;
  return rest;
});

const newData = { ...teamsData, teams: newTeams };

// Write the updated teams data back to the file
const fileContent = 'export default ' + JSON.stringify(newData, null, 2) + ';\n';
fs.writeFileSync(outputFile, fileContent);

console.log('Cleared all team logos in', outputFile);
