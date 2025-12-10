# Deployment Checklist

**Purpose:** Prevent deployment failures, deployment URL confusion, and ensure users see changes.

**Created:** December 10, 2025 (After v1011-v1024 deployment issues)

**Related Documents:**
- **[DEPLOYMENT_URLS.md](./DEPLOYMENT_URLS.md)** - Registry of all deployment URLs with status
- **[DEPLOYMENT_URL_MANAGEMENT.md](./DEPLOYMENT_URL_MANAGEMENT.md)** - Concepts and decision trees for URL management
- **[DEPLOYMENT_URL_DELETION_INCIDENT_2025_12_11.md](./DEPLOYMENT_URL_DELETION_INCIDENT_2025_12_11.md)** - Critical incident analysis and prevention

---

## Pre-Deployment (BEFORE any code changes)

**Official reference:** Apps Script deployments overview: https://developers.google.com/apps-script/concepts/deployments

### Step 1: Verify Deployment URL

**FIRST QUESTION:**
```
"What URL are you using to access the app?"
```

**Expected answers:**
- ✅ `https://script.google.com/macros/s/AKfycbw8nTMiBtx3SMw.../exec` (Stable production)
- ⚠️ `https://script.google.com/macros/s/AKfycbyzIhkw.../exec` (@HEAD, auto-updates)
- ❌ `https://script.google.com/macros/s/<different-hash>/exec` (Numbered deployment)

**If user provides stable production URL:**
```bash
# Set this as your deployment command for the entire session:
export DEPLOY_CMD="clasp deploy -i AKfycbw8nTMiBtx3SMw-s9cV3UhbTMqOwBH2aHEj1tswEQ2gb1uyiE9e2Ci4eHPqcpJ_gwo0ug -d"
```

### Step 2: Verify User is on Latest Version

**Request:**
```
"Please open the app and check the console. What version number do you see?"
```

**Look for:**
```
🔑 App Version: v1024 - Description | User is owner: true
```

**If version doesn't match latest deployment:**
```
"Please hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)"
```

### Step 3: Reproduce the Issue

**Before writing ANY code:**
- [ ] Confirm you can see the issue in the current version
- [ ] Check if issue exists in console logs
- [ ] Verify user is describing actual behavior, not cached version

---

## During Development

### Step 1: Make Code Changes

- [ ] Update version number in relevant files
- [ ] Add console logging for verification if needed
- [ ] Test in browser DevTools first (if possible)

### Step 2: Update Documentation

**For every code change:**
- [ ] Update `CHANGELOG.md` with what changed
- [ ] Update version in `Code.js` if changing server-side code
- [ ] Update version in `js-startup.html` if changing client-side code

### Step 3: Check for CSS Conflicts (if CSS changes)

**Before deploying CSS with `!important`:**
```bash
# Search for conflicting rules
grep -n "\.view.*!important" src/styles.html
grep -n "\.hidden.*!important" src/styles.html
grep -n "display.*!important" src/styles.html
```

- [ ] No conflicting `!important` rules on same property
- [ ] Higher specificity used instead of `!important` where possible
- [ ] Tested ALL elements affected by changed class

---

## Deployment

### Step 1: Git Commit

```bash
git add -A
git commit -m "v{VERSION} - {DESCRIPTION}

{DETAILED_CHANGES}
{WHY_THIS_FIX_WORKS}"
```

**Good commit message example:**
```
v1024 - Fix .view.hidden CSS specificity issue

- .view class had display: block forcing all views visible
- Added .view.hidden with display: none for higher specificity
- Hidden views were rendering with display: block, taking 13707px vertical space
- This was causing content to be pushed 12000+ pixels down
```

### Step 2: Push to Apps Script

```bash
clasp push
```

**Expected output:**
```
Pushed 23 files.
└─ appsscript.json
└─ Code.js
└─ index.html
... (all files listed)
```

**If errors:** Fix errors before deploying.

### Step 3: Deploy to Production

**Use the stable deployment URL:**
```bash
clasp deploy -i AKfycbw8nTMiBtx3SMw-s9cV3UhbTMqOwBH2aHEj1tswEQ2gb1uyiE9e2Ci4eHPqcpJ_gwo0ug -d "v{VERSION} - {DESCRIPTION}"
```

**Expected output:**
```
Deployed AKfycbw8nTMiBtx3SMw-s9cV3UhbTMqOwBH2aHEj1tswEQ2gb1uyiE9e2Ci4eHPqcpJ_gwo0ug @{NUMBER}
```

**Capture the @{NUMBER} for your records.**

---

## Post-Deployment Verification

### Step 1: Instruct User to Hard Refresh

**ALWAYS say:**
```
"Deployed as @{NUMBER}. Please hard refresh (Cmd+Shift+R) and check the console for the version number."
```

**Never assume user will refresh automatically.**

### Step 2: Verify Version Number

**User should report:**
```
🔑 App Version: v{YOUR_VERSION} - {YOUR_DESCRIPTION} | User is owner: true
```

**If version doesn't match:**
- User didn't refresh → ask again with emphasis
- Browser cache stuck → try incognito mode
- Deployed to wrong URL → check deployment command

### Step 3: Verify Fix

**Request specific evidence:**
```
"Can you check if {SPECIFIC_ISSUE} is now fixed?"
"What do you see in the console?"
"Can you provide a screenshot?"
```

**Don't accept:** "Looks good" without verification.

### Step 4: Smoke Test Other Features

**If CSS changes affected shared classes (e.g., `.view`, `.hidden`):**

```
"Please check that the following views still work correctly:
- Schedule (fixture-view)
- Players (players-view)
- Stats (insights-view)
- Ladder (netball-ladder-view)"
```

**Test matrix:**
- [ ] All views show when clicked
- [ ] All views hide when other view is shown
- [ ] No excessive scrolling required
- [ ] No layout shifts or broken layouts

---

## Rollback Procedure (If deployment breaks something)

### Immediate Actions

1. **Identify last working version:**
   ```bash
   git log --oneline -10
   ```

2. **Revert to previous commit:**
   ```bash
   git revert HEAD --no-edit
   ```

3. **Deploy reverted version:**
   ```bash
   clasp push
   clasp deploy -i AKfycbw8nTMiBtx3SMw-s9cV3UhbTMqOwBH2aHEj1tswEQ2gb1uyiE9e2Ci4eHPqcpJ_gwo0ug -d "Revert v{BROKEN} - Rolled back to v{WORKING}"
   ```

4. **Instruct user to hard refresh**

5. **Fix the issue properly in a new commit**

---

## Common Mistakes to Avoid

### ❌ Deploying Without Verifying URL
**Result:** 6 orphan deployments user never sees

**Prevention:** Ask "What URL are you using?" FIRST

### ❌ Not Instructing Hard Refresh
**Result:** User sees cached version, reports "fix doesn't work"

**Prevention:** ALWAYS say "Please hard refresh (Cmd+Shift+R)"

### ❌ Forgetting -i Flag
**Result:** Creates numbered deployment instead of updating stable URL

**Prevention:** Use environment variable or alias for deployment command

### ❌ Testing Only One View After CSS Change
**Result:** Fix one view, break 10 others

**Prevention:** Test ALL views affected by changed classes

### ❌ Assuming Class = Behavior
**Result:** Element has `.hidden` class but displays visibly due to CSS specificity

**Prevention:** Always check computed styles in diagnostics

---

## Deployment Command Reference

### Stable Production (99% of deployments)
```bash
clasp deploy -i AKfycbw8nTMiBtx3SMw-s9cV3UhbTMqOwBH2aHEj1tswEQ2gb1uyiE9e2Ci4eHPqcpJ_gwo0ug -d "v{VERSION} - {DESCRIPTION}"
```

### Development (@HEAD, auto-updates)
```bash
clasp push  # Auto-deploys to @HEAD
# URL: AKfycbyzIhkw5F5HJm7x1W3rGSdQHZefDvB2-U9M04RzvuRh
```

### Create New Test Deployment (rarely needed)
```bash
clasp deploy -d "Test deployment - {PURPOSE}"
# Creates new numbered deployment with new URL
# Use only for A/B testing or staging
```

---

## ⚠️ DANGER ZONE: Critical Commands

### DO NOT USE `clasp undeploy` on Production URLs

**Command:**
```bash
clasp undeploy <deployment-id>  # ⚠️ CATASTROPHIC - IRREVERSIBLE
```

**Why this is dangerous:**
- Deletes the deployment URL PERMANENTLY
- Cannot be recovered or restored
- Users accessing the URL will get 404 errors
- Requires migration to new URL

**When it happened to us:**
- Date: December 11, 2025
- Command: `clasp undeploy AKfycbw8nTMiBtx3SMw-s9cV3UhbTMqOwBH2aHEj1tswEQ2gb1uyiE9e2Ci4eHPqcpJ_gwo0ug`
- Result: Production URL permanently deleted
- Impact: Users lost access to known good URL
- Recovery: Migrated to new URL (different ID)

**What to do if hitting version limit (200):**

❌ **WRONG:**
```bash
clasp undeploy <url>  # Doesn't free versions anyway
```

✅ **RIGHT - Option A (Use @HEAD):**
```bash
# Deploy to @HEAD URL - no version created
clasp push
# Users access: AKfycbyzIhkw5F5HJm7x1W3rGSdQHZefDvB2-U9M04RzvuRh
```

✅ **RIGHT - Option B (Clean up versions through web interface):**
1. Go to: https://script.google.com/home
2. Select your project
3. Project Settings → Versions
4. Delete old versions (v1-v100)
5. Try deployment again

✅ **RIGHT - Option C (Request user approval for migration):**
```bash
# If truly necessary: migrate users to new URL first
# Wait 2 weeks for migration
# Then delete old deployment with explicit approval
```

**Golden Rule:**
Never delete a deployment URL without:
1. Explicit user approval
2. Documentation in DEPLOYMENT_URLS.md
3. Waiting 2+ weeks for user migration
4. Having alternative deployment URLs available

**Reference:** See `docs/DEPLOYMENT_URL_DELETION_INCIDENT_2025_12_11.md` for full incident details

---

## Success Metrics

**Good deployment (target for every deployment):**
- ✅ Confirmed deployment URL before starting
- ✅ User hard refreshed and confirmed version
- ✅ Issue verified as fixed with evidence
- ✅ No other features broken (smoke tested)
- ✅ Did not delete any production URLs
- ✅ 1-3 deployments max for the fix

**Bad deployment (what to avoid):**
- ❌ Multiple deployments with "fix doesn't work" feedback
- ❌ User never saw changes (wrong URL or no refresh)
- ❌ Fixed one thing, broke multiple others
- ❌ 10+ deployments for simple issue

**Today's score: 16 deployments for CSS specificity issue (should have been 2-3)**

---

## Related Documentation

- [`POST_MORTEM_CSS_SPECIFICITY_2025_12_10.md`](./POST_MORTEM_CSS_SPECIFICITY_2025_12_10.md) - Today's lessons
- [`DEVELOPMENT-PRINCIPLES.md`](./getting-started/DEVELOPMENT-PRINCIPLES.md) - General principles
- [`CSS_BEST_PRACTICES.md`](./standards/CSS_BEST_PRACTICES.md) - CSS specificity rules
- [`DEBUGGING_STRATEGY.md`](./operations/DEBUGGING_STRATEGY.md) - Diagnostic patterns
- [`LESSONS_LEARNED.md`](./LESSONS_LEARNED.md) - Historical learnings
