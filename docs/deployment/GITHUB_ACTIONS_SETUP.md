# GitHub Actions Setup Guide

This guide walks you through setting up automated CI/CD for the HGNC WebApp.

---

## Prerequisites

- GitHub repository for the project
- Google Apps Script project with CLASP configured
- Admin access to GitHub repository (to add secrets)

---

## Step 1: Configure GitHub Secrets

GitHub Actions requires sensitive credentials stored as repository secrets.

### Required Secrets

#### 1. CLASP_CREDENTIALS

This is your CLASP authentication token.

**How to get it:**
```bash
# View your CLASP credentials
cat ~/.clasprc.json
```

**What it looks like:**
```json
{
  "token": {
    "access_token": "ya29.a0...",
    "refresh_token": "1//0g...",
    "scope": "https://www.googleapis.com/auth/...",
    "token_type": "Bearer",
    "expiry_date": 1234567890
  },
  "oauth2ClientSettings": {
    "clientId": "...",
    "clientSecret": "...",
    "redirectUri": "http://localhost"
  },
  "isLocalCreds": false
}
```

**How to add:**
1. Go to GitHub repo → Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Name: `CLASP_CREDENTIALS`
4. Value: Paste entire contents of `.clasprc.json`
5. Click "Add secret"

#### 2. DEPLOYMENT_ID (Optional but Recommended)

Your Google Apps Script deployment ID for the web app.

**How to get it:**
```bash
# List deployments
npx @google/clasp deployments

# Output shows deployment ID like:
# - AKfycbw8nTMiBtx... @832
```

**How to add:**
1. Same as above, click "New repository secret"
2. Name: `DEPLOYMENT_ID`
3. Value: `AKfycbw8nTMiBtx...` (your deployment ID)
4. Click "Add secret"

#### 3. CLASP_CONFIG (Optional)

Only needed if your `.clasp.json` is not in the repository or needs to be different for CI.

**How to get it:**
```bash
cat .clasp.json
```

**How to add:**
1. Same process as above
2. Name: `CLASP_CONFIG`
3. Value: Paste contents of `.clasp.json`
4. Click "Add secret"

---

## Step 2: Verify Workflows

The workflows are already in your repository:

```
.github/
  workflows/
    ci.yml        # Runs tests on every PR/push
    deploy.yml    # Deploys to Apps Script on merge to master
```

### CI Workflow (ci.yml)

**Triggers:**
- Every pull request to master/main
- Every push to master/main

**What it does:**
1. Checks out code
2. Sets up Node.js
3. Installs dependencies
4. Runs pre-deployment checks
5. Runs linting
6. Runs unit tests
7. Generates coverage report
8. Comments on PR with results

### Deploy Workflow (deploy.yml)

**Triggers:**
- Push to master/main branch
- Version tags (v*)
- Manual trigger via GitHub UI

**What it does:**
1. Checks out code
2. Sets up Node.js
3. Runs full validation
4. Authenticates with Google Apps Script
5. Deploys using `efficient-deploy.sh`
6. Creates deployment summary

---

## Step 3: Test the CI Workflow

### Option 1: Create a Test PR

```bash
# Create test branch
git checkout -b test-ci-setup

# Make a small change
echo "# Test" >> README.md

# Commit and push
git add README.md
git commit -m "test: verify CI workflow"
git push origin test-ci-setup

# Go to GitHub and create a PR
# Check the "Actions" tab to see workflow running
```

### Option 2: Push to Master

```bash
# On master branch
git add .
git commit -m "feat: add GitHub Actions CI/CD"
git push origin master

# Check GitHub Actions tab
```

---

## Step 4: Manual Deployment Trigger

You can manually trigger a deployment from GitHub:

1. Go to Actions tab
2. Click "Deploy to Google Apps Script" workflow
3. Click "Run workflow" button
4. Enter deployment description
5. Click green "Run workflow" button

---

## Troubleshooting

### Error: "CLASP_CREDENTIALS not found"

**Solution:** Verify the secret exists in GitHub Settings → Secrets

### Error: "Authentication failed"

**Solution:** 
1. Your CLASP credentials may have expired
2. Run `npx @google/clasp login` locally
3. Update the `CLASP_CREDENTIALS` secret with new token

### Error: "scriptId not found"

**Solution:**
1. Ensure `.clasp.json` is in your repository
2. Or add `CLASP_CONFIG` secret with correct scriptId

### Error: "Deployment failed"

**Solution:**
1. Check the workflow logs in Actions tab
2. Verify `DEPLOYMENT_ID` secret is correct
3. Ensure your Apps Script project exists and is accessible

### Workflow Not Running

**Solution:**
1. Check if workflows are enabled: Settings → Actions → General
2. Verify workflow files are in `.github/workflows/`
3. Check branch protection rules aren't blocking

---

## Best Practices

### 1. Branch Protection

Enable branch protection for master/main:

1. Settings → Branches → Add rule
2. Branch name pattern: `master` or `main`
3. Enable:
   - ✅ Require status checks to pass
   - ✅ Require branches to be up to date
   - ✅ Include administrators
4. Select status checks: `test`, `validate-version`

### 2. Deployment Strategy

**Recommended:**
- Develop in feature branches
- CI runs tests on PR
- Merge to master only after tests pass
- Auto-deploy on merge to master

**Alternative (Safer):**
- Same as above, but manual deployment trigger
- Review deployment logs before triggering
- Use version tags for releases

### 3. Version Management

Before merging to master:
1. Update `VERSION.txt`
2. Update `Code.js` appVersion
3. Update `CHANGELOG.md`
4. CI will validate these match

### 4. Monitoring

**Set up notifications:**
1. Settings → Notifications
2. Enable email notifications for workflow failures
3. Consider Slack integration for team notifications

---

## What Happens Next

After setup:

1. **Every PR:** CI runs tests automatically, comments with results
2. **Every merge:** Auto-deployment to Apps Script (if configured)
3. **Every failure:** Email notification to admins
4. **Coverage tracking:** Reports stored as artifacts

---

## Rolling Back

If a deployment fails:

```bash
# Option 1: Revert commit
git revert HEAD
git push origin master

# Option 2: Manual rollback
npx @google/clasp deploy --versionNumber <previous-version> \
  --deploymentId <your-deployment-id>
```

---

## Advanced Configuration

### Custom Test Commands

Edit `.github/workflows/ci.yml`:

```yaml
- name: Run unit tests
  run: npm run test:unit || echo "Tests optional for now"
  continue-on-error: true  # Remove when tests are mandatory
```

### Deploy to Multiple Environments

Create separate workflows for staging and production:

```yaml
# .github/workflows/deploy-staging.yml
on:
  push:
    branches: [develop]

env:
  DEPLOYMENT_ID: ${{ secrets.STAGING_DEPLOYMENT_ID }}
```

### Conditional Deployment

Only deploy on version tags:

```yaml
on:
  push:
    tags:
      - 'v*'  # Only deploy when pushing version tags
```

---

## Security Notes

- ⚠️ Never commit `.clasprc.json` to git (it's in `.gitignore`)
- ⚠️ Secrets are encrypted and not visible in logs
- ⚠️ Use deployment keys instead of personal access tokens when possible
- ✅ Regularly rotate CLASP credentials (every 90 days)
- ✅ Use least-privilege access for service accounts

---

## Support

If you encounter issues:

1. Check workflow logs in GitHub Actions tab
2. Review this guide
3. Check CLASP documentation: https://github.com/google/clasp
4. Open an issue in the repository

---

## Summary Checklist

- [ ] Add `CLASP_CREDENTIALS` secret
- [ ] Add `DEPLOYMENT_ID` secret  
- [ ] Test CI workflow with a PR
- [ ] Verify deployment workflow runs
- [ ] Enable branch protection
- [ ] Set up failure notifications
- [ ] Document team deployment process

Once complete, you have fully automated CI/CD! 🎉
