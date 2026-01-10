# 🚀 GitHub Actions Activation Guide

**⏱️ Time needed:** 5 minutes  
**Status:** Ready to activate

---

## Step 1: Gather Your Credentials (2 minutes)

### Get CLASP_CREDENTIALS

```bash
# Run this in your terminal:
cat ~/.clasprc.json
```

**Copy the entire output** - this is your `CLASP_CREDENTIALS` secret value.

### Get DEPLOYMENT_ID

```bash
# Run this:
npx @google/clasp deployments
```

**Find the web app deployment** - looks like:
```
- AKfycbw8nTMiBtx3SMw-s9cV3UhbTMqOwBH2aHEj1tswEQ2gb1uyiE9e2Ci4eHPqcpJ_gwo0ug @833.
```

Copy the ID: `AKfycbw8nTMiBtx3SMw-s9cV3UhbTMqOwBH2aHEj1tswEQ2gb1uyiE9e2Ci4eHPqcpJ_gwo0ug`

---

## Step 2: Add Secrets to GitHub (2 minutes)

1. **Go to your GitHub repository**
   - URL: https://github.com/caseytoll/hgnc-webapp

2. **Settings → Secrets and variables → Actions**

3. **Add Repository Secret #1: CLASP_CREDENTIALS**
   - Click "New repository secret"
   - Name: `CLASP_CREDENTIALS`
   - Value: Paste contents from `.clasprc.json`
   - Click "Add secret"

4. **Add Repository Secret #2: DEPLOYMENT_ID**
   - Click "New repository secret"
   - Name: `DEPLOYMENT_ID`
   - Value: Paste the deployment ID
   - Click "Add secret"

5. **Verify both secrets are listed:**
   - ✅ CLASP_CREDENTIALS
   - ✅ DEPLOYMENT_ID

---

## Step 3: Verify Workflows (1 minute)

**Workflows are already in your repo:**

- `.github/workflows/ci.yml` - Runs tests on every PR/push
- `.github/workflows/deploy.yml` - Deploys on merge to master

Check that they exist by going to GitHub → Actions tab.

---

## What Happens Next

✅ **Every PR you create:**
- Automatically runs unit tests
- Runs pre-deployment checks
- Comments with results

✅ **Every push to master:**
- Runs full validation suite
- Auto-deploys to Apps Script
- Creates deployment summary

---

## Quick Test (Optional)

To verify it's working:

```bash
# Create a test branch
git checkout -b test-actions

# Make a tiny change
echo "# Test" >> README.md

# Commit and push
git add README.md
git commit -m "test: verify GitHub Actions"
git push origin test-actions

# Go to GitHub and create a PR
# Watch the Actions tab - you'll see tests running!
```

---

## Done! ✅

GitHub Actions is now activated. Your project has:
- ✅ Automated testing on every PR
- ✅ Automated deployment on merge
- ✅ Test result comments on PRs
- ✅ Deployment summaries

**No additional setup needed!**
