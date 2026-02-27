# Squadi API Authentication & Endpoint Audit

## Current Implementation Review

### 1️⃣ Token Storage & Loading
**Current:** Token stored in Google Sheets `Settings!B1` as plain value
**Format:** Raw token (without "Bearer " prefix) 
**Expiry:** ~1 hour (auto-refreshed by GitHub Actions hourly)
**Status:** ✅ Correct

---

### 2️⃣ Authorization Header Format

#### What We Tested ✅
```javascript
headers: {
  'Authorization': 'Bearer ' + TOKEN,
  'Accept': 'application/json',
  'Referer': 'https://registration.netballconnect.com/'
}
```
**Result:** All 5 endpoints returned 200 OK

#### Current Code Implementation ❌
In `Code.js` across all Squadi fetch functions:
```javascript
var options = {
  'headers': {
    'Authorization': AUTH_TOKEN,  // ❌ MISSING "Bearer " prefix!
    'Accept': 'application/json',
    ...
  }
};
```

**Files affected:**
- `Code.js` line 2937: `fetchSquadiLadderData()` 
- `Code.js` line 1908: `fetchSquadiFixtures()`
- `Code.js` line 1957: `discoverSquadiCompetitions()`
- `Code.js` line 1070: `doGet > debugGameSummary`

**Impact:** ⚠️ All Squadi API calls likely failing with 401 Unauthorized

---

### 3️⃣ Endpoint Verification

#### ✅ Endpoints Being Used (Correct)
| Endpoint | Method | Current Code | Status |
|----------|--------|--------------|--------|
| **Ladder** | GET `/livescores/teams/ladder/v2` | Line 2931 | ✅ Correct URL |
| **Fixtures** | GET `/livescores/round/matches` | Line 1902 | ✅ Correct URL |
| **Game Summary** | GET `/livescores/matches/public/gameSummary` | Line 1066 | ✅ Correct URL |

#### ❓ Endpoint Parameter Validation

**Ladder (`/livescores/teams/ladder/v2`)**
```javascript
// CURRENT (Line 2933-2938):
var url = 'https://api-netball.squadi.com/livescores/teams/ladder/v2'
  + '?divisionIds=' + config.divisionId;
if (config.competitionKey) {
  url += '&competitionKey=' + config.competitionKey;
}
url += '&filteredOutCompStatuses=1&showForm=1&sportRefId=1';

// VERIFIED PARAMETERS (from successful test):
// Required: divisionIds, competitionKey, filteredOutCompStatuses=1, showForm=1, sportRefId=1
```
✅ Parameters are correct

**Fixtures (`/livescores/round/matches`)**
```javascript
// CURRENT (Line 1900-1902):
var url = 'https://api-netball.squadi.com/livescores/round/matches'
  + '?competitionId=' + competitionId
  + '&divisionId=' + divisionId
  + '&teamIds=&ignoreStatuses=%5B1%5D';

// VERIFIED PARAMETER (from successful test):
// Required: competitionId only
// divisionId, teamIds, ignoreStatuses appear to be extras (not in working test)
```
⚠️ May work but untested extra parameters

**Game Summary (`/livescores/matches/public/gameSummary`)**
```javascript
// CURRENT (Line 1066):
var url = 'https://api-netball.squadi.com/livescores/matches/public/gameSummary?matchId=' + 
  dgsMatchId + '&competitionUniqueKey=' + dgsCompKey;

// VERIFIED PARAMETERS:
// Required: matchId, competitionUniqueKey ✅
```
✅ Parameters are correct

---

### 4️⃣ HTTP Method Verification

All endpoints use correct `method: 'get'` ✅

---

## ⚠️ Critical Issues Found

### Issue #1: Missing "Bearer " Prefix (Priority: CRITICAL)
**Impact:** All Squadi endpoints returning 401 Unauthorized
**Scope:** 4 locations in Code.js
**Fix:** Add "Bearer " prefix to Authorization header

**Current:**
```javascript
'Authorization': AUTH_TOKEN,
```

**Should be:**
```javascript
'Authorization': 'Bearer ' + AUTH_TOKEN,
```

### Issue #2: Extra Parameters in Fixtures Endpoint (Priority: LOW)
**Impact:** Unknown (may be ignored by API)
**Scope:** Line 1902-1903 in Code.js
**Current:**
```javascript
+ '&divisionId=' + divisionId
+ '&teamIds=&ignoreStatuses=%5B1%5D';
```

**Note:** The verified working test only used `?competitionId=4650` and it returned all 77 rounds. These extra params may be filtering/limiting results.

---

## 🔍 Alt Authentication Method Found

File: `squadi-auth-token-refresh.js` uses alternate format:
```javascript
'Authorization': `BWSA ${token}`  // NOT "Bearer"
```

**Status:** Different auth method, not used by main Code.js
**Endpoint:** `/livescores/matches/periodScores` (endpoint not in verified list)

---

## 📋 Verification Checklist

- [x] Token format: Correct (plain value without prefix)
- [x] Token storage location: Correct (Settings!B1)
- [x] Token auto-refresh: Correct (GitHub Actions hourly)
- [ ] Authorization header: ❌ MISSING "Bearer " prefix
- [x] Endpoint URLs: Correct (all 3 verified URLs match)
- [x] HTTP methods: Correct (all GET)
- [x] Required parameters: Correct
- [?] Optional parameters: Unknown (may be extra)

---

## 🔧 Required Fixes

1. **Add "Bearer " prefix to Authorization header** in 4 locations (CRITICAL)
2. **Validate/remove optional parameters** from fixtures endpoint (LOW)
3. **Consider consolidating** token refresh logic (NICE-TO-HAVE)

