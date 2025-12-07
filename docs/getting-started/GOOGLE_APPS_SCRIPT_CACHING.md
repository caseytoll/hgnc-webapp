# Google Apps Script Caching Strategy

**Last Updated**: December 7, 2025  
**Status**: Critical Learning from Session  
**Priority**: Read this BEFORE making CSS/HTML changes to Google Apps Script projects

---

## The Problem: Aggressive Client-Side Caching

Google Apps Script's HtmlService caches resources **very aggressively** — sometimes for days — without respecting standard HTTP cache headers. This creates a critical issue where:

1. You deploy code changes
2. Users refresh the page
3. They still see the old cached version
4. Support tickets say "it's not working"
5. Users perform hard refresh (Ctrl+Shift+R) and it works
6. They blame the app for being "broken"

### Why This Happens

Google Apps Script caches:
- `.js` files (Script.html bundles)
- `.css` files (linked stylesheets)
- Static HTML content
- Asset references

The caching is tied to the **deployment ID** and **timestamp**, not individual resources.

---

## Solution 1: Direct CSS Embedding (CRITICAL CSS ONLY)

For CSS that affects **core functionality or critical UX**, embed directly in `<head>` instead of linking via `styles.html` include.

### When to Use
- Loading overlays/spinners
- Modal positioning/visibility
- Navigation bar show/hide
- Any "must work on first load" CSS

### How to Implement

**❌ Don't do this (unreliable):**
```html
<link rel="stylesheet" href="styles.html">
```

**✅ Do this instead (reliable):**
```html
<head>
  <style>
    /* Critical CSS embedded directly */
    .loading-overlay {
      position: fixed !important;
      top: 50% !important;
      left: 50% !important;
      transform: translate(-50%, -50%) !important;
      z-index: 9999 !important;
      backdrop-filter: blur(4px) !important;
    }
  </style>
</head>
```

### Guidelines
- **Embed**: Only CSS that controls visible behavior (must never be broken by cache)
- **Include**: Everything else (colors, spacing, non-critical styling)
- **Use !important**: Flags ensure cache bypass styles work even with competing rules
- **Comment clearly**: Mark embedded CSS sections with `/* CRITICAL - EMBEDDED ... */`

### Examples from v856 Session

```html
<!-- CRITICAL - EMBEDDED LOADING OVERLAY CSS -->
<style>
  .loading-overlay {
    position: fixed !important;
    top: 50% !important;
    left: 50% !important;
    transform: translate(-50%, -50%) !important;
  }
  .loading-overlay.hidden {
    display: none !important;
  }
</style>

<!-- CRITICAL - EMBEDDED NAVIGATION HIDE CSS -->
<style>
  .nav-bar {
    display: none !important;
  }
  .nav-bar.visible {
    display: flex !important;
  }
</style>
```

---

## Solution 2: AppVersion Bumping (For JS/HTML Changes)

The `appVersion` variable in `Code.js` forces cache invalidation when clients reload. This works well for **JavaScript and HTML changes**.

### How It Works
1. Client loads app and checks `template.appVersion`
2. Browser stores this version
3. On next load, if version changed, browser busts cache
4. New JS/HTML loads

### Implementation

**In Code.js:**
```javascript
function doGet(e) {
  try {
    var template = HtmlService.createTemplateFromFile('index.html');
    
    // Cache buster - update for JS/HTML changes
    template.appVersion = '870';
    
    var result = template.evaluate()
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    return result;
  } catch (error) {
    Logger.log('ERROR in doGet: ' + error.toString());
  }
}
```

**In index.html (via template):**
```html
<meta name="app-version" content="<?= appVersion ?>">
<script>
  // Check version on load
  var currentVersion = document.querySelector('meta[name="app-version"]').content;
  // Used for cache busting in JavaScript if needed
</script>
```

### When to Bump
- New JavaScript functionality added
- HTML structure changes
- Bug fixes that require code reload
- New CSS classes added (even if in styles.html)

**✅ Bump it when:**
- User reports "it's still the old version even after refresh"
- You changed JS logic and want to force client reload
- You changed HTML structure

### Version Progression Example (from Session)
```
v864 - Initial cache invalidation attempt
v866 - After nickname mapping implementation
v867 - After layout restructuring
v869 - After BYE game HTML fix
v870 - After typography polish
```

---

## Solution 3: User Hard Refresh (Last Resort)

If caching problems occur and users are stuck on old version:

1. Tell user to do **hard refresh**: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
2. This bypasses browser cache and Google Apps Script cache
3. Works but puts burden on user — prefer Solutions 1 or 2

---

## Combined Strategy (Recommended)

| Change Type | Strategy | When to Use |
|-------------|----------|------------|
| Critical CSS (loading, modals, visibility) | Direct embedding in HTML | Always for mission-critical UI |
| Other CSS (colors, spacing, fonts) | styles.html include | Non-critical, can tolerate cache delay |
| JavaScript/HTML changes | appVersion bump | Every significant code change |
| Small tweaks | Combination | Depends on risk |

### Example: Loading Overlay Bug (v856)

**Problem**: Loading spinner in wrong position after deploy  
**Root Cause**: CSS cached, appVersion not bumped  
**Solution**:
1. Embed critical loading CSS directly in `index.html` (prevents cache issues)
2. Bump appVersion to force client reload
3. Deploy with both changes

**Result**: Guaranteed to work on all clients without needing hard refresh

---

## Testing Your Changes Before Deployment

### Testing Checklist
- [ ] Open browser DevTools (F12)
- [ ] Navigate to Application → Cache Storage
- [ ] Clear all caches for domain
- [ ] Hard refresh page (Ctrl+Shift+R)
- [ ] Test changes work correctly
- [ ] Check Console for any JavaScript errors
- [ ] Test on mobile device if UI/CSS change
- [ ] Open in incognito window (fresh cache)

### Real-World Testing (from Session)
User tested all v858-v870 on physical mobile device:
1. Deployed new version
2. Hard refreshed in mobile browser
3. Took screenshots
4. Scored layout quality (62/100 → 92/100+)
5. Each iteration validated before proceeding

---

## Common Caching Problems & Solutions

### Problem: "I deployed but users still see old version"
**Cause**: CSS/HTML cached without appVersion bump  
**Fix**: Bump appVersion and deploy again  
**Prevention**: Always bump for HTML/CSS changes

### Problem: "CSS changed but inline styles still override"
**Cause**: Inline styles have higher specificity than embedded CSS  
**Fix**: Use `!important` flags on critical embedded CSS  
**Prevention**: Reserve `!important` only for critical embedded CSS

### Problem: "Users say refresh fixed it"
**Cause**: Cache invalidation incomplete  
**Fix**: Implement both embedded CSS and appVersion bump  
**Prevention**: Use combined strategy for critical changes

### Problem: "Mobile app looks different than desktop after deploy"
**Cause**: Cache inconsistency between devices  
**Fix**: Force reload on both devices, verify same version loads  
**Prevention**: Check appVersion meta tag on both devices

---

## Code Review Checklist

When reviewing Google Apps Script CSS/HTML changes:

- [ ] Does this change affect **critical functionality** (loading, visibility, positioning)?
- [ ] If yes, is CSS **embedded directly** in index.html?
- [ ] Are embedded CSS rules tagged with `!important`?
- [ ] Has **appVersion been bumped**?
- [ ] Is the commit message clear about what was cached?
- [ ] Have you tested with cache cleared?
- [ ] Have you tested on actual mobile device?

---

## Architecture Decision Record

**Date**: December 7, 2025  
**Context**: Loading overlay bug (v852-v856) caused by CSS caching  
**Decision**: Implement combined caching strategy  
**Rationale**:
- Critical CSS embedded prevents breaking changes
- appVersion bumping handles JS/HTML reload
- User hard refresh available as last resort
- Balances reliability with maintainability

**Consequences**:
- ✅ Users never see broken critical UI due to cache
- ✅ Changes reliably propagate to all clients
- ✅ Reduces support burden from "it's still broken"
- ⚠️ Adds slight complexity to deployment process
- ⚠️ Embedded CSS in HTML increases HTML file size slightly

---

## Related Documents
- DEVELOPMENT_SESSION_2025_12_07.md (Bug #1 root cause analysis)
- CI_DEPLOY.md (Deployment pipeline)
- DEVELOPMENT-PRINCIPLES.md (Pre-deployment checklist)

## Reference: Session v856 Fix

**Files Changed**: index.html, Code.js  
**Commits**: 57ca8ed, 1a776f7, 5df1846, 915881a, 1d1be30  
**Issue**: Loading spinner centered in top-left instead of viewport center  
**Root Cause**: styles.html CSS cached, not applying  
**Fix Implemented**:
```html
<!-- Embedded directly in index.html -->
<style>
  .loading-overlay {
    position: fixed !important;
    top: 50% !important;
    left: 50% !important;
    transform: translate(-50%, -50%) !important;
    backdrop-filter: blur(4px) !important;
  }
</style>
```
Plus appVersion bump in Code.js from 852 → 856
