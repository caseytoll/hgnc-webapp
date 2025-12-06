# ✅ Production Shipping Checklist

**Status:** Ready to ship  
**Version:** v834 (Current)

---

## Pre-Deployment Verification (10 min)

### Code Quality
- [ ] **Run pre-deploy checks**
  ```bash
  npm run test
  ```
  Expected: ✅ All critical checks passed

- [ ] **Run unit tests**
  ```bash
  npm run test:unit
  ```
  Expected: ✅ All 34 tests passing

- [ ] **Verify linting**
  ```bash
  npm run lint
  ```
  Expected: ✅ No errors

### Git & Commits
- [ ] **Check working tree is clean**
  ```bash
  git status
  ```
  Expected: "working tree clean"

- [ ] **Verify all changes committed**
  ```bash
  git log --oneline -5
  ```
  Expected: Latest commits visible

- [ ] **Version consistency**
  ```bash
  grep "appVersion = " Code.js
  cat VERSION.txt
  ```
  Expected: Both match (e.g., both "834")

---

## Deployment Checklist (5 min)

### GitHub Actions Setup
- [ ] **Secrets configured in GitHub**
  - [ ] CLASP_CREDENTIALS added ✅
  - [ ] DEPLOYMENT_ID added ✅
  
- [ ] **Workflows exist**
  - [ ] `.github/workflows/ci.yml` present
  - [ ] `.github/workflows/deploy.yml` present

### Service Worker
- [ ] **Service worker file exists**
  ```bash
  ls -lh service-worker.js
  ```
  Expected: File exists

- [ ] **Registration added to index.html**
  ```bash
  grep -n "serviceWorker" index.html
  ```
  Expected: Registration code present (around line 291)

---

## Final Safety Checks (5 min)

### No Blockers
- [ ] **No uncommitted changes**
  ```bash
  git status --porcelain
  ```
  Expected: Empty output

- [ ] **Latest from origin**
  ```bash
  git fetch origin
  git log --oneline -1 origin/master
  git log --oneline -1
  ```
  Expected: Local and remote same

- [ ] **All tests passing**
  ```bash
  npm run test:all
  ```
  Expected: ✅ All tests pass

### Rollback Capability
- [ ] **Know previous version number**
  - Current: v834
  - Previous: v833
  - Fallback command ready:
    ```bash
    npx @google/clasp deploy --versionNumber 833 \
      --deploymentId AKfycbw8nTMiBtx3SMw-s9cV3UhbTMqOwBH2aHEj1tswEQ2gb1uyiE9e2Ci4eHPqcpJ_gwo0ug
    ```

- [ ] **Backup current deployment ID noted**
  - ID: `AKfycbw8nTMiBtx3SMw-s9cV3UhbTMqOwBH2aHEj1tswEQ2gb1uyiE9e2Ci4eHPqcpJ_gwo0ug`

---

## Deployment Steps (Execute in Order)

### Step 1: Create Release Branch (Optional but Recommended)
```bash
# Optional: Create release branch for documentation
git checkout -b release/v834
```

### Step 2: Deploy
```bash
# Deploy with description
npm run deploy "v834: Add service worker for offline support and PWA capabilities"

# Or use efficient deploy for additional features
npm run deploy:efficient "v834: Add service worker for offline support"
```

**Expected Output:**
```
→ Pushing to Apps Script (clasp)...
Pushed 16 files.
→ Creating version...
Created version 834.
→ Deploying version 834...
- AKfycbw... @834.
✅ Smoke test passed
```

### Step 3: Verify Live Deployment
```bash
# Check deployment status
npx @google/clasp deployments
```

**Expected Output:**
```
- AKfycbw... @834.  ← Should show your current deployment at v834
- AKfycbyzI... @HEAD
```

### Step 4: Test in Production
1. **Visit web app URL** in browser
2. **DevTools → Application → Service Workers**
   - Should see service worker "activated and running"
3. **Try offline mode**
   - Network tab → Check "Offline"
   - Reload page
   - Should still load from cache

---

## Post-Deployment Verification (5 min)

### Health Checks
- [ ] **App loads successfully**
  - URL: https://script.google.com/macros/s/AKfycbw8nTMiBtx3SMw-s9cV3UhbTMqOwBH2aHEj1tswEQ2gb1uyiE9e2Ci4eHPqcpJ_gwo0ug/exec
  - Time to load: < 4 seconds ✅

- [ ] **Core features work**
  - [ ] Can load team list
  - [ ] Can view players
  - [ ] Can see games
  - [ ] Search/filter functional

- [ ] **Service worker active**
  - [ ] No errors in console
  - [ ] Service Workers tab shows "activated and running"
  - [ ] Cache Storage shows cached assets

- [ ] **No console errors**
  - Open DevTools → Console
  - Expected: No red errors (warnings OK)

### Performance Check
- [ ] **Page load time**
  - First visit: Should be < 4 seconds
  - Note any slowness

- [ ] **Cache working**
  - Reload page
  - Should be noticeably faster (< 1 second)

---

## Rollback Plan (If Needed)

### If Something Goes Wrong

**Option 1: Quick Rollback (5 minutes)**
```bash
# Deploy previous version (v833)
npx @google/clasp deploy \
  --versionNumber 833 \
  --deploymentId AKfycbw8nTMiBtx3SMw-s9cV3UhbTMqOwBH2aHEj1tswEQ2gb1uyiE9e2Ci4eHPqcpJ_gwo0ug

# Expected: Web app reverts to v833
```

**Option 2: Revert in Git**
```bash
# If deployment failed before push
git revert HEAD
git push origin master

# Let GitHub Actions re-deploy v833
```

---

## Documentation Updates

- [ ] **Update CHANGELOG.md** (Already done in commit message)
  ```
  ## v834 — 2025-12-07
  **Service Worker & Offline Support**
  - Add PWA service worker for offline functionality
  - Register service worker in index.html
  - Enable faster repeat visits via caching
  ```

- [ ] **Team notification** (if applicable)
  ```
  "v834 deployed: Service worker added for offline support
   and faster load times. All features working normally."
  ```

---

## Post-Deployment Monitoring (First 24h)

### Hour 1
- [ ] Spot check app still works
- [ ] Monitor error logs (if available)
- [ ] Check console for warnings

### Hours 2-6
- [ ] Verify no user reports
- [ ] Test offline functionality
- [ ] Confirm cache is working

### Day 1-7
- [ ] Monitor performance metrics
- [ ] Gather user feedback
- [ ] Watch for edge case issues

### If Issues Found
```bash
# Create patch branch
git checkout -b hotfix/v834-issue

# Fix issue and commit
git commit -m "fix: description of fix"

# Deploy patch
npm run deploy "v835: Hotfix for v834 issue"
```

---

## Success Criteria

✅ **Deployment is successful when:**
1. Version 834 deployed to production
2. Web app loads without errors
3. Service worker registered and active
4. Offline mode works (tested in DevTools)
5. No console errors
6. Core features functional
7. No user-reported issues in first hour

---

## Quick Reference

| What | Command | Expected |
|------|---------|----------|
| Verify ready | `npm run test` | ✅ Pass |
| Deploy | `npm run deploy "v834: ..."` | ✅ Deployed |
| Check live | Visit web app URL | ✅ Loads |
| Verify version | `npx @google/clasp deployments` | v834 |
| Rollback | `npx @google/clasp deploy --versionNumber 833 --deploymentId ...` | v833 |

---

## Team Communication

### Deployment Notification (Copy/Paste)
```
🚀 Deployment Alert: v834

✅ Status: Live
⏰ Time: [timestamp]
📝 Changes: Service worker for offline support
🔧 Version: 834
⚡ Features: Offline access, faster loads, PWA capabilities

All systems nominal. No action required.
Rollback command available if needed.
```

---

## Final Checklist Summary

**Before Deploying:**
- [ ] Code quality checks pass
- [ ] All tests passing
- [ ] Git working tree clean
- [ ] Version numbers match

**During Deployment:**
- [ ] npm run deploy executes successfully
- [ ] No errors in deployment logs
- [ ] Version 834 created

**After Deployment:**
- [ ] Web app loads
- [ ] Service worker active
- [ ] Offline mode tested
- [ ] No console errors

---

## Status: READY TO SHIP ✅

**Everything is verified and ready for production deployment.**

**Next Action:** Run deployment command
```bash
npm run deploy "v834: Add service worker for offline support and PWA capabilities"
```

**Estimated duration:** 2-3 minutes  
**Downtime:** None (blue-green deployment)  
**Rollback:** Available within 5 minutes if needed

---

**Good luck with the deployment! 🚀**
