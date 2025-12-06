# Quick Reference: HGNC WebApp Status
**As of December 7, 2025 - TL;DR Version**

---

## 🎯 What This Project Is
A Google Apps Script web application for managing netball teams with:
- ✅ Player roster management
- ✅ Game scheduling and score tracking
- ✅ Season statistics and insights dashboards
- ✅ Team performance analytics
- ✅ Owner/admin control + public read-only view

**Status:** PRODUCTION READY - All major features working, recent cleanup complete

---

## 📊 Current State (v823 - Production)

### What's Working
- ✅ All 4 insight cards displaying correctly (Team Performance, Offensive Leaders, Defensive Wall, Player Analysis)
- ✅ Owner-mode UI deterministic across view switches
- ✅ Dark mode with system preference detection
- ✅ PWA installation support
- ✅ Runtime smoke tests passing
- ✅ Project structure refactored and clean
- ✅ All icons using WebP + PNG fallbacks

### Recent Major Fixes (Last 2 Weeks)
| Issue | Root Cause | Fixed | Version |
|-------|-----------|-------|---------|
| Blank insights page | Missing HTML closing tags | Added proper closing tags | v818 |
| Icons not displaying | Missing server injection + inconsistent attributes | Unified to single `data-icon` attribute | v820 |
| Icon file naming | Inconsistent casing | Renamed to kebab-case | v823 |
| Large diagnostic logs | Debug code left in production | Removed 140+ lines | v823 |

---

## 🚀 Deployment

### Quick Deploy (Recommended)
```bash
./scripts/efficient-deploy.sh "Description of changes"
```

### Full Workflow (Most Thorough)
```bash
./scripts/test-and-deploy.sh "Description of changes"
```

### Pre-Deploy Validation (Always Run)
```bash
./scripts/pre-deploy-check.sh
```

### Critical: ALWAYS use this format for production
```bash
clasp push
clasp deploy -i AKfycbw8nTMiBtx3SMw-s9cV3UhbTMqOwBH2aHEj1tswEQ2gb1uyiE9e2Ci4eHPqcpJ_gwo0ug -d "v{X} - {description}"
```
⚠️ **The `-i` flag is NON-NEGOTIABLE** - Forgetting it creates a new URL and breaks all bookmarks

---

## 📁 Project Structure (Recently Reorganized)

```
src/
  ├── includes/          ← All JavaScript modules
  ├── icons/            ← Icon asset definitions  
  └── styles.html       ← All CSS

tests/                   ← All test files
scripts/                 ← All deployment + utility scripts
docs/                    ← All documentation (was scattered)
Code.js                  ← Apps Script entry point (1067 lines)
index.html               ← Main HTML (1895 lines)
```

---

## 📚 Must-Read Documents

**Start Here:**
1. `docs/DEVELOPMENT-PRINCIPLES.md` - Non-negotiables (READ BEFORE EVERY FEATURE)
2. `docs/CHANGELOG.md` - See what's been done (1685 lines, 40+ versions)
3. `README.md` - Project overview

**When Debugging:**
- `docs/POST_MORTEM_2025_12_06.md` - How we debug complex issues
- `docs/DEBUGGING_STRATEGY.md` - Comprehensive debugging approach

**Reference:**
- `docs/TESTING_README.md` - How to test
- `docs/ICON_IMAGES_STANDARDIZATION.md` - Icon patterns
- `docs/CONTRIBUTING.md` - Before making changes

---

## ✅ Pre-Deployment Checklist

Before deploying ANY change:

- [ ] Read `DEVELOPMENT-PRINCIPLES.md` checklist
- [ ] Search codebase for similar features (don't assume it's new)
- [ ] Test in browser DevTools console first
- [ ] Run `./scripts/pre-deploy-check.sh`
- [ ] Update version in Code.js (line ~54: `template.appVersion = 'X'`)
- [ ] Update CHANGELOG.md with what changed
- [ ] Use correct deployment command with `-i` flag
- [ ] After deploy, test in browser

---

## 🔧 Key Development Patterns

### 1. Data Persistence Pattern
```javascript
// Data is static except when:
// - New game added/edited/deleted
// - Team roster changes
// - Season switches

// Use hash-based change detection:
if (currentHash === lastHash) {
  return cachedStats; // Instant, 95% of time
}
// Only recalculate when data changes
```

### 2. Debugging Front-Load
Instead of: 1 log per deploy (20 deploys)  
Do this: Comprehensive logging from start + error handling

### 3. CSS Parent Chain
When facing inexplicable height issues:
1. Check HTML validates (closing tags)
2. Check parent elements are visible
3. Check CSS cascade up the chain

### 4. Icon Fallback Chain
```
Server injection → Attribute fallback → CDN → Default
```

---

## 📊 Performance

| Operation | Time | Notes |
|-----------|------|-------|
| View switch | <5ms | Cached elements |
| Stats calculation | 50-200ms | Only on data change (95% cached) |
| Initial load | <1ms | IndexedDB cache |
| Detail view render | 10-30ms | Acceptable for drill-down |

---

## 🐛 Bug Reports Summary

**Major Bugs Fixed in v823:**
1. ✅ Blank insights page (v818) - Malformed HTML
2. ✅ Missing icon display (v820) - Missing server injection
3. ✅ Image 404 errors (v742) - Missing data: URI prefixes
4. ✅ Owner UI inconsistent (v767) - Control flow issue

**No Critical Issues Currently Known**

---

## 👤 Key Stakeholders

- **Owner/Developer:** Casey Toll (caseytoll78@gmail.com)
- **Teams Data:** Google Sheets (SPREADSHEET_ID in Code.js)
- **Hosting:** Google Apps Script + jsDelivr CDN

---

## 🔐 Security & Access

- **Public Access:** Read-only view (anyone can see team data)
- **Owner Only:** Edit functionality (controlled by userEmail check)
- **Production URL:** Configured for ANYONE_ANONYMOUS access
- **GCP:** Service account for CI/CD (optional Workload Identity setup)

---

## 📞 Quick Links

**Production:** https://script.google.com/macros/s/AKfycbw8nTMiBtx3SMw-s9cV3UhbTMqOwBH2aHEj1tswEQ2gb1uyiE9e2Ci4eHPqcpJ_gwo0ug/exec

**Dev Helpers:**
- Browser console: `AppValidator.runAllChecks()` - Validate app state
- Terminal: `./scripts/pre-deploy-check.sh` - Pre-deployment validation
- Terminal: `npm test` - Run test suite

---

## 🎓 Pro Tips

1. **Before implementing:** Search codebase for similar features
2. **Before deploying:** Test one thing in browser DevTools console
3. **After deploy:** Try the actual feature in browser, not just refresh
4. **When stuck:** Check DEVELOPMENT-PRINCIPLES.md - patterns are there
5. **On merge conflict:** Prefer shorter versions of same feature

---

**Last Updated:** December 7, 2025  
**Document Status:** ✅ Complete  
**Project Status:** ✅ Production Ready
