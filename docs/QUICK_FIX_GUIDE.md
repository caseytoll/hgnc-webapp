# Quick Fix Guide - Common Issues & Solutions (v1025+)

**For other troubleshooting strategies, see:** [DEBUGGING_STRATEGY.md](./operations/DEBUGGING_STRATEGY.md)

---

## Problem 1: User Doesn't See Recent Changes After Deployment

**Symptom:** "I deployed but users still see the old version"

**Cause:** Browser caching (AppCache, Service Worker, or HTTP cache)

**Quick Fix (1 minute):**
1. Tell user to **hard refresh**: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)
2. If still broken after hard refresh, user should open in **incognito/private window**
3. If still broken, check version in console: 
   ```javascript
   // User should run this in browser console
   console.log('App Version:', window.appVersion);
   ```

**If version number is correct but feature isn't working:**
- Issue is code bug, not caching
- Check DEBUGGING_STRATEGY.md for systematic approach

**Prevention:** Always tell users: "Deployed to version X. Please hard refresh (Cmd+Shift+R) and check console for version number."

---

## Problem 2: Blank View (View Shows But Content Missing)

**Symptom:** View renders but content is missing/blank

**Examples:**
- Player Analysis page loads but shows nothing
- Defensive Units view exists but shows empty
- Schedule view blank

**Quick Diagnosis (2 minutes):**

Open browser console (`F12`) and run:
```javascript
// Check which view is currently visible
const visibleView = document.querySelector('.view:not(.hidden)');
console.log('Visible view:', visibleView?.id);

// Check if view exists in DOM
const analysisView = document.getElementById('player-analysis-view');
console.log('View exists:', !!analysisView);

// Check if view is hidden
const computed = window.getComputedStyle(analysisView);
console.log('Computed display:', computed.display);
console.log('Computed visibility:', computed.visibility);
```

**If view is hidden but shouldn't be:**
- Issue is CSS specificity/cascade
- **Reference:** [POST_MORTEM_CSS_SPECIFICITY_2025_12_10.md](./POST_MORTEM_CSS_SPECIFICITY_2025_12_10.md)
- Add `!important` to `.view.active` rule in styles.html
- Or check `.view.hidden { display: none !important; }` is present (line ~5300)

**If view is visible but content empty:**
- Issue is likely JavaScript not rendering data
- Check console for errors: Look for red text in browser console
- Check if data exists: `console.log(window.games); console.log(window.players);`

---

## Problem 3: CSS Changed But App Looks Wrong

**Symptom:** "I changed CSS but now three other views are broken"

**Root Cause:** CSS cascade/specificity issues

**Quick Prevention:**
1. **ALWAYS test all views** after CSS changes
2. **Before** making CSS changes, read: [CSS_BEST_PRACTICES.md](./standards/CSS_BEST_PRACTICES.md)
3. **Use:** `!important` ONLY when necessary (style resets, display overrides)
4. **Test:** All 20 views render correctly

**Quick Fix if Already Broken:**
1. Check what changed: `git diff src/styles.html`
2. Most likely: A `.view` or `.hidden` rule got updated
3. Review the rule with highest specificity wins
4. If unsure: Reference [POST_MORTEM_CSS_SPECIFICITY_2025_12_10.md](./POST_MORTEM_CSS_SPECIFICITY_2025_12_10.md) - this exact problem happened in v1011-v1024

---

## Problem 4: Deployed to Wrong URL

**Symptom:** "User accessing old URL and not seeing new version"

**Why This is Critical:**
- Some deployment URLs are permanent and cannot be undeployed safely
- Using `clasp undeploy` PERMANENTLY DELETES a URL with no recovery

**Quick Prevention:**
1. **ALWAYS use:** `clasp deploy -i <DEPLOYMENT_ID> -d "description"`
2. **NEVER use:** `clasp deploy -d "description"` (creates orphan)
3. **Reference:** [DEPLOYMENT_URLS.md](./DEPLOYMENT_URLS.md) - Registry of all URLs
4. **Before deploying:** Run `./scripts/check-deployments.sh` to see all active URLs

**If Already Deployed to Wrong URL:**
1. **DO NOT use `clasp undeploy`** - This is permanent deletion
2. Create new deployment to correct URL: 
   ```bash
   clasp deploy -i <CORRECT_URL_ID> -d "v1025+ actual fix"
   ```
3. Tell user to use new URL going forward
4. **Document in:** [DEPLOYMENT_URLS.md](./DEPLOYMENT_URLS.md) - Add note about old URL

**Reference:** [DEPLOYMENT_URL_DELETION_INCIDENT_2025_12_11.md](./DEPLOYMENT_URL_DELETION_INCIDENT_2025_12_11.md) - Full incident analysis of why permanent deletion is dangerous

---

## Problem 5: Console Shows Errors

**Common Errors:**

### Error: "Cannot read property 'X' of undefined"
**Likely Cause:** Data not loaded yet or not returned from server

**Fix:**
```javascript
// Add null checks before accessing properties
// WRONG:
const score = game.score.value;  // Breaks if game or score is undefined

// RIGHT:
const score = game?.score?.value || 0;  // Safe
```

### Error: "View container not found"
**Likely Cause:** HTML structure missing or navigation called before page loaded

**Fix:**
1. Hard refresh browser: `Cmd+Shift+R`
2. Or open in incognito window
3. Or check that index.html includes all views in src/includes/

---

## Problem 6: Performance Issues / Slow Rendering

**Symptom:** App feels sluggish, takes 2-3 seconds to switch views

**Quick Diagnosis:**
1. Open DevTools Performance tab (`F12` → Perf tab)
2. Record while clicking a view button
3. Look for long tasks (yellow = 50-200ms, red = 200ms+)

**Common Causes:**
1. **Large render function** - js-render.html is 3,956 lines
   - Current workaround: Already well-optimized, cached at startup
   - Future: Could split into smaller modules

2. **Network latency** - Waiting for server response
   - Check: Open DevTools Network tab
   - Look for slow requests to server functions

3. **DOM queries in loops**
   - Already optimized in current code
   - Avoid: `document.getElementById()` inside loops

**Fix:** Reference [DEVELOPMENT-PRINCIPLES.md](./getting-started/DEVELOPMENT-PRINCIPLES.md) Performance section

---

## Problem 7: Modal or Toast Not Showing

**Symptom:** Action triggered but no feedback (no modal, no toast)

**Likely Causes:**
1. Modal is there but off-screen (CSS positioning)
2. Toast hidden behind other elements (z-index issue)
3. JavaScript function not called (event listener missing)

**Quick Fix:**
```javascript
// Debug modals - check if they exist and are visible
const modal = document.getElementById('modal-id');
console.log('Modal exists:', !!modal);
console.log('Modal hidden:', modal?.classList.contains('hidden'));
console.log('Modal z-index:', window.getComputedStyle(modal).zIndex);

// Should see: true, false, 9999 (or similar high number)
```

**If modal exists but hidden:**
- Check CSS: `.modal.hidden { display: none; }` is working
- Or check: `.modal { z-index: 9999; }` is set high enough

---

## Problem 8: Form Input Not Updating

**Symptom:** User types in form but data doesn't save

**Quick Diagnosis:**
1. Check if input has `value` binding or `onchange` handler
2. Check if input is being cleared after save
3. Verify server function is actually being called

**Test in Console:**
```javascript
// Get the input element
const input = document.querySelector('input[id="player-name"]');

// Try to change it
input.value = 'Test Name';

// Trigger change event
input.dispatchEvent(new Event('change', { bubbles: true }));

// Check if it was saved
console.log('Updated value:', input.value);
```

---

## Problem 9: Dark Mode Not Working

**Symptom:** App stays in light mode even when system prefers dark mode

**Quick Fix:**
```javascript
// Check what the browser reports
console.log('System dark mode:', window.matchMedia('(prefers-color-scheme: dark)').matches);

// Check what app is using
console.log('App dark mode:', document.documentElement.getAttribute('data-theme'));

// Force dark mode for testing
document.documentElement.setAttribute('data-theme', 'dark');
```

**If dark mode CSS not applying:**
- Check styles.html has dark mode rules (search for `data-theme="dark"`)
- Current code has full dark mode support
- Reference: [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) - Dark mode section

---

## Problem 10: Missing Data or Player Not Showing Up

**Symptom:** "I added a player but they don't appear in the list"

**Likely Cause:** Data not synced to server or cached locally

**Quick Fix:**
1. Hard refresh (`Cmd+Shift+R`)
2. Check if player exists in data sheet (open Google Sheet directly)
3. If exists in sheet but not in app:
   - Close and reopen app (forces fresh data load)
   - Or clear localStorage: 
     ```javascript
     localStorage.clear();
     location.reload();
     ```

**If player doesn't exist in sheet:**
- Add via app and save
- Then refresh

---

## Quick Console Debugging Commands

Copy and paste these into browser console (`F12`):

```javascript
// Check app version (should match Code.js appVersion)
console.log('✅ Version:', window.appVersion);

// Check all data loaded
console.log('✅ Teams:', window.teams?.length);
console.log('✅ Players:', window.players?.length);
console.log('✅ Games:', window.games?.length);

// Check current view
const active = document.querySelector('.view:not(.hidden)');
console.log('✅ Current view:', active?.id);

// Check dark mode
console.log('✅ Dark mode:', document.documentElement.getAttribute('data-theme'));

// All good if all say true / have values
```

---

## Before Asking for Help

**Checklist:**
- [ ] Hard refreshed: `Cmd+Shift+R`
- [ ] Checked browser console for errors: `F12`
- [ ] Opened in incognito window (rules out extensions)
- [ ] Verified deployment URL is correct
- [ ] Checked console.log shows expected data
- [ ] Tested on different browser if possible

**Then refer to:**
1. [DEBUGGING_STRATEGY.md](./operations/DEBUGGING_STRATEGY.md) - Systematic approach
2. [START_HERE.md](./START_HERE.md) - Critical rules
3. [LESSONS_LEARNED.md](./LESSONS_LEARNED.md) - Has this happened before?

---

**Last Updated:** December 11, 2025 (v1025+)  
**Questions?** Check [DOCUMENTATION_INDEX.md](./DOCUMENTATION_INDEX.md) for full navigation
