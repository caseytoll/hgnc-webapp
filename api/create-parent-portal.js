// Express-style handler for creating a parent portal via Cloudflare API
// Place in /api/create-parent-portal.js or your backend routes directory

const express = require('express');
const router = express.Router();
const { exec } = require('child_process');

// You may want to use the Cloudflare API directly, but this example uses wrangler CLI for simplicity
// Requires: CF_API_TOKEN in env, wrangler installed, and project template ready

router.post('/', async (req, res) => {
  const { teamName, teamID, season, year } = req.body;
  if (!teamName || !teamID || !season || !year) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Slugify team name for subdomain/project
  const slug = `${teamName.toLowerCase().replace(/\s+/g, '-')}-${year}-${season.toLowerCase().replace(/\s+/g, '-')}`;
  const projectName = `hgnc-gameday-${slug}`;

  // Build and deploy using wrangler CLI
  const buildCmd = 'npm run build --prefix viewer';
  const deployCmd = `npx wrangler pages deploy viewer/dist --project-name=${projectName} --branch=main --commit-dirty=true`;

  try {
    await execPromise(buildCmd);
    const { stdout, stderr } = await execPromise(deployCmd);
    if (stderr) console.error(stderr);
    const url = `https://${projectName}.pages.dev`;
    return res.json({ success: true, url });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to create parent portal', details: err.message });
  }
});

function execPromise(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, (error, stdout, stderr) => {
      if (error) return reject(error);
      resolve({ stdout, stderr });
    });
  });
}

module.exports = router;
