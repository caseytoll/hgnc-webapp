# Deployment Workflow & Checklist (v2.0)

**Last Updated**: December 7, 2025  
**Previous Version**: CI_DEPLOY.md, READY_TO_DEPLOY.md  
**Improvement Rationale**: Incorporates learnings from v852-v870 deployment cycle

---

## Overview

This document combines:
1. **Deployment validation** (from existing docs)
2. **Cache invalidation strategy** (new learning)
3. **Mobile testing requirements** (new learning)
4. **Root cause analysis discipline** (new learning)

---

## Pre-Deployment: The 15-Minute Validation

### Step 1: Understand What You're Deploying (2 min)

**Ask yourself**:
- [ ] What exactly changed? (CSS? JS? HTML? All three?)
- [ ] Will this change affect critical functionality? (Loading, visibility, navigation)
- [ ] What could go wrong? (Think about failure modes)
- [ ] Do I need to bump appVersion or embed CSS?

**Document it**:
```bash
# Example good commit message (answers above questions):
"Fix: Loading overlay centering and smoke effect - embed critical CSS, bump v856"

# Example bad commit message (doesn't explain why):
"Fix: Loading overlay"
```

### Step 2: Test in Browser DevTools (5 min)

**Before deploying ANY change**:
1. Open DevTools (F12)
2. Clear cache (Cmd+Shift+R or Ctrl+Shift+R)
3. Open Console tab (look for any errors)
4. Test the actual change you made
   - If CSS: Inspect element, verify computed styles
   - If JS: Call function in console with test data
   - If HTML: Navigate to that view, verify it renders
5. Check mobile emulation (Ctrl+Shift+M, 375px width)

**Example DevTools Testing**:
```javascript
// Testing nickname mapping (v863-v867)
getDisplayName("Montmorency 11 White")
// Expected output: "Monty 11 White"

// Testing game rendering (v869-v870)
renderGameRow({ id: '1', status: 'normal', opponent: 'Monty 11 White' })
// Check HTML output in console, verify structure correct
```

### Step 3: Test on Mobile Device (5 min)

**Required for CSS/layout changes**:
1. Deploy version to server
2. Hard refresh on physical mobile device
3. Take screenshot
4. Compare with previous version
5. Score if it's a UI change (use scoring framework from MOBILE_FIRST_DEVELOPMENT.md)

**Not Required For**:
- Pure JavaScript logic changes
- Data formatting changes
- Backend functionality (only if it affects UI)

### Step 4: Verify Deployment Configuration (3 min)

- [ ] Using correct deployment ID? (See DEVELOPMENT-PRINCIPLES.md for production ID)
- [ ] Using `-i` flag? (NO: `clasp deploy`, YES: `clasp deploy -i ID`)
- [ ] Has appVersion been bumped? (Checked in Code.js if relevant)
- [ ] Commit message is clear? (Explains what changed and why)
- [ ] CHANGELOG.md updated? (Describes change for users)

---

## Deployment Command

### Standard Deployment (Most Common)

```bash
# Step 1: Verify changes are committed and staged
git status
git add -A
git commit -m "Fix/Feature: Description of change - v###"

# Step 2: Push to GitHub Apps Script
clasp push --force

# Step 3: Deploy to production URL
clasp deploy -i AKfycbw8nTMiBtx3SMw-s9cV3UhbTMqOwBH2aHEj1tswEQ2gb1uyiE9e2Ci4eHPqcpJ_gwo0ug \
  -d "vXXX - Description"

# Example from session (v870):
clasp deploy -i AKfycbw8nTMiBtx3SMw-s9cV3UhbTMqOwBH2aHEj1tswEQ2gb1uyiE9e2Ci4eHPqcpJ_gwo0ug \
  -d "v870 - Reduce date font size, fix opponent alignment, shrink ABANDONED badge"
```

### What Each Flag Does

| Command | Effect | Why Important |
|---------|--------|---------------|
| `clasp push` | Uploads code to Apps Script | Required to store your code |
| `clasp deploy -i ID` | Creates deployment at known URL | Users have stable link, can rollback |
| `clasp deploy` (no -i) | Creates new deployment, new URL | ❌ Breaks bookmarks, shared links |
| `-d "message"` | Stores description for rollback reference | Helps find which version worked |

### Anti-Patterns (Don't Do These)

```bash
# ❌ WRONG: Creates new deployment URL each time
clasp deploy -d "v870 - Something"

# ❌ WRONG: Uploads but no deployment
clasp push

# ❌ WRONG: No version tracking
clasp deploy -i ID

# ✅ RIGHT: Upload + deploy to known URL + version
git add -A
git commit -m "Feature: X - v870"
clasp push --force
clasp deploy -i AKfycbw8nTMiBtx3SMw-s9cV3UhbTMqOwBH2aHEj1tswEQ2gb1uyiE9e2Ci4eHPqcpJ_gwo0ug -d "v870 - Description"
```

---

## Post-Deployment: The 5-Minute Verification

### Immediate Verification (First 2 minutes)

1. **Check Output**: Did `clasp deploy` complete successfully?
   ```bash
   # Look for output like:
   # "Deployed AKfycbw8nTMiBtx3SMw-s9cV3UhbTMqOwBH2aHEj1tswEQ2gb1uyiE9e2Ci4eHPqcpJ_gwo0ug @870"
   ```

2. **Test on Desktop**:
   - Open app in browser
   - Hard refresh (Cmd+Shift+R)
   - Navigate to affected view
   - Check Console for errors
   - Quick sanity check (does it look right?)

3. **Check Version Number**:
   - Open DevTools → Application tab
   - Look for meta tag `name="app-version"`
   - Should match the version you just deployed
   - Example: "870" after v870 deployment

### User Testing (Next 3 minutes)

1. **If CSS/Layout Changed**:
   - Test on mobile device
   - Compare with screenshots from previous version
   - Does it match expectations?

2. **If JavaScript Changed**:
   - Test primary user action in that feature
   - Does it work correctly?
   - Any console errors?

3. **Monitor for Issues**:
   - Check app for next 30 minutes
   - Look for unusual behavior
   - Be ready to rollback if needed

---

## Cache Invalidation Decision Tree

**Use this to decide what caching strategy to use**:

```
Question 1: Does this change affect CSS or HTML styling?
│
├─ YES, and it's CRITICAL (loading overlay, visibility, positioning)
│  └─ Action: EMBED CSS directly in index.html
│     Also bump appVersion
│     Files: index.html + Code.js
│     Example: v856 (loading overlay fix)
│
├─ YES, but it's NON-CRITICAL (colors, spacing, fonts)
│  └─ Action: PUT IN styles.html, bump appVersion
│     May take 24h to propagate fully, users can hard refresh
│     Files: src/styles.html + Code.js
│     Example: v870 (typography polish)
│
└─ NO, only JavaScript/HTML changes
   └─ Action: Bump appVersion
      Files: Code.js
      Example: v863 (nickname mapping)
```

### Decision Examples from Session

| Change | Type | Critical? | Strategy | Result |
|--------|------|-----------|----------|--------|
| Loading overlay position | CSS | YES | Embed + bump | v856 worked on all clients |
| Abandoned game badge size | CSS | NO | styles.html + bump | v870 worked after hard refresh |
| Nickname mapping | JS | N/A | Bump appVersion | v867 worked on all clients |
| BYE game HTML fix | HTML | YES | Both | v869 fixed rendering errors |

---

## Rollback Procedure (If Something Goes Wrong)

### Quick Rollback (Same Day)

```bash
# If you just realized the deploy is broken:

# Option 1: Redeploy previous version (if you know which version was working)
git log --oneline -5
# Find the previous working version
git checkout <commit-hash>
clasp push --force
clasp deploy -i AKfycbw8nTMiBtx3SMw-s9cV3UhbTMqOwBH2aHEj1tswEQ2gb1uyiE9e2Ci4eHPqcpJ_gwo0ug \
  -d "ROLLBACK to v### - reason"

# Option 2: Revert recent commit (if you know what broke it)
git revert <commit-hash>
clasp push --force
clasp deploy -i AKfycbw8nTMiBtx3SMw-s9cV3UhbTMqOwBH2aHEj1tswEQ2gb1uyiE9e2Ci4eHPqcpJ_gwo0ug \
  -d "ROLLBACK v### - reverted specific commit"
```

### Post-Mortems

When a deployment causes issues:
1. Document what went wrong
2. Root cause: Why did it happen?
3. Fix: What prevented catching it earlier?
4. Prevention: How do we prevent this next time?

**Example**: v869 had HTML syntax errors in BYE game section
- **Root Cause**: Previous string replacement incomplete, left malformed HTML
- **Fix**: Should have validated HTML syntax after each replacement
- **Prevention**: Add HTML validation to pre-deployment checklist

---

## Deployment Checklist (Copy & Paste)

Use this checklist before every deployment:

```markdown
## Pre-Deployment (15 min)

- [ ] Understand what changed and why
- [ ] Test in DevTools console (clear cache first)
- [ ] Test on mobile emulation (375px width)
- [ ] Verify production deployment ID in mind
- [ ] Check appVersion needs bumping (critical CSS/HTML changes)
- [ ] CHANGELOG.md updated
- [ ] Commit message clear and descriptive

## Deployment

- [ ] `git add -A && git commit -m "..."`
- [ ] `clasp push --force`
- [ ] `clasp deploy -i PROD_ID -d "vXXX - description"`
- [ ] Check output for success message

## Post-Deployment (5 min)

- [ ] Hard refresh in browser (Cmd+Shift+R)
- [ ] Check version meta tag matches deployed version
- [ ] Navigate to affected view, verify no console errors
- [ ] (If CSS/layout) Test on physical mobile device
- [ ] (If JavaScript) Test primary user action
- [ ] Monitor app for next 30 minutes for issues

## Decision Points

- Critical CSS change? → Also bump appVersion
- Non-critical CSS? → users can hard refresh if needed
- JavaScript change? → Bump appVersion
- Something broken? → Be ready to rollback ASAP
```

---

## Related Documents

- `DEVELOPMENT-PRINCIPLES.md` - General pre-deployment checklist
- `GOOGLE_APPS_SCRIPT_CACHING.md` - Detailed caching strategy
- `DEVELOPMENT_SESSION_2025_12_07.md` - Real-world example (v852-v870)
- `MOBILE_FIRST_DEVELOPMENT.md` - Mobile testing requirements
