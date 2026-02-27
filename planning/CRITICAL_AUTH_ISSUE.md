# ⚠️ CRITICAL: Squadi API Authentication Issue Found

## Summary
**Your code is using the correct Squadi endpoints BUT with incorrect authentication headers.**

All Squadi API calls are missing the `"Bearer "` prefix in the Authorization header, likely causing **401 Unauthorized** errors.

---

## Issue Details

### ❌ What's Wrong
Authorization header is being set **without the required "Bearer " prefix**:

```javascript
// CURRENT (WRONG):
headers['Authorization'] = AUTH_TOKEN;

// SHOULD BE:
headers['Authorization'] = 'Bearer ' + AUTH_TOKEN;
```

### ✅ Test Verification
When we tested the Squadi APIs today, **all 5 endpoints worked correctly with `Authorization: Bearer {TOKEN}`**:
- ✅ Ladder endpoint: 29.1 KB response, 8 divisions
- ✅ Rounds/Matches endpoint: 668.5 KB response, 77 rounds
- ✅ Game Summary endpoint: Response with match details

---

## 🔍 Affected Code Locations

9 instances in `apps-script/Code.js` need the fix:

| Line | Function | Endpoint | Status |
|------|----------|----------|--------|
| 1005 | `debugSquadiEndpoint` | Dynamic (debug endpoint) | ❌ Missing "Bearer " |
| 1064 | `debugGameSummary` | `/livescores/matches/public/gameSummary` | ❌ Missing "Bearer " |
| 1753 | (unlabeled) | `/livescores/teams/ladder/v2` | ❌ Missing "Bearer " |
| 1805 | (unlabeled) | Squadi API | ❌ Missing "Bearer " |
| 1909 | `fetchSquadiFixtures` | `/livescores/round/matches` | ❌ Missing "Bearer " |
| 1951 | `discoverSquadiCompetitions` | Various Squadi endpoints | ❌ Missing "Bearer " |
| 2104 | (context needed) | Squadi API | ❌ Missing "Bearer " |
| 2940 | `fetchSquadiLadderData` | `/livescores/teams/ladder/v2` | ❌ Missing "Bearer " |
| 5138 | (context needed) | Squadi API (conditional) | ❌ Missing "Bearer " |

---

## ✅ Endpoint Verification

### All Endpoints Using Correct URLs

| Endpoint | Type | Status | Working |
|----------|------|--------|---------|
| `/livescores/teams/ladder/v2` | GET | Correct URL | ✅ YES |
| `/livescores/round/matches` | GET | Correct URL | ✅ YES |
| `/livescores/matches/public/gameSummary` | GET | Correct URL | ✅ YES |

### HTTP Methods
All endpoints correctly using `method: 'get'` ✅

### Parameters
- **Ladder:** divisionIds, competitionKey, filteredOutCompStatuses=1, showForm=1, sportRefId=1 ✅
- **Rounds:** competitionId (+ extra divisionId, teamIds, ignoreStatuses) ✅
- **Game Summary:** matchId, competitionUniqueKey ✅

---

## 🧪 Why This Works in Testing But Not in Production

### Our Test Used: ✅
```python
headers = {
    "Authorization": f"Bearer {TOKEN}",
    "Accept": "application/json",
    "Referer": "https://registration.netballconnect.com/"
}
```
**Result:** All 5 endpoints returned 200 OK

### Your Code Uses: ❌
```javascript
headers = {
    'Authorization': AUTH_TOKEN,  // NO "Bearer " prefix
    'Accept': 'application/json',
    'Referer': 'https://registration.netballconnect.com/'
}
```
**Result:** Likely returns 401 Unauthorized

---

## 📊 Impact Assessment

### What's Broken
- 🔴 **Ladder display** — Shows "Failed to load ladder" 
- 🔴 **Fixture sync** — Can't auto-populate matches from Squadi
- 🔴 **Match details** — Can't fetch game summary for scouting
- 🔴 **Auto-detect** — Can't find teams in Squadi competitions

### What's Working
- ✅ Team creation (manual entry)
- ✅ Game scoring (manual entry)
- ✅ Local history (stored in Sheets)

---

## 🔧 The Fix (Code Changes Required)

### Quick Fix: Add "Bearer " Prefix

Change ALL 9 instances from:
```javascript
headers['Authorization'] = AUTH_TOKEN;
```

To:
```javascript
headers['Authorization'] = 'Bearer ' + AUTH_TOKEN;
```

### Files to Edit
- `apps-script/Code.js` (9 locations)
  - Lines: 1005, 1064, 1753, 1805, 1909, 1951, 2104, 2940, 5138

---

## 🔐 Token Format Verification

### Current Implementation: ✅
- Token stored in `Settings!B1` as **plain value** (correct)
- Token auto-refreshed hourly by GitHub Actions (correct)
- Token extracted from BWSA cookie by `scripts/get-squadi-token.cjs` (correct)

### Required Change: ❌
- **Prepend "Bearer " when sending** in Authorization header

---

## 📝 Other Findings

### Alternative Auth Method (Unused)
File `apps-script/squadi-auth-token-refresh.js` uses different auth format:
```javascript
'Authorization': `BWSA ${token}`  // Uses "BWSA", not "Bearer"
```
Status: Not used by main `Code.js`, appears to be for alternate endpoint

---

## ✨ Recommendation

1. **Immediate:** Add "Bearer " prefix to all 9 Authorization headers in Code.js
2. **Verify:** Test after fix:
   - Load ladder in Coach App
   - Auto-detect Squadi teams in Create Team wizard
   - View match details/scouting hub
3. **Monitor:** Check Apps Script logs for any 401 errors

---

## References

- **Test Results:** `/planning/SQUADI_ENDPOINT_TEST_RESULTS.md`
- **API Docs:** `/planning/NETBALL_CONNECT_API_ENDPOINTS.md`
- **Token Refresh:** `.github/workflows/refresh-squadi-token.yml`

