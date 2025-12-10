# Deployment URL Management

**Purpose:** Understand how deployment URLs work, why they matter, and how to manage them safely.

---

## Core Concept: Deployments vs Versions

This is the most important thing to understand to avoid critical mistakes.

### Versions (Snapshots of Your Code)

**What they are:**
- Immutable snapshots of your entire codebase at a point in time
- Created with `clasp version "description"` or during deployment
- Numbered sequentially (v1, v2, v3, etc. or @1, @2, @3)

**Properties:**
- **Immutable:** Once created, cannot be changed
- **Permanent:** Cannot be deleted (hard limit in Google's system)
- **Limited:** Maximum 200 versions per project
- **Traceable:** Each has a description for what changed

**Example:**
```
Version @1025: "v1024 - Fix hidden views CSS"
Version @1026: "v1025 - Loading states + fixes"
```

### Deployments (URLs Pointing to Versions)

**What they are:**
- URLs that point to a specific version (or @HEAD for latest)
- Created with `clasp deploy` or through web interface
- Each gets a unique 54-character ID

**Properties:**
- **Permanent:** Once deleted, cannot be recovered
- **Mutable:** Can be redeployed to point to different version
- **Limited:** 20 maximum active deployments per project
- **Restorable:** Can be recreated (but gets different ID)

**Example:**
```
Deployment: AKfycbw8nTMiBtx3SMw-... → Points to Version @1025
Deployment: AKfycbyzIhkw5F5HJm7x... → Points to @HEAD (latest)
```

---

## The Critical Mistake: Confusing Delete vs Undeploy

### Scenario: You hit the 200 version limit

**Wrong approach:**
```bash
clasp undeploy AKfycbw8nTMiBtx3SMw-...
# ❌ This deletes the DEPLOYMENT (URL)
# ❌ Users accessing this URL get 404 errors
# ❌ URL is PERMANENTLY GONE
# ❌ Cannot be recovered
```

**What you wanted:**
```bash
# Clean up old VERSIONS (not deployments)
# Through web interface: appsscript.json → Manage versions
# Delete unused @800, @750, @600, etc.
```

**Why the confusion:**
- `clasp undeploy` deletes a DEPLOYMENT (URL)
- But the VERSION it pointed to still exists
- This frees neither space nor versions
- You've just broken a URL for no benefit

---

## The Three Rules of Deployment URLs

### Rule 1: Deployments Are Permanent

**Once you delete a deployment URL, it's gone forever.**

```bash
# Before
https://script.google.com/macros/s/AKfycbw8nTMiBtx3SMw-.../exec ✅ Works

# After deletion
https://script.google.com/macros/s/AKfycbw8nTMiBtx3SMw-.../exec ❌ 404 Error

# Can you undo it?
No. Absolutely not. It's permanent.
```

**Implications:**
- Users accessing that URL will be locked out
- You cannot recreate the exact same URL
- It's like breaking a bridge with people on it
- Need to migrate users to a new URL

### Rule 2: Every URL is Sacred

**Treat production URLs like phone numbers - once they exist, people rely on them.**

```
❌ DON'T: "Let me delete this URL and make a new one"
✅ DO: "Let me keep this URL and update what it points to"
```

**Examples of sacred URLs:**
- URLs in documentation
- URLs in bookmarks
- URLs shared with users
- URLs in integrations
- URLs in email/Slack

### Rule 3: Always Have a Backup URL

**Never rely on a single deployment URL.**

```
Good setup:
- @HEAD URL: Always latest code (use for testing)
- Production URL: Stable fixed version (use for users)
- Both active simultaneously
```

---

## When You CAN Delete a Deployment

Delete a deployment ONLY if:

1. ✅ **It's explicitly not a production URL** (e.g., "test-123")
2. ✅ **You have explicit user approval** (they know and agreed)
3. ✅ **All users have migrated** (no one is using the old URL)
4. ✅ **You've waited 2+ weeks** (gave time for migration)
5. ✅ **You have backup deployments** (users have alternatives)

**Procedure:**
```bash
# Step 1: Announce new URL
"We're moving to: AKfycbwO67aB-..."

# Step 2: Wait 2 weeks
# Monitor usage logs to see when migration is done

# Step 3: Final warning
"The old URL will stop working in 7 days"

# Step 4: Only then delete
clasp undeploy AKfycbw8nTMiBtx3SMw-...

# Step 5: Document deletion
"Deleted: AKfycbw8nTMiBtx3SMw-... (Dec 11, 2025)"
```

---

## Version Limit Management (The Right Way)

### When You Hit 200 Versions

**Problem:**
```
Cannot create more versions: Script has reached the limit of 200 versions.
```

**Wrong Solution:**
```bash
clasp undeploy <url>  # ❌ Doesn't help
```

**Right Solutions:**

#### Option 1: Delete Old Versions (Through Web Interface)
1. Go to Google Apps Script project: https://script.google.com/home
2. Click on your project
3. Go to "Project Settings"
4. Scroll to "Versions"
5. Delete old versions @100-@200 (keep recent ones)
6. Try again

**Why this works:** Frees space without deleting URLs

#### Option 2: Use @HEAD for Everything
```bash
# Deploy to @HEAD (no version created)
clasp push

# @HEAD automatically updates, no version limit issues
# All users use: AKfycbyzIhkw5F5HJm7x1W3rGSdQHZefDvB2-U9M04RzvuRh
```

**Why this works:** Avoids version creation entirely

#### Option 3: Accept the Limit and Manage
```bash
# Document which versions matter
# Delete others manually through web interface
# Keep version numbers consistent with releases
```

**Why this works:** Planned version management

### Best Practice: Version Naming

```bash
# Instead of sequential: 1, 2, 3, 4, 5...
# Use meaningful names:

clasp version "v1024 - Fix CSS specificity issue"
clasp version "v1025 - Loading states + initLineupModule"
clasp version "v1026 - Design system documentation"

# This way, when you hit 200, you can identify which to keep:
# ✅ Keep: Recent versions (v1020+)
# ❌ Delete: Old versions (v900-v1000)
```

---

## Decision Tree: What Should I Do?

```
"I want to deploy my code"
  ├─ Is this a new URL?
  │  └─ Yes → clasp deploy (creates new URL) ✅
  │  └─ No → Update existing URL (below)
  │
  └─ Update to existing URL
     ├─ Is it a @HEAD URL?
     │  └─ Yes → clasp push only (auto-deploys) ✅
     │  └─ No → Use update-deployment (below)
     │
     └─ Update numbered deployment
        ├─ Do you have version slots free?
        │  └─ Yes → clasp version + clasp deploy ✅
        │  └─ No → Use @HEAD or delete old versions
        │
        └─ Never use clasp undeploy for production URLs ❌
```

---

## Example Scenarios

### Scenario 1: Regular Deployment

**Situation:** Code ready, users on stable URL

```bash
# Step 1: Commit code
git add -A && git commit -m "Add new feature"

# Step 2: Push to Apps Script
clasp push

# Step 3: Create version
clasp version "v1027 - Add new feature"

# Step 4: Deploy to production URL
clasp deploy -i AKfycbwO67aBAg_wg4CmR4CyiRypxW7cNX3B04PY_f7FqaqtNP2TQf0_D4_y2aYy44b1z0RgUA -d "v1027 with new feature"

# Step 5: Verify
# - Check version in console (Cmd+Shift+J)
# - Hard refresh (Cmd+Shift+R)
# - Test new feature
```

✅ **Success:** Users see new code automatically

### Scenario 2: Hit Version Limit

**Situation:** Version limit reached (200), code ready to deploy

```bash
# Step 1: Understand the situation
clasp list-versions | wc -l
# Output: 200

# Step 2: Delete old versions (via web interface)
# https://script.google.com/home → Project → Settings → Delete v1, v2, v3...

# Step 3: Try deployment again
clasp push
clasp version "v201 - New feature"

# Step 4: Deploy
clasp deploy -i AKfycbwO67aB... -d "v201"
```

✅ **Success:** Freed space by managing versions, not URLs

### Scenario 3: Emergency - Wrong URL Deployed

**Situation:** Code deployed to wrong URL, need to fix

```bash
# Step 1: Create correct deployment immediately
clasp push
clasp version "v1028 - Emergency fix"
clasp deploy -i [CORRECT_URL] -d "v1028 emergency fix"

# Step 2: Notify users
# "Please hard refresh and reload"

# Step 3: Document incident
# Add to DEPLOYMENT_URL_DELETION_INCIDENT_*.md

# Step 4: Do NOT delete wrong URL yet
# Keep it for debugging/reference for 1+ week
```

✅ **Success:** Minimal downtime, proper recovery

### Scenario 4: URL Accidentally Deleted (What Happened to Us)

**Situation:** Production URL deleted, users can't access app

```bash
# Step 1: Immediate response
# Create new deployment with current code
clasp push
clasp deploy -d "Emergency recovery - v1026 code"

# Step 2: Get new URL
# New URL: AKfycbwO67aB... (different from deleted one)

# Step 3: Notify users urgently
# "Your app URL has changed due to incident"
# "New URL: [NEW_URL]"
# "Please update bookmarks"

# Step 4: Post-mortem
# Document: DEPLOYMENT_URL_DELETION_INCIDENT_2025_12_11.md

# Step 5: Prevention
# Add safeguards so this never happens again
```

⚠️ **Recovery:** Possible but painful. Prevention is key.

---

## Safeguards & Protections

### 1. Registry of URLs
**File:** `docs/DEPLOYMENT_URLS.md`
- Lists every active and deleted URL
- When created
- What version it points to
- Any incidents

### 2. Script to Check Deployments
**File:** `scripts/check-deployments.sh`
```bash
./scripts/check-deployments.sh
# Outputs: Current deployments
#         Critical URLs to avoid deleting
```

### 3. Pre-Deployment Checklist
**File:** `docs/DEPLOYMENT_CHECKLIST.md`

Must answer before deploying:
- [ ] What is your deployment URL?
- [ ] Is this a production URL?
- [ ] Have you verified it with the user?
- [ ] Are you about to delete any URLs?

### 4. Dangerous Commands Warning
**File:** `docs/DEPLOYMENT_CHECKLIST.md`

```
⚠️ DANGER ZONE

These commands can break production:
- clasp undeploy <URL>     ← PERMANENT deletion
- clasp delete-version     ← Cannot actually do this

Only run with explicit user approval.
```

---

## Quick Reference Card

| Command | Effect | Recovery | Use When |
|---------|--------|----------|----------|
| `clasp push` | Upload code | N/A | Always safe |
| `clasp version` | Create snapshot | N/A | Before deployment |
| `clasp deploy` | Create new URL | Create new one | New deployment needed |
| `clasp undeploy` | Delete URL | ❌ IMPOSSIBLE | Never in production |

---

## Summary

1. **Deployments = URLs** (permanent, limited to 20)
2. **Versions = Snapshots** (immutable, limited to 200)
3. **Never delete production URLs** (use @HEAD or manage versions instead)
4. **Always document URLs** (in DEPLOYMENT_URLS.md)
5. **Test before announcing** (verify new URLs work)
6. **Have 2+ active deployments** (redundancy)

**Remember:** URLs are like phone numbers. Once shared, changing them is painful. Don't break them.

---

**Related Documents:**
- `docs/DEPLOYMENT_CHECKLIST.md` - Step-by-step deployment guide
- `docs/DEPLOYMENT_URLS.md` - Registry of active URLs
- `docs/DEPLOYMENT_URL_DELETION_INCIDENT_2025_12_11.md` - What went wrong and how we fixed it

**Last Updated:** December 11, 2025
