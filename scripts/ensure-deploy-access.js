#!/usr/bin/env node
// Ensure the Apps Script deployment access is set to ANYONE_ANONYMOUS using a service account
// Usage: SERVICE_ACCOUNT_JSON env (JSON) SCRIPT_ID DEPLOYMENT_ID node scripts/ensure-deploy-access.js

const fs = require('fs');
const {google} = require('googleapis');
const axios = require('axios');

async function main() {
  try {
    const serviceAccountJson = process.env.GCP_SA_KEY;
    const oauthToken = process.env.GCP_OIDC_TOKEN || process.env.GCP_OAUTH_TOKEN || process.env.GCP_OAUTH;
    const scriptId = process.env.SCRIPT_ID || (process.env.CLASP_SCRIPT_ID || null);
    const deploymentId = process.env.DEPLOYMENT_ID;

    if (!serviceAccountJson && !oauthToken) {
      console.error('Either GCP_SA_KEY (service account JSON) or GCP_OIDC_TOKEN / GCP_OAUTH_TOKEN must be provided');
      process.exit(1);
    }
    if (!scriptId) {
      console.error('SCRIPT_ID or CLASP_SCRIPT_ID env required');
      process.exit(1);
    }
    if (!deploymentId) {
      console.error('DEPLOYMENT_ID env required');
      process.exit(1);
    }

    let accessToken = oauthToken;
    if (!accessToken && serviceAccountJson) {
      const key = JSON.parse(serviceAccountJson);
      const client = new google.auth.JWT({
        email: key.client_email,
        key: key.private_key,
        scopes: [
          'https://www.googleapis.com/auth/script.deployments',
          'https://www.googleapis.com/auth/script.projects'
        ]
      });
      await client.authorize();
      accessToken = (await client.getAccessToken()).token;
    }
    if (!accessToken) throw new Error('Failed to obtain access token');

    const scriptApiBase = 'https://script.googleapis.com/v1';

    // Fetch existing deployment
    const getUrl = `${scriptApiBase}/projects/${scriptId}/deployments/${deploymentId}`;
    const getRes = await axios.get(getUrl, { headers: { Authorization: `Bearer ${accessToken}` }});
    const deployment = getRes.data;

    // Find web app entrypoint
    const entryPoints = deployment.deploymentConfig && deployment.deploymentConfig.entryPoints || [];
    const webEntryIndex = entryPoints.findIndex(ep => ep.entryPointType === 'WEB_APP');
    if (webEntryIndex < 0) {
      console.error('No WEB_APP entryPoint found for deployment');
      process.exit(1);
    }

    const webEntry = entryPoints[webEntryIndex];
    const currentAccess = webEntry.webApp && webEntry.webApp.access;
    if (currentAccess === 'ANYONE_ANONYMOUS') {
      console.log('Deployment already set to ANYONE_ANONYMOUS');
      process.exit(0);
    }

    // modify entryPoints array: set webApp.access
    entryPoints[webEntryIndex] = {
      ...webEntry,
      webApp: {
        ...(webEntry.webApp || {}),
        access: 'ANYONE_ANONYMOUS'
      }
    };

    const patchBody = {
      deploymentConfig: {
        entryPoints
      }
    };

    const patchUrl = `${scriptApiBase}/projects/${scriptId}/deployments/${deploymentId}`;
    // Use patch
    const patchRes = await axios.patch(patchUrl, patchBody, { headers: { Authorization: `Bearer ${accessToken}` } });
    const patched = patchRes.data;
    const patchedEntry = patched.deploymentConfig && patched.deploymentConfig.entryPoints && patched.deploymentConfig.entryPoints.find(ep => ep.entryPointType === 'WEB_APP');
    if (patchedEntry && patchedEntry.webApp && patchedEntry.webApp.access === 'ANYONE_ANONYMOUS') {
      console.log('Successfully set deployment access to ANYONE_ANONYMOUS');
      process.exit(0);
    }

    console.error('Failed to set deployment access to ANYONE_ANONYMOUS; response:', patched);
    process.exit(1);

  } catch (err) {
    console.error('Error ensuring deploy access:', err.message || err);
    process.exit(1);
  }
}

if (require.main === module) main();
