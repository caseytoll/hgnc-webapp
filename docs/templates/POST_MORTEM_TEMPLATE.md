# Post-Mortem: [Issue Title]

**Date:** YYYY-MM-DD  
**Severity:** Critical/High/Medium/Low  
**Duration:** X hours/days  
**Impact:** [User-facing impact description]

---

## Executive Summary

One paragraph describing what went wrong, how it was fixed, and the key lesson learned.

---

## Timeline

### Discovery
- **When:** [Date/time]
- **How:** [How was the issue discovered? User report? Testing? Monitoring?]
- **Reporter:** [Who found it?]

### Investigation
- **Started:** [Date/time]
- **Initial Hypothesis:** [What did we think was wrong?]
- **Tools Used:** [Console logging, debugger, tests, etc.]

### Resolution
- **Root Cause Identified:** [Date/time]
- **Fix Implemented:** [Date/time]
- **Fix Deployed:** [Version number]
- **Verified:** [Date/time]

---

## Problem Description

### What Happened
Detailed description of the issue from the user's perspective.

### Expected Behavior
What should have happened instead.

### Actual Behavior
What actually happened, with specific examples.

### Reproduction Steps
1. Step 1
2. Step 2
3. Step 3
4. Observe: [what you see]

---

## Root Cause Analysis

### Surface Symptoms
What we saw initially (the symptoms, not the cause).

### Actual Root Cause
The fundamental reason the issue occurred.

**Why it wasn't caught earlier:**
- [ ] Missing test coverage
- [ ] Edge case not considered
- [ ] Documentation gap
- [ ] Process gap
- [ ] Other: [explain]

---

## Investigation Process

### Hypotheses Tested

1. **Hypothesis 1:** [Description]
   - Evidence for: [what suggested this]
   - Evidence against: [why it was ruled out]
   - Verdict: ❌ Ruled out / ✅ Confirmed / ⚠️ Partial

2. **Hypothesis 2:** [Description]
   - Evidence for: [what suggested this]
   - Evidence against: [why it was ruled out]
   - Verdict: ❌ Ruled out / ✅ Confirmed / ⚠️ Partial

[Add more as needed]

### Debugging Techniques Used
- [ ] Console logging
- [ ] Breakpoint debugging
- [ ] Network inspection
- [ ] DOM inspection
- [ ] Diagnostic code injection
- [ ] Rollback testing
- [ ] A/B comparison
- [ ] Other: [specify]

### Dead Ends
What approaches didn't work and why (to prevent repeating):
1. [Approach] - [Why it didn't help]
2. [Approach] - [Why it didn't help]

---

## Solution

### The Fix
Detailed description of what was changed.

**Files Modified:**
- `filename1` - [what changed]
- `filename2` - [what changed]

**Code Changes:**
```javascript
// Before
[problematic code]

// After
[fixed code]
```

### Why This Works
Explanation of why this solution addresses the root cause.

### Alternative Solutions Considered
1. **Option A:** [Description]
   - Pros: [benefits]
   - Cons: [drawbacks]
   - Why not chosen: [reason]

2. **Option B:** [Description]
   - Pros: [benefits]
   - Cons: [drawbacks]
   - Why not chosen: [reason]

---

## Impact Assessment

### Users Affected
- Number of users: [X or estimate]
- Severity of impact: [Critical/High/Medium/Low]
- Duration: [How long were they affected?]

### Business Impact
- Functionality lost: [what couldn't users do?]
- Workaround available: ✅ Yes / ❌ No
  - If yes: [describe workaround]

### Technical Debt
- Code quality impact: [did the fix create debt?]
- Future maintenance: [easier/harder/same]

---

## Prevention Measures

### Immediate Actions (Implemented)
- [x] Action 1 - [what was done]
- [x] Action 2 - [what was done]

### Short-term Actions (Next Sprint)
- [ ] Add test coverage for [scenario]
- [ ] Update documentation: [which doc]
- [ ] Add validation: [where]
- [ ] Add monitoring: [what metric]

### Long-term Actions (Backlog)
- [ ] Refactor [component] to prevent [issue type]
- [ ] Improve [process] to catch earlier
- [ ] Add [tool/automation]

### Process Changes
What process/workflow changes prevent this class of issue?
- Pre-deployment: [new step]
- Testing: [new requirement]
- Code review: [new checkpoint]
- Documentation: [new standard]

---

## Lessons Learned

### What Went Well
- Positive aspects of how we handled this
- Tools/processes that helped
- Team coordination highlights

### What Could Be Improved
- What would have caught this earlier?
- What would have sped up diagnosis?
- What would have prevented it entirely?

### Key Takeaway
**One sentence that captures the lesson:**

[The most important insight that will change future behavior]

---

## Related Documentation

### Created/Updated
- [ ] [Living doc name] - [what was added]
- [ ] [Test suite] - [what was added]
- [ ] [Checklist] - [what was added]

### Referenced
- Related post-mortem: [link]
- Related feature doc: [link]
- Related standard: [link]

---

## Follow-up

### Verification
- [ ] Issue reproduced in test environment
- [ ] Fix verified in test environment
- [ ] Fix verified in production
- [ ] Monitoring confirms resolution
- [ ] No regressions detected

### Communication
- [ ] Users notified of fix
- [ ] Team briefed on lessons
- [ ] Documentation published
- [ ] Runbook updated (if applicable)

---

## Appendix

### Diagnostic Logs
```
[Relevant log excerpts]
```

### Screenshots/Evidence
[Attach or link to supporting materials]

### References
- [External articles/docs that helped]
- [Similar issues in other projects]
- [Relevant Stack Overflow threads]
