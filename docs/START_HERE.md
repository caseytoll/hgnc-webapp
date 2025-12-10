# 🚨 START HERE - Critical Lessons for AI Agents

**Read this FIRST before any debugging or development work.**

---

## The #1 Rule: Check Computed Styles, Not Classes

```javascript
// ❌ WRONG - Assumptions kill efficiency
if (element.classList.contains('hidden')) {
  console.log('Element is hidden');  // MAY BE FALSE!
}

// ✅ RIGHT - Verify actual computed style
const computed = window.getComputedStyle(element);
console.log('Computed display:', computed.display);  // TRUTH
```

**Why:** CSS cascade can override classes. An element can have `.hidden` class but still render visibly due to specificity conflicts.

**Cost of not knowing:** 12 versions, 3 hours (Dec 10, 2025)

---

## The #2 Rule: Verify Deployment URL FIRST

**Before ANY debugging or code changes, ask:**
```
"What URL are you using to access the app?"
```

**Expected answer:**
```
https://script.google.com/macros/s/AKfycbw8nTMiBtx3SMw-s9cV3UhbTMqOwBH2aHEj1tswEQ2gb1uyiE9e2Ci4eHPqcpJ_gwo0ug/exec
```

**Then use for ALL deployments:**
```bash
clasp deploy -i AKfycbw8nTMiBtx3SMw-s9cV3UhbTMqOwBH2aHEj1tswEQ2gb1uyiE9e2Ci4eHPqcpJ_gwo0ug -d "v{X} - {description}"
```

**Never:** `clasp deploy -d "..."` (missing `-i` flag creates orphan deployment)

**Cost of not knowing:** 6 wasted deployments (Dec 10, 2025)

---

## The #3 Rule: Hard Refresh After EVERY Deployment

**After deploying, ALWAYS say:**
```
"Deployed as @{NUMBER}. Please hard refresh (Cmd+Shift+R) and check console for version number."
```

**Never assume user will refresh. Service workers cache aggressively.**

**Cost of not knowing:** User sees v987 while you debug v1024

---

## The #4 Rule: Test ALL Affected Elements

**Before deploying CSS changes to shared classes:**

```bash
# Changed .view or .hidden? Test ALL these:
- fixture-view (Schedule)
- players-view (Players)
- insights-view (Stats)
- netball-ladder-view (Ladder)
- team-selector-view (Home)
- admin-view (Admin)
... (all 20 views)
```

**Cost of not knowing:** Fix one view, break 10 others

---

## Standard Diagnostic Template

**For ANY "element not showing" issue, run this FIRST:**

```javascript
function diagnose(id) {
  const el = document.getElementById(id);
  const computed = window.getComputedStyle(el);
  console.log(id, {
    // What we THINK (classes)
    hasHidden: el.classList.contains('hidden'),
    
    // What's ACTUALLY happening (computed)
    display: computed.display,  // ← THE TRUTH
    visibility: computed.visibility,
    
    // Dimensions
    offsetHeight: el.offsetHeight,  // 0 = not rendering
    scrollHeight: el.scrollHeight
  });
}

diagnose('fixture-view');
```

**This ONE diagnostic would have saved 12 versions on Dec 10, 2025.**

---

## CSS Specificity Quick Reference

**When two rules have equal specificity + both use `!important`, LAST in stylesheet wins:**

```css
/* Line 506 */
.hidden { display: none !important; }     /* Specificity: 10 */

/* Line 629 - WINS because it's later */
.view { display: block !important; }      /* Specificity: 10 */
```

**Solution: Higher specificity beats order**

```css
.view.hidden { display: none !important; }  /* Specificity: 20 - WINS */
```

**Specificity calculation:**
- `.view.hidden` = 2 classes = 20
- `.view` = 1 class = 10
- `#id .view` = 1 ID + 1 class = 110

---

## Pre-Implementation Checklist

**Before writing ANY code:**

- [ ] Confirmed deployment URL user is accessing?
- [ ] Checked computed styles, not just classes?
- [ ] Searched for CSS conflicts if adding `!important`?
- [ ] Will test ALL elements affected by change?
- [ ] Tested in browser DevTools first?

---

## Success Metrics

**Good session:**
- ✅ 1-3 deployments for the fix
- ✅ No features broken
- ✅ User confirmed fix works
- ✅ Computed styles checked in first diagnostic

**Bad session (what happened Dec 10):**
- ❌ 16 deployments
- ❌ All views broken for 5 versions
- ❌ 6 deployments to wrong URL
- ❌ Computed styles checked in version 12

---

## Required Reading

**Read these IN ORDER before starting work:**

1. **This file** (you're here) - 5 min
2. [`LESSONS_LEARNED.md`](./LESSONS_LEARNED.md) - Critical patterns - 15 min
3. [`DEVELOPMENT-PRINCIPLES.md`](./getting-started/DEVELOPMENT-PRINCIPLES.md) - Non-negotiables - 20 min
4. [`DEPLOYMENT_CHECKLIST.md`](./DEPLOYMENT_CHECKLIST.md) - Step-by-step deploy - 10 min

**For CSS changes specifically:**
5. [`CSS_BEST_PRACTICES.md`](./standards/CSS_BEST_PRACTICES.md) - Specificity rules - 15 min

**For debugging:**
6. [`DEBUGGING_STRATEGY.md`](./operations/DEBUGGING_STRATEGY.md) - Diagnostic patterns - 10 min

**Total: 75 minutes of reading to avoid 16 deployments and 3+ wasted hours**

---

## Common Failure Patterns

### Pattern 1: "Fix doesn't work" (User sees old version)
**Cause:** Deployed to wrong URL or user didn't hard refresh  
**Prevention:** Verify URL first, instruct hard refresh after EVERY deployment

### Pattern 2: Element has class but doesn't behave as expected
**Cause:** Didn't check computed styles, assumed class = behavior  
**Prevention:** Always check `window.getComputedStyle(element)`

### Pattern 3: Fixed one thing, broke multiple others
**Cause:** Changed shared class, only tested one element  
**Prevention:** Test ALL elements using the changed class

### Pattern 4: Many versions debugging CSS
**Cause:** Added `!important` without checking for conflicts  
**Prevention:** Search codebase for existing rules first

---

## The Meta-Lesson

**Documentation only works if you READ it.**

Every failed pattern above was documented BEFORE Dec 10, 2025. But it wasn't in a "read this FIRST" format.

**This file exists so you have NO EXCUSE to repeat these mistakes.**

If you're reading this, you have 75 minutes to invest that will save you 3+ hours of debugging.

**Make the investment.**

---

## Quick Links

- [Full Post-Mortem (Dec 10)](./POST_MORTEM_CSS_SPECIFICITY_2025_12_10.md)
- [Deployment Checklist](./DEPLOYMENT_CHECKLIST.md)
- [CSS Specificity Guide](./standards/CSS_BEST_PRACTICES.md#css-specificity--important-rules)
- [Debugging Strategy](./operations/DEBUGGING_STRATEGY.md)
- [All Documentation Index](./DOCUMENTATION_INDEX.md)
