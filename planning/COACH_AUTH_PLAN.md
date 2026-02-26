# Coach Authentication & Access Control Plan

**Status**: Planning Phase  
**Date**: February 25, 2026  
**Author**: Planning Session  
**Scope**: Coach-level login, PIN-based authentication, team filtering, usage analytics

---

## Executive Summary

Implement a coach-level authentication system to replace current team-level PIN access. This gives each coach their own login identity (with unique Coach ID), restricts visibility to their assigned teams, and adds professional usage analytics.

**Key Benefits:**
- ✅ Coaches see only their teams (improved privacy & focus)
- ✅ Ownership & accountability tracking
- ✅ Usage analytics without performance impact
- ✅ Reuses existing PIN infrastructure (no password complexity)
- ✅ Scales from 10 to 100+ coaches

**Effort**: ~3-4 weeks development + QA  
**Risk Level**: Medium (architectural change, but backward compatible)

---

## Problem Statement

### Current State
- Teams list shows ALL coaches' teams to every device
- PIN is per-team (each team can have its own PIN)
- No concept of coach identity/sessions
- Impossible to answer: "Did coach X actually log in?" or "Which coach made this change?"
- No usage data: which features do coaches actually use?

### Desired State
- Coach logs in once with their name + PIN
- Sees only teams assigned to them
- Session persists across devices/teams
- Can log out returning to login screen
- Audit trail shows who accessed what
- Analytics show feature adoption

---

## Recommendation: Full Combo Implementation

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│ COACH APP                                                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Coach Landing Page (NEW)                                  │
│  └─ Coach Selection + PIN Entry                            │
│     (shows list of coaches with their teams)               │
│                                                             │
│  Team Landing Page (UNCHANGED)                             │
│  └─ Filtered to current coach only                         │
│                                                             │
│  Existing App (game detail, scoring, roster, etc.)         │
│  └─ Unchanged functionality                                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────┐
│ GOOGLE APPS SCRIPT BACKEND                                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  NEW Coaches Sheet                                          │
│  ├─ Coach ID (unique identifier)                           │
│  ├─ Coach Name (display, not unique)                       │
│  ├─ PIN (hashed)                                           │
│  └─ Metadata (created, last login, active status)          │
│                                                             │
│  UPDATED Teams Sheet                                        │
│  └─ Coach ID (foreign key to Coaches sheet)                │
│                                                             │
│  NEW API Actions                                            │
│  ├─ validateCoachLogin(coachID, pin)                       │
│  ├─ getCoaches()                                           │
│  └─ createCoach(name, pin)                                 │
│                                                             │
│  NEW Audit_Log Sheet (optional, for security)              │
│  └─ Logs: login attempts, data changes, errors             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────┐
│ ANALYTICS (OPTIONAL)                                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Google Analytics 4 (Usage Insights)                        │
│  └─ Feature adoption, tab views, session analytics         │
│                                                             │
│  Apps Script Native Logs (Security Events)                 │
│  └─ Login attempts, PIN failures (auto-purged 30 days)    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Technical Specifications

### 1. Coach Identity (Coach IDs)

**Why**: Handle name collisions gracefully. Two coaches named "Sarah" can coexist without database conflicts.

**Data Structure**:
```
Coaches Sheet Structure:
┌────┬─────────────────────┬──────────┬─────────────┬──────────────┐
│ A  │ B                   │ C        │ D           │ E            │
├────┼─────────────────────┼──────────┼─────────────┼──────────────┤
│ ID │ Coach Name          │ PIN      │ PIN Token   │ Display Name │
├────┼─────────────────────┼──────────┼─────────────┼──────────────┤
│ co…│ Sarah               │ 1234     │ 8f3a2c1e… │ Sarah L      │
│ co…│ Sarah               │ 5678     │ c4d9f2e5… │ Sarah (W)    │
│ co…│ Emma                │ 9012     │ 7b1a4c3d… │              │
└────┴─────────────────────┴──────────┴─────────────┴──────────────┘
```

**Key Points**:
- Coach ID: `coach_{timestamp}` (e.g., `coach_1709884920123`)
- Coach Name: Display name, NOT unique (allows duplicates)
- Display Name: Optional override for disambiguation (e.g., "Sarah L" or "Sarah (Lowe)")
- PIN: 4-digit string, hashed in storage
- PIN Token: Session token, regenerated on each login

**Migration of Existing Coaches**:
```javascript
// For each team with coach assigned:
// 1. Check if coach with that name exists in Coaches sheet
// 2. If not, create new coach entry
// 3. Update Teams sheet column N (coach) from name → coachID
```

---

### 2. PIN Architecture

**PIN Hierarchy** (for maximum flexibility):
1. **Coach PIN** (new) — Used to log in as a coach
2. **Team PIN** (existing) — Still works for backward compatibility during transition
3. **Master PIN** (existing) — Admin override for emergencies

**Validation Flow**:
```
validateCoachLogin(coachID, pin):
  if pin === Coaches[coachID].pin:
    ✅ Success → return pinToken
  elif pin === MASTER_PIN:
    ✅ Success (admin override) → log attempt, return pinToken
  else:
    ❌ Failure → log attempt, check brute force
```

**Brute Force Protection**:
- Max 5 failed attempts per IP per 15-minute window
- Temporary lockout: 15 minutes
- Log all failures (helps detect attacks)

---

### 3. Team Assignment (Mandatory Coach)

**Policy**: Every team must have a coach assigned.

**Enforcement**:
- Wizard step 4 (create team): Coach dropdown is required, not optional
- Existing teams: Migration script assigns unassigned teams to "Unassigned Coach" placeholder
- Admin can reassign teams later via Team Settings

**Benefits**:
- Eliminates "orphaned" teams
- Clear ownership chain
- Simpler filtering logic (all teams have coach)

---

### 4. Coach Landing Page (New UI Layer)

**Before Coach Login**:
```
┌────────────────────────────────────────┐
│     HGNC Team Manager                  │
├────────────────────────────────────────┤
│                                        │
│  Select your coach:                    │
│                                        │
│  › Sarah L                             │
│    Hazel Glen 6, HG U11               │
│                                        │
│  › Sarah (W)                           │
│    HG Minors                           │
│                                        │
│  › Emma                                │
│    Mixed A, Mixed B                    │
│                                        │
│  [PIN input field appears on tap]      │
│                                        │
│  ───────────────────────────────────── │
│  [Master PIN]  [System Settings]       │
│                                        │
└────────────────────────────────────────┘
```

**UI Features**:
- Coach names with teams listed below (context for disambiguation)
- Tap coach → show PIN modal
- Master PIN entry: separate button (shows "Admin Mode" after unlock)
- Logout button appears after login (in top header or settings)

**Flow**:
1. App loads → Check if coach already logged in (localStorage)
2. If yes → Show teams filtered to that coach
3. If no → Show coach landing page
4. User taps coach → PIN modal
5. User enters PIN → Validate, store coachToken + coachID
6. Show team list filtered to their teams

---

### 5. Name Collision Handling

**Case 1: Unique Names** (Sarah + Emma)
```
Display:
  Sarah
    Teams: Hazel Glen 6, HG U11
  Emma
    Teams: Mixed A, Mixed B
```

**Case 2: Duplicate Names** (Sarah + Sarah)
```
First Sarah created normally
  coach_123 | name: "Sarah" | displayName: null

Second Sarah creation:
  1. Backend checks: "Sarah already exists"
  2. Prompt user: "How should we call you?"
  3. User enters: "Sarah L" or "Sarah (Lowe)"
  4. Create: coach_456 | name: "Sarah" | displayName: "Sarah L"

Display:
  Sarah L
    Teams: Hazel Glen 6, HG U11
  Sarah (Lowe)
    Teams: HG Minors
```

**Implementation**:
- Check for name collision when creating coach
- If duplicate: Require display name before saving
- If no duplicate: Display name optional (use coach name)

---

### 6. Login & Session Management

**Login Endpoint** (Apps Script):
```javascript
case 'validateCoachLogin':
  input: { coachID, pin }
  
  steps:
    1. Find coach by coachID
    2. Verify PIN (hashed comparison)
    3. If valid: generate new pinToken, update lastLogin timestamp
    4. If invalid: log failure, check brute force, return error
    5. Return: { success, pinToken, coachID, coachName }
```

**Frontend State**:
```javascript
state.currentCoachID = 'coach_1709884920123';
state.currentCoachName = 'Sarah L';
state.coachPinToken = 'a1b2c3d4e5f6g7h8';

// Persisted to localStorage
// Cleared on logout
```

**Session Duration**:
- No automatic session expiration (PIN provides single-device gate)
- Session persists even if user closes app
- Logout clears session manually or via "Log Out All Devices" option

---

### 7. Team Filtering (Frontend)

**Filter Applied**:
```javascript
const visibleTeams = state.teams.filter(team => 
  team.coachID === state.currentCoachID
);
```

**Edge Cases**:
- Coach with no teams: Shows "No teams assigned" message
- New coach (just created): No teams initially (assign via wizard or Team Settings)
- Team reassigned: Next sync shows updated list

---

### 8. Logout & Session Switching

**Logout**:
- Button in System Settings or header
- Clears `state.currentCoachID`, `state.coachPinToken`, `state.currentCoachName`
- Returns to coach landing page
- Data syncs before logout

**Switch Coach** (same device):
- Option: "Switch Coach" button on landing page
- Keeps app state, just changes coach filtering
- Quick reauth with different coach PIN

---

## Analytics & Logging Strategy

### Usage Analytics (Google Analytics 4)

**Events to Track** (non-PII):
```
✅ coach_login      { success: true/false, timestamp }
✅ coach_logout     { timestamp }
✅ tab_switched     { value: "schedule" | "roster" | "stats" | "training" }
✅ stat_tab_switch  { value: "overview" | "leaders" | "positions" | "combos" }
✅ feature_used     { value: "lineup_planner" | "fixture_sync" | "ai_insights" }
✅ data_synced      { success: true/false }
```

**Dashboard** (see weekly):
```
Active Coaches (last 30 days): 12
Avg Session Length: 11 minutes
Feature Adoption:
  - Lineup Planner: 72%
  - Fixture Sync: 90%
  - AI Insights: 30%
  - Training Sessions: 20%

Most Used Stats Tab:
  - Overview: 45%
  - Leaders: 35%
  - Positions: 15%
  - Combos: 5%
```

**Implementation**:
- Add GA4 tracking code (5 lines of JS)
- Tag user interactions with `gtag('event', ...)`
- Zero performance impact (async, batched)

### Security Logging (Apps Script)

**Events to Log** (optional, for abuse detection):
```
✅ coach_login       (success/failure, IP, timestamp)
✅ login_failure     (failed PIN attempts, IP)
✅ master_pin_used   (admin access, timestamp)
✅ brute_force       (>5 failures detected, IP locked)
```

**Storage**:
- Apps Script native logs (auto-purged after 30 days)
- Manual review monthly via Apps Script Executions tab
- Optional: Forward to Audit_Log sheet for permanent record

**Privacy**:
- No coach names logged (just attempt success/failure)
- No PII in logs
- IPs only for brute force detection

---

## Implementation Timeline

### Phase 1: Backend Foundation (Week 1)
**Effort**: 8-10 hours

**Tasks**:
- [ ] Create Coaches sheet structure
- [ ] Write `ensureCoachesSheetStructure()` function
- [ ] Write migration script: `migrateTeamPinsToCoaches()`
- [ ] Add `validateCoachLogin(coachID, pin)` API action
- [ ] Add `getCoaches()` API action
- [ ] Add `createCoach(name, pin)` API action
- [ ] Update Teams sheet: Add coachID column, remove PIN columns
- [ ] Add brute force detection to validateCoachLogin
- [ ] Test with mock data

**Deployment**: Staging only (no frontend changes yet)

---

### Phase 2: Frontend Coach Landing (Week 2)
**Effort**: 10-12 hours

**Tasks**:
- [ ] Update state.js: Add `currentCoachID`, `currentCoachName`, `coachPinToken`
- [ ] Create coach landing page component
- [ ] Build coach selection + PIN entry modal
- [ ] Add coach list filtering logic (show teams per coach)
- [ ] Update team list rendering to filter by currentCoachID
- [ ] Add logout functionality
- [ ] Update team-selector.js to handle coach authentication
- [ ] Add localStorage persistence for session
- [ ] Test login/logout flow

**Deployment**: Beta feature (toggle-able via debug flag)

---

### Phase 3: GA4 Analytics (Week 2.5)
**Effort**: 2-3 hours

**Tasks**:
- [ ] Create Google Analytics 4 account
- [ ] Add GA4 tracking code to coach app
- [ ] Tag events: login, logout, tab switches, feature usage
- [ ] Build custom dashboard in GA4
- [ ] Verify event delivery

**Deployment**: Same as Phase 2

---

### Phase 4: Migration & Testing (Week 3)
**Effort**: 8-10 hours

**Tasks**:
- [ ] Run migration script: convert existing coaches to Coaches sheet
- [ ] Verify Teams sheet coach IDs populated correctly
- [ ] Manual testing: Login as each coach type (unique name, duplicate name)
- [ ] Test brute force: Confirm lockout after 5 failures
- [ ] Test team filtering: Verify only assigned teams shown
- [ ] Test logout/switch coach
- [ ] Cross-browser testing (Safari, Chrome, Firefox)
- [ ] Mobile testing (iOS, Android PWA)
- [ ] Edge cases:
  - Coach with no teams
  - New coach signup
  - Master PIN override
  - Team reassignment mid-session

---

### Phase 5: Rollout & Cleanup (Week 4)
**Effort**: 4-6 hours

**Tasks**:
- [ ] Make coach landing page default UI
- [ ] Monitor GA4 dashboard for first week
- [ ] Gather coach feedback
- [ ] Fix bugs if any
- [ ] Remove debug flag (old "teams first" UI)
- [ ] Deprecate team PIN columns from Teams sheet (keep 2 weeks for rollback)
- [ ] Update CLAUDE.md documentation
- [ ] Release notes

---

## Migration Strategy

### Data Migration (One-Time)

**Step 1: Create Coach Entries**
```javascript
// For each team with a coach name assigned:
const uniqueCoaches = new Set(teams.map(t => t.coach).filter(Boolean));

uniqueCoaches.forEach(coachName => {
  createCoach(coachName, defaultPIN); // Default PIN set by admin
});
// Result: 10-20 new rows in Coaches sheet
```

**Step 2: Link Teams to Coaches**
```javascript
// Update Teams sheet: coach (text) → coachID (reference)
teams.forEach(team => {
  if (team.coach) {
    const coach = findCoachByName(team.coach);
    teamsSheet.updateCoachID(team.teamID, coach.id);
  }
});
```

**Step 3: Handle Unassigned Teams**
```javascript
// Teams with no coach assigned:
const unassigned = teams.filter(t => !t.coach);

if (unassigned.length > 0) {
  // Option A: Create "Unassigned" placeholder coach
  const unassignedCoach = createCoach("Unassigned", masterPin);
  unassigned.forEach(team => {
    teamsSheet.updateCoachID(team.teamID, unassignedCoach.id);
  });
  
  // Option B: Require manual assignment in Team Settings
  // (shows warning next to unassigned teams)
}
```

### Rollback Plan (If Issues Found)

**Safety Window**: Keep old system operable for 2 weeks

**Fallback Approach**:
1. Toggle `USE_COACH_AUTH = false` in Apps Script Properties
2. Backend falls back to team PIN validation
3. Frontend re-enables team list (not coach filtered)
4. Coaches can still access teams via team PIN

**Rollback Effort**: ~30 minutes

**Decision Point**: After 1 week of successful coach login usage, delete fallback code permanently

---

## UI/UX Patterns

### Coach Landing Page (Detailed)

**State 1: Load Coach Names**
```
Show: Loading spinner
Load: coaches + their team assignments
```

**State 2: Display Coaches**
```
┌───────────────────────────────────────────┐
│           HGNC Team Manager               │
├───────────────────────────────────────────┤
│                                           │
│  👤 Select Coach to Begin                │
│                                           │
│  › Sarah L                                │
│    🏐 Hazel Glen 6                       │
│    🏐 HG U11                             │
│                                           │
│  › Sarah (W)                              │
│    🏐 HG Minors                          │
│                                           │
│  › Emma                                   │
│    🏐 Mixed A                            │
│    🏐 Mixed B                            │
│                                           │
│  ───────────────────────────────────────  │
│  [?] Help    [🔐] Master PIN    [⚙️] Settings
│                                           │
└───────────────────────────────────────────┘
```

**State 3: PIN Entry Modal**
```
┌───────────────────────────────────────────┐
│  Sarah L - Enter PIN                      │
├───────────────────────────────────────────┤
│                                           │
│  Enter your 4-digit PIN:                 │
│  [·  ·  ·  ·]                            │
│                                           │
│  [ Cancel ]          [ Unlock ]          │
│                                           │
└───────────────────────────────────────────┘
```

**State 4: User Logged In (Header)**
```
┌───────────────────────────────────────────┐
│  👤 Sarah L  [⚙️]  [🚪 Logout]            │ ← Header
├───────────────────────────────────────────┤
│  My Teams                                 │
│                                           │
│  › Hazel Glen 6                          │
│  › HG U11                                │
│                                           │
└───────────────────────────────────────────┘
```

### Team Assignment in Wizard

**Step 4 (Coach Selection)**:
```
┌───────────────────────────────────────────┐
│  Step 4 of 6: Coach                       │
├───────────────────────────────────────────┤
│                                           │
│  Who's coaching this team?                │
│                                           │
│  [Select Coach ▼]                        │
│  ├─ Sarah L                              │
│  └─ Emma                                  │
│     Other...                              │
│                                           │
│  [Back]  [Continue]                      │
│                                           │
└───────────────────────────────────────────┘
```

**Coach Creation (if "Other..." selected)**:
```
┌───────────────────────────────────────────┐
│  Create New Coach                         │
├───────────────────────────────────────────┤
│                                           │
│  Coach Name:                              │
│  [Sarah________________]                  │
│                                           │
│  New PIN (4 digits):                      │
│  [1  2  3  4]                            │
│                                           │
│  [ Cancel ]  [ Create Coach ]            │
│                                           │
└───────────────────────────────────────────┘
```

---

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|-----------|
| **Name collision UX** | Medium | Show teams per coach (self-documenting), require display name for duplicates |
| **Session loss mid-app** | Low | Persist to localStorage, auto-restore on app open |
| **Brute force attack** | Low | IP-based rate limiting, max 5 attempts per 15 min |
| **Coach forgets PIN** | Medium | Master PIN override, or password reset via email (future) |
| **Migration incomplete** | Medium | Dry run first, backup Teams sheet, verify all teams have coachID |
| **Performance regression** | Low | GA4 is async/non-blocking; backend queries are simple (indexed on coachID) |
| **Rollback complexity** | Low | Safety toggle + fallback logic kept 2 weeks |
| **Privacy concern** | Low | No PII in logs, GA4 configured to strip IPs |

---

## Success Criteria

**Functional**:
- [ ] Coaches can login with name + PIN
- [ ] Sessions persist across app restarts
- [ ] Team list filters to current coach only
- [ ] Logout clears session, returns to coach landing
- [ ] Master PIN override works for admin
- [ ] Brute force lockout prevents abuse

**Data Integrity**:
- [ ] All existing teams have coachID after migration
- [ ] Coach IDs are unique and immutable
- [ ] No duplicate coachIDs in Coaches sheet
- [ ] Teams sheet coach column updated correctly

**Analytics**:
- [ ] GA4 receives events (login, logout, tab switches)
- [ ] Dashboard shows usage patterns
- [ ] No sensitive data in logs

**Performance**:
- [ ] Login/logout < 500ms
- [ ] Team filtering < 100ms
- [ ] No lag in UI interactions
- [ ] GA4 events don't block user interactions

**User Experience**:
- [ ] Coaches understand coach selection UI
- [ ] Name collisions handled gracefully
- [ ] Logout button easily discoverable
- [ ] Error messages clear and actionable

---

## Assumptions

1. **Coach names change rarely** — If coach name changes after migration, must update Teams sheet manually (or add renaming UI)
2. **Unique team-to-coach relationship** — Each team has one primary coach (not multiple co-coaches) — can be enhanced later
3. **All coaches have PIN** — Coaches can remember 4-digit PINs (validated in user research)
4. **Master PIN is secure** — Stored in Apps Script Properties, used only for admin override
5. **Storage limits acceptable** — Google Sheets can handle 1000+ log rows (auto-purged after 30 days)
6. **Migration script is run once** — No incremental migration needed

---

## Future Enhancements (Out of Scope)

- [ ] Co-coaching (multiple coaches per team)
- [ ] Assistant coach role (read-only access)
- [ ] Password-based login (instead of PIN-only)
- [ ] Email/SMS PIN reset
- [ ] Device name tracking (e.g., "Sarah's iPad")
- [ ] Single sign-on (SSO) with club member database
- [ ] Detailed audit trail (every data change logged)
- [ ] Usage reports (exportable dashboards)

---

## Questions & Decisions

**Decision 1: Display Name vs. Auto-Suffix?**
- ✅ Chosen: Display name (coach types in "Sarah L" on collision)
- Alternative: Auto-suffix with initials (app chooses "Sarah (LO)")
- Rationale: Puts control with user, feels personal

**Decision 2: Mandatory Coach on Teams?**
- ✅ Chosen: Yes, every team must have a coach
- Alternative: Optional (allows "Unassigned" teams visible to all)
- Rationale: Clearer ownership, simpler filtering

**Decision 3: Analytics Platform?**
- ✅ Chosen: Google Analytics 4 (free, battle-tested, professional)
- Alternative: Custom Sheet-based analytics (simpler but reinventing the wheel)
- Rationale: GA4 provides dashboards out-of-the-box, zero maintenance

**Decision 4: PIN Same or Different for Coach vs. Team?**
- ✅ Chosen: Coach PIN separate from Team PIN (allows different security models)
- Alternative: Same PIN for both
- Rationale: Coach PIN is identity gate (permanent), Team PIN still works for backup

**Decision 5: Keep Old Team PIN Columns?**
- ✅ Chosen: Keep for 2 weeks (safety rollback window), then delete
- Alternative: Delete immediately
- Rationale: Zero rollback risk if something goes wrong in Phase 2-3

---

## Communication & Training

### For Coaches
- **Email 1 (Week 1)**: "Exciting update coming to Team Manager! You'll soon log in with your name and PIN."
- **Email 2 (Week 3)**: "Team Manager now has a Coach Login screen. Here's how to use it: [video/screenshots]"
- **Email 3 (Week 4)**: "Coach Login is now live! Questions? [Help link]"

### For Parents (Optional)
- Parent Portal unchanged (still access by team slug URL)
- Optional note: "Coaches now have more secure, personalized access to manage teams."

### For Admin (You)
- GA4 dashboard: Check weekly for usage trends
- Apps Script logs: Check monthly for brute force attempts
- Coach feedback: Gather feedback after first month

---

## Related Documents

- **CLAUDE.md**: System architecture & module overview
- **DEPLOYMENT_AUTOMATION.md**: CI/CD pipeline & deployment process
- **pin.md** (if exists): Current PIN system documentation
- **GA4 Setup Guide** (TBD): How to configure Google Analytics 4

---

## Sign-Off

**Status**: Ready for stakeholder review  
**Next Step**: Approve plan, then proceed to Phase 1 (backend foundation)  
**Review Date**: February 28, 2026

---

**Questions?** Contact planning team or open GitHub issue.
