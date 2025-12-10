# Production Deployment URLs

**Last Updated:** December 11, 2025  
**Purpose:** Registry of all active and inactive deployment URLs for tracking and reference

---

## Current Active Deployments

### @HEAD Deployment (Always Latest Code)

```
https://script.google.com/macros/s/AKfycbyzIhkw5F5HJm7x1W3rGSdQHZefDvB2-U9M04RzvuRh/exec
```

| Property | Value |
|----------|-------|
| **Short ID** | `AKfycbyzIhkw...` |
| **Status** | ✅ Active |
| **Version** | @HEAD (always latest) |
| **Created** | December 10, 2025 |
| **Auto-Updates** | Yes (every code push) |
| **Best For** | Development, testing, "always latest" |
| **User Base** | Internal testing |
| **Last Deploy** | December 11, 2025 |

**Key Feature:** This URL automatically updates whenever code is pushed, no manual deployment needed.

**Recommendation:** Use this for internal testing or if you want the absolute latest code.

---

### Production Deployment (v1025+)

```
https://script.google.com/macros/s/AKfycbwO67aBAg_wg4CmR4CyiRypxW7cNX3B04PY_f7FqaqtNP2TQf0_D4_y2aYy44b1z0RgUA/exec
```

| Property | Value |
|----------|-------|
| **Short ID** | `AKfycbwO67aB...` |
| **Status** | ✅ Active |
| **Version** | @1026 (contains v1025 code) |
| **Created** | December 11, 2025, 11:22 AM |
| **Contents** | Loading states, initLineupModule fix, all v1025 improvements |
| **Best For** | Stable production use |
| **User Base** | End users (primary) |
| **Testing** | All tests passing ✅ |

**Key Feature:** Fixed version, does not auto-update. Requires explicit deployment for changes.

**Recommendation:** Use this for stable production access. Users should bookmark this URL.

---

## Deleted Deployments

### ⚠️ Original Stable URL (PERMANENTLY DELETED)

```
https://script.google.com/macros/s/AKfycbw8nTMiBtx3SMw-s9cV3UhbTMqOwBH2aHEj1tswEQ2gb1uyiE9e2Ci4eHPqcpJ_gwo0ug/exec
```

| Property | Value |
|----------|-------|
| **Short ID** | `AKfycbw8nTMiBtx3SMw...` |
| **Status** | ❌ PERMANENTLY DELETED |
| **Version** | Was @1025 |
| **Created** | December 10, 2025 |
| **Deleted** | December 11, 2025, 11:20 AM |
| **Deletion Method** | `clasp undeploy` command |
| **Recovery** | ❌ IMPOSSIBLE - No recovery possible |
| **Incident** | Accidental deletion during version limit management |
| **User Impact** | 404 errors for anyone accessing this URL |

**⚠️ CRITICAL:** This URL is permanently gone. **Do not attempt to use it.**

**Why It Was Deleted:**
- Hit Google Apps Script version limit (200 versions)
- Attempted to free space by undeploy
- Did not understand permanence of deletion
- This was a critical mistake

**What Users Must Do:**
If you were using this URL, you must switch to one of the active URLs above.

**Post-Mortem:** See `docs/DEPLOYMENT_URL_DELETION_INCIDENT_2025_12_11.md`

---

## Deployment History Timeline

| Date | Version | URL | Status | Notes |
|------|---------|-----|--------|-------|
| Dec 10, 2025 | @1025 | `AKfycbw8nTMiBtx3SMw...` | ❌ DELETED | Original stable URL, accidentally deleted |
| Dec 10, 2025 | @HEAD | `AKfycbyzIhkw...` | ✅ Active | Always latest code |
| Dec 11, 2025 | @1026 | `AKfycbwO67aB...` | ✅ Active | Current production (v1025 code) |

---

## How to Use This Registry

### For Users
**Question:** "What URL should I use?"

**Answer:** Use the production URL:
```
https://script.google.com/macros/s/AKfycbwO67aBAg_wg4CmR4CyiRypxW7cNX3B04PY_f7FqaqtNP2TQf0_D4_y2aYy44b1z0RgUA/exec
```

Bookmark this URL. It's stable and contains the latest production code.

### For Developers
**Before deploying:**
1. Check this registry for active URLs
2. Never assume a URL is still valid
3. Verify with user which URL they use
4. Update this registry after any deployment changes

### For Operations
**When managing deployments:**
1. Always update this registry first
2. Never delete URLs without documenting reason
3. Maintain 2+ active deployments for redundancy
4. Notify users immediately of any URL changes

---

## Rules for Deployment URLs

### ✅ DO

- ✅ Keep @HEAD URL active (always latest)
- ✅ Keep 1+ production stable URL active
- ✅ Document every deployment URL created
- ✅ Update this registry immediately after changes
- ✅ Test in new URL before announcing to users
- ✅ Keep old URLs for 2+ weeks after migration
- ✅ Verify URL with user before assuming it's correct

### ❌ DON'T

- ❌ Delete production URLs without explicit approval
- ❌ Use `clasp undeploy` on production URLs
- ❌ Forget to document URLs in this registry
- ❌ Assume a URL is still valid without checking
- ❌ Deploy to multiple URLs without notification
- ❌ Make users guess which URL to use
- ❌ Delete deployment without migrating users first

---

## URL Anatomy

Every Google Apps Script deployment URL follows this pattern:

```
https://script.google.com/macros/s/{DEPLOYMENT_ID}/exec
```

Breaking it down:
- `script.google.com/macros/s/` - Base Google Apps Script endpoint
- `{DEPLOYMENT_ID}` - Unique identifier for this deployment (54 characters)
- `/exec` - Execution endpoint

**Example:**
```
https://script.google.com/macros/s/AKfycbyzIhkw5F5HJm7x1W3rGSdQHZefDvB2-U9M04RzvuRh/exec
                                    └─ This 54-char ID uniquely identifies the deployment
```

Each deployment is permanent and immutable - once created, it always points to the same code version.

---

## Common Questions

### Q: Can I recover a deleted URL?
**A:** No. Deleted deployments cannot be recovered. This is by design in Google Apps Script.

### Q: What's the difference between @HEAD and numbered deployments?
**A:** 
- **@HEAD:** Always points to latest code. Updates with every push.
- **@1026, @1025, etc.:** Fixed versions. Never change.

### Q: How many deployment URLs can I have?
**A:** Google Apps Script allows up to 20 active deployments.

### Q: What happens if I delete a deployment?
**A:** The URL becomes invalid (404 errors). Anyone using that URL will be locked out.

### Q: Should I create a new deployment for every code change?
**A:** No. Use @HEAD for development, create new deployments only for stable production releases.

### Q: Why is there a version limit (200)?
**A:** Google's quota to prevent storage bloat. Versions are immutable snapshots.

### Q: How do I increase the version limit?
**A:** You can't. Once you hit 200, you must clean up old versions or contact Google.

---

## Migration Procedure (If URL Changes Required)

If you need to migrate users to a new URL:

### Phase 1: Preparation (1 week before)
1. Create new deployment with latest code
2. Test thoroughly
3. Document new URL here
4. Notify users of upcoming change

### Phase 2: Migration (Day 1)
1. Announce new URL
2. Provide migration instructions
3. Both old and new URLs work simultaneously
4. Monitor for issues

### Phase 3: Grace Period (2 weeks)
1. Keep old URL active
2. Monitor usage (web server logs)
3. Ensure users have migrated
4. Provide support for migration issues

### Phase 4: Cleanup (After 2 weeks)
1. Verify no significant traffic on old URL
2. Request user confirmation before deletion
3. Delete old deployment ONLY with approval
4. Update this registry

---

## Support Resources

**For URL Issues:**
- Cannot access your URL? → Check browser console (right-click → Inspect → Console tab)
- Getting 404 error? → Verify URL is still active in this registry
- Not seeing latest changes? → Try hard refresh (Cmd+Shift+R)

**For Developers:**
- Read: `docs/DEPLOYMENT_CHECKLIST.md` - How to deploy
- Read: `docs/DEPLOYMENT_URL_MANAGEMENT.md` - Why this matters
- Read: `docs/DEPLOYMENT_URL_DELETION_INCIDENT_2025_12_11.md` - What went wrong

---

**Maintainer:** Development Team  
**Last Review:** December 11, 2025  
**Status:** Active Registry
