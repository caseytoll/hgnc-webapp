# Netball Connect API Discovery (Proxyman Session: 2026-02-25)

## 🎯 Key Finding

**Netball Connect uses sport-specific Squadi subdomains, not generic `api.squadi.com`.**

---

## 📡 Discovered Endpoints

### Primary API Endpoints
```
https://api-netball.squadi.com           ← Main data API (fixtures, ladder, matches)
https://registration-netball.squadi.com  ← Auth/registration endpoint
https://registration.netballconnect.com  ← Netball Connect branded wrapper
```

### Your Code Status: ✅ Already Correct

**Code.js already uses the correct endpoint** (10 occurrences):
```javascript
// Lines 1500, 1552, 1653, 1714, 1719, 1720, 1721, 1831, 2651, 4517
const url = 'https://api-netball.squadi.com/livescores/round/matches';
const base = 'https://api-netball.squadi.com';
```

**Auth already configured:**
```javascript
// Line 1193-1210: loadAuthToken() reads from Settings sheet (B1)
function loadAuthToken() {
  var settingsSheet = ss.getSheetByName('Settings');
  return settingsSheet.getRange('B1').getValue(); // AUTH_TOKEN stored here
}
```

---

## 🔐 Authentication

**Method:** Bearer token (stored in Settings sheet cell B1)

**Headers used:**
```javascript
{
  'Authorization': AUTH_TOKEN,  // Loaded from Settings sheet
  'Content-Type': 'application/json'
}
```

**How to get/update token:**
1. Open Google Sheet → Settings tab
2. Cell B1 contains AUTH_TOKEN
3. If value is `'PASTE_NEW_TOKEN_HERE'`, code returns error
4. Update token when expired (you likely already have a valid one)

---

## 📋 Known Endpoints (From Your Code)

| Endpoint | Purpose | Line in Code.js |
|----------|---------|-----------------|
| `/livescores/teams/ladder/v2` | Fetch ladder standings | 1500, 2651 |
| `/livescores/round/matches` | Fetch fixture/results | 1552, 1653, 1831 |
| `/livescores/competitions` (POST) | Get competition list | 1714 |
| `/api/organisation/{key}/competitions` | Org competitions | 1719 |
| `/api/competitions` (POST) | Competition details | 1720 |

**Important:** Line 1721 references a different subdomain:
```javascript
'https://competition-api-netball.squadi.com/api/competitions'
```
This endpoint may be deprecated or limited (LIVE_GAME_CLOCK_PLAN.md notes it times out).

---

## ✅ What This Means for Implementation

### 1. No Code Changes Needed
Your existing Code.js is already using the correct endpoints. ✅

### 2. Planning Docs Updated
Updated these files to document the netball-specific subdomain:
- ✅ OPPOSITION_SCOUTING_PLAN.md (added API discovery note)
- ✅ CLAUDE_CODE_START_HERE.md (added to "What you're building" section)
- ✅ BATCH_3_GAPS_11_20.md (added to Gap 15: Quota estimation)

### 3. Auth Token Verification
If Squadi API calls are failing with 401/403 errors:
1. Open Google Sheet → Settings tab → Check cell B1
2. If value is `'PASTE_NEW_TOKEN_HERE'`, you need to add a valid token
3. Token likely obtained from Netball Connect login flow (check browser DevTools → Network → Copy `Authorization` header from a request)

---

## 🔍 How to Extract Auth Token (If Needed)

**Method 1: Browser DevTools (Easier)**
1. Open https://registration.netballconnect.com in browser
2. Log in with your netball account
3. Open DevTools (F12) → Network tab
4. Navigate to fixture/ladder page
5. Find request to `api-netball.squadi.com`
6. Copy `Authorization` header value
7. Paste into Settings sheet cell B1

**Method 2: Proxyman (What You Just Did)**
1. Keep Proxyman running
2. Trigger fixture refresh in Netball Connect app
3. Find request to `api-netball.squadi.com/livescores/...`
4. Click request → View Headers → Copy `Authorization` value
5. Paste into Settings sheet cell B1

---

## 🚨 Common Issues & Solutions

### Issue: 401 Unauthorized
**Cause:** Token expired or invalid  
**Fix:** Update Settings sheet B1 with fresh token (see extraction methods above)

### Issue: 403 Forbidden
**Cause:** Token doesn't have access to requested competition/division  
**Fix:** Ensure token is from an account with access to the target competition

### Issue: Empty responses or null data
**Cause:** Token valid but wrong endpoint parameters (competitionId, divisionId)  
**Fix:** Use `autoDetectSquadi` API action to discover correct IDs

---

## 📖 Related Documentation

- **Your code:** [apps-script/Code.js](../apps-script/Code.js) (lines 1193-1210 for auth, lines 1500-4517 for endpoints)
- **Planning:** [OPPOSITION_SCOUTING_PLAN.md](OPPOSITION_SCOUTING_PLAN.md) (updated with API discovery)
- **Claude Code handoff:** [CLAUDE_CODE_START_HERE.md](CLAUDE_CODE_START_HERE.md)
- **Live game clock:** [LIVE_GAME_CLOCK_PLAN.md](LIVE_GAME_CLOCK_PLAN.md) (notes competition-api subdomain timeout issues)

---

## ✅ Summary

**You discovered:** Netball Connect = Squadi backend with netball-specific subdomains  
**You already have:** Correct implementation in Code.js  
**You need:** Valid auth token in Settings sheet B1 (you likely already have it)  
**Next step:** If API calls failing → Verify token, otherwise you're good to go! ✅
