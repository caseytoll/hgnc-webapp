# Cumulative Lessons Learned

**Purpose:** Living document capturing key learnings from development sessions to prevent repeating mistakes and build on successes.

**Last Updated:** December 10, 2025 (Added: CSS specificity conflicts, Deployment URL verification, Computed styles diagnostic)

---

## How to Use This Document

### For Developers
- Review before starting CSS/layout work
- Check before deploying
- Reference when debugging similar issues

### For AI Assistants
- Scan this before suggesting solutions
- Extract patterns to apply to new problems
- Add new learnings after each session

### Maintenance
- Append new learnings chronologically
- Group related learnings under same heading
- Link to detailed documentation for deep dives

---

## CSS & Layout

### CSS Specificity Conflicts Override .hidden Class (2025-12-10) ⚠️ CRITICAL

**Lesson:** When two CSS rules have equal specificity and both use `!important`, the rule that appears LAST in the stylesheet wins, regardless of semantic intent.

**Context:** All "hidden" views were rendering visibly with `display: block`, taking 13,707px of vertical space, pushing content far down the page. The `.view` class had `display: block !important` at line 629, which came AFTER `.hidden { display: none !important; }` at line 506.

**Root Cause:**
```css
/* Line 506 - Defined first */
.hidden {
  display: none !important;  /* Equal specificity: 1 class */
}

/* Line 629 - Defined LATER (123 lines after) */
.view {
  display: block !important;  /* Equal specificity: 1 class */
  /* ↑ WINS because it comes last in cascade */
}
```

**Why It Was Missed:**
- Assumed `.hidden` class meant element had `display: none`
- Checked if element had `.hidden` class (it did)
- Didn't check COMPUTED styles until v1023 (12 versions later)
- Diagnostic logging focused on DOM structure, not CSS cascade

**The Fix:**
```css
/* Higher specificity: 2 classes vs 1 class */
.view.hidden {
  display: none !important;  /* Overrides .view because more specific */
}
```

**Prevention Rules:**
1. **ALWAYS check computed styles in diagnostics**, not just classes:
   ```javascript
   const computed = window.getComputedStyle(element);
   console.log('Has .hidden class:', element.classList.contains('hidden'));
   console.log('Computed display:', computed.display);  // ← CRITICAL CHECK
   ```

2. **Before adding `!important`, check for conflicts:**
   - Search codebase for existing rules on same elements
   - Check if target element has multiple classes that might conflict
   - Verify no other rules with `!important` on same property

3. **Prefer specificity over `!important`:**
   - `.view.hidden` (2 classes) beats `.view` (1 class)
   - `.view.hidden` (2 classes) beats `.hidden` (1 class)
   - Don't use `!important` unless absolutely necessary

4. **Test ALL elements affected by CSS changes:**
   - Changed `.view` class → test all 20 views, not just one
   - Check both visible and hidden states
   - Verify no layout shifts in unrelated views

**Cost:** 13 versions (v1011-v1024), ~3 hours, 6 wasted deployments to wrong URL

**Detailed Doc:** [`docs/POST_MORTEM_CSS_SPECIFICITY_2025_12_10.md`](./POST_MORTEM_CSS_SPECIFICITY_2025_12_10.md)

**Official references (read before CSS changes):**
- Google Apps Script HTML best practices (cache/static assets): https://developers.google.com/apps-script/guides/html/best-practices#cache_static_content
- Apps Script HTML limits (50KB compiled output): https://developers.google.com/apps-script/guides/html/limits
- CSS cascade refresher (MDN): https://developer.mozilla.org/en-US/docs/Web/CSS/Cascade

---

### Flexbox Alignment (2025-12-08)

**Lesson:** When content needs to be consistently left-aligned regardless of the width of elements to its right, combine the content into a single element with a fixed-width prefix, rather than separating into multiple flex children.

**Context:** Schedule opponent names appeared at different positions depending on whether the row showed a score (narrow) or "ABANDONED" badge (wide).

**Anti-Pattern:**
```html
<div class="container">
  <span class="prefix">R15:</span>
  <span class="spacer"></span>  <!-- ⚠️ Causes shifting -->
  <span class="content">vs Opponent</span>
  <span class="spacer"></span>
  <span class="right">8-6</span>
</div>
```
```css
.spacer { flex: 1; }  /* Expands based on available space */
```

**Correct Pattern:**
```html
<div class="container">
  <span class="content-line">
    <span class="prefix">R15:</span> vs Opponent
  </span>
  <span class="spacer"></span>
  <span class="right">8-6</span>
</div>
```
```css
.prefix { 
  display: inline-block; 
  width: 2.5em;  /* Fixed width */
}
.spacer { flex: 1; }  /* After content, not between */
```

**Impact:** Content position is fixed at 2.5em from left, regardless of right element width.

**Detailed Doc:** [`docs/standards/CSS_BEST_PRACTICES.md`](./standards/CSS_BEST_PRACTICES.md#flexbox-alignment-patterns)

---

### Mobile-Desktop Consistency (2025-12-08)

**Lesson:** Desktop and mobile CSS must use the same layout strategy, only adjusting sizing/spacing, not structural behavior.

**Context:** Fixed alignment on desktop but broke on mobile because media query used different flexbox approach.

**Anti-Pattern:**
```css
/* Desktop */
.spacer { flex: 1; }

/* Mobile - Different behavior! */
@media (max-width: 480px) {
  .spacer { flex: 0 0 auto; min-width: 4px; }
}
```

**Correct Pattern:**
```css
/* Desktop */
.spacer { flex: 1; min-width: 8px; }
.element { width: 2.5em; }

/* Mobile - Same strategy, adjusted sizing */
@media (max-width: 480px) {
  .spacer { flex: 1; min-width: 8px; }  /* Same flex behavior */
  .element { width: 2.5em; font-size: 0.85em; }  /* Smaller font */
}
```

**Testing Checklist:**
- [ ] Test on actual mobile device, not just browser resize
- [ ] Hard refresh to clear cache
- [ ] Compare side-by-side with desktop
- [ ] Test with different content widths

**Detailed Doc:** [`docs/standards/CSS_BEST_PRACTICES.md`](./standards/CSS_BEST_PRACTICES.md#mobile-first-development)

---

## Deployment & Caching

### Verify Deployment URL BEFORE Debugging (2025-12-10) ⚠️ CRITICAL

**Lesson:** Always confirm which deployment URL the user is accessing in the FIRST message, before making any code changes or deployments.

**Context:** Agent deployed 6 versions (v1012-v1017) to numbered deployments (@1012, @1013, etc.) while user accessed stable production URL which wasn't being updated. User repeatedly reported "no changes" because they never saw the deployments.

**Two Deployment Types:**
1. **Numbered deployments** (e.g., @1012): Created by `clasp deploy` without `-i` flag
   - Each creates a new URL: `AKfycby...` (different from production)
   - User must have this specific URL to see it
   - Creates "orphan" deployments if user isn't accessing them

2. **Stable deployment** (production): Updated by `clasp deploy -i <URL>`
   - Always same URL: `AKfycbw8nTMiBtx3SMw-s9cV3UhbTMqOwBH2aHEj1tswEQ2gb1uyiE9e2Ci4eHPqcpJ_gwo0ug`
   - User bookmarks this URL
   - Must use `-i` flag to update it

**Required First Question:**
```
Agent: "What URL are you using to access the app?"
User: "https://script.google.com/macros/s/AKfycbw8nTMiBtx3SMw.../exec"
Agent: "That's the stable production URL. I'll use -i flag for all deployments."
```

**Correct Deployment Command:**
```bash
# ALWAYS use this for production:
clasp deploy -i AKfycbw8nTMiBtx3SMw-s9cV3UhbTMqOwBH2aHEj1tswEQ2gb1uyiE9e2Ci4eHPqcpJ_gwo0ug -d "v1024 - Description"

# NEVER do this (creates orphan numbered deployment):
clasp deploy -d "Description"  # ❌ Missing -i flag
```

**Verification After Deployment:**
```
Agent: "Deployed as @1024. Please hard refresh (Cmd+Shift+R) and check console for version number."
User: [provides console output showing v1024]
Agent: "Confirmed! Now testing the fix..."
```

**Cost:** 6 wasted deployments, user frustration, false "fix didn't work" reports

**Detailed Doc:** [`docs/POST_MORTEM_CSS_SPECIFICITY_2025_12_10.md`](./POST_MORTEM_CSS_SPECIFICITY_2025_12_10.md#issue-3-deployment-url-confusion-v1011-v1016)

---

### Cache Busting is Critical (2025-12-08)

**Lesson:** Always increment `appVersion` in `Code.js` after CSS/JS changes. Without it, clients won't see updates even after successful deployment.

**Context:** Multiple deployments appeared not to work because `appVersion` wasn't updated, causing browsers to serve cached CSS.

**Symptoms:**
- "The fix didn't work" when code is correct
- Old styles visible despite new deployment
- Inconsistent behavior between users

**Required Workflow:**
```bash
# 1. Make CSS/JS changes
# 2. Update appVersion in Code.js
template.appVersion = '913';  # Increment

# 3. Commit, push, deploy
git add -A && git commit -m "..." && clasp push && clasp deploy ...
```

**Verification:**
- Check `window.appVersion` in browser console
- Should match latest deployment version

**Detailed Doc:** [`docs/standards/CSS_BEST_PRACTICES.md`](./standards/CSS_BEST_PRACTICES.md#cache-busting-strategy)

---

### Google Apps Script Version Limit (2025-12-08)

**Lesson:** Google Apps Script has a 200-version limit. When reached, old versions must be manually cleared from the GAS dashboard before new deployments can proceed.

**Context:** Hit version limit during rapid iteration (v903-918 in single session).

**Symptoms:**
```
Cannot create more versions: Script has reached the limit of 200 versions
```

**Resolution:**
1. Open Google Apps Script dashboard
2. Go to Deployments → Versions
3. Manually delete old versions (no CLI command available)
4. Resume deployments

**Prevention:**
- Batch related changes before deploying
- Use feature branches for experimental work
- Periodically clean up old versions (monthly)

---

## Debugging

### Diagnostic Logging for Visual Issues (2025-12-08)

**Lesson:** When visual alignment looks wrong, add computed style logging to identify root cause rather than guessing at CSS fixes.

**Pattern:**
```javascript
setTimeout(() => {
  const element = document.querySelector('.problematic');
  const styles = window.getComputedStyle(element);
  console.log('🎨 Styles:', {
    width: styles.width,
    flexGrow: styles.flexGrow,
    flexShrink: styles.flexShrink,
    position: element.offsetLeft + 'px from left'
  });
}, 100);  // Delay to ensure render complete
```

**When to Use:**
- Content appears at wrong position
- Alignment varies unexpectedly
- "It looks different on mobile"

**What to Log:**
- Element dimensions (`width`, `height`)
- Flex properties (`flexGrow`, `flexShrink`, `flex`)
- Position (`offsetLeft`, `offsetTop`)
- Parent container properties

**Detailed Doc:** [`docs/operations/DEBUGGING_STRATEGY.md`](./operations/DEBUGGING_STRATEGY.md)

---

### Incremental Isn't Always Best (2025-12-08)

**Lesson:** Sometimes it's faster to restructure the HTML/CSS approach completely rather than layering fix upon fix on a flawed foundation.

**Context:** Tried 10+ incremental CSS tweaks (v903-v912) before restructuring HTML to combine elements, which fixed it immediately (v913).

**Red Flags for Restructuring:**
- More than 3 attempts at fixing same issue
- Fixes work on desktop but break mobile (or vice versa)
- CSS specificity wars (`!important` cascades)
- Unclear why something should work in theory but doesn't

**When to Restructure:**
- HTML structure fights against desired layout
- CSS has too many overrides/exceptions
- Solution requires media query gymnastics

---

## Documentation

### Session Summaries vs Living Docs (2025-12-08)

**Lesson:** Session summaries are point-in-time snapshots. Extract learnings to living documents, then archive the summaries.

**Workflow:**
```
Session Work → Session Summary (dated) → Extract Lessons → Update Living Docs → Archive Summary
```

**Example:**
1. Create `postmortems/SESSION_2025_12_08.md` during work
2. Extract key learnings to `LESSONS_LEARNED.md` (this file)
3. Update relevant living docs (e.g., `CSS_BEST_PRACTICES.md`)
4. After 30 days, move session summary to `archive/`

**Living Documents (Never Archive):**
- `LESSONS_LEARNED.md` (this file)
- `CSS_BEST_PRACTICES.md`
- `DEVELOPMENT-PRINCIPLES.md`
- `TESTING_README.md`

**Session Snapshots (Archive After 30 Days):**
- `SESSION_YYYY_MM_DD.md`
- `DEPLOYMENT_READY.md` (dated)
- Implementation reports

---

## Process & Workflow

### Git Commit Messages During Iteration (2025-12-08)

**Lesson:** During rapid iteration with many similar commits, include version numbers in commit messages for traceability.

**Good Pattern:**
```
Fix schedule alignment: change spacer from flex:1 to fixed width (8px) on desktop (v906)
Fix mobile alignment: match desktop with 40px round, flex:1 spacer (v911)
Restructure line2: combine round+opponent with fixed-width round (2.5em) (v913)
```

**Why:**
- Easy to map Git history to deployed versions
- Clear which attempt each commit represents
- Helps when reviewing what didn't work

---

## Future Learnings

*This section will grow as we encounter and solve new challenges.*

### Template for New Lessons

```markdown
### [Lesson Title] (YYYY-MM-DD)

**Lesson:** One sentence capturing the key insight.

**Context:** Brief description of the situation that led to this learning.

**Anti-Pattern (if applicable):**
[Code/approach that doesn't work]

**Correct Pattern:**
[Code/approach that does work]

**Impact:** What changes after applying this lesson?

**Detailed Doc:** Link to deeper dive if available
```

---

## Meta: About This Document

### How to Add a Learning

1. **During Development:** Note key insights in session summary
2. **After Session:** Extract 1-3 most valuable lessons
3. **Add to This Doc:** Use template above
4. **Link to Details:** Create/update detailed doc if complex
5. **Commit:** Include in session's final commit

### What Makes a Good Learning

✅ **Include:**
- Lessons that prevent repeating mistakes
- Patterns that speed up future work
- Insights that weren't obvious beforehand
- Clear anti-patterns with correct alternatives

❌ **Don't Include:**
- Generic advice found in basic tutorials
- One-time issues unlikely to recur
- Tool-specific bugs (unless pattern applies broadly)
- Incomplete lessons (wait until fully understood)

### Review Schedule

- **After each session:** Add new learnings
- **Monthly:** Review and consolidate similar learnings
- **Quarterly:** Archive obsolete learnings (technology/process changes)

---

## Index by Category

Quick reference to find learnings by topic:

- **CSS & Layout:** Flexbox alignment, Mobile-desktop consistency
- **Deployment:** Cache busting, Version limits
- **Debugging:** Diagnostic logging, When to restructure
- **Documentation:** Session summaries vs living docs
- **Process:** Commit messages during iteration

---

**Remember:** This document should grow with every session. If you learned something valuable today, add it here!

---

## ADDENDUM: Session Dec 9, 2025 - Lineup Analytics (v943)

### 50KB Compiled Output Limit is a HARD Constraint

The ~50KB limit on `HtmlService.createTemplateFromFile()` applies to the FINAL compiled output AFTER all `<?!= include() ?>` directives are merged. This is an **architectural constraint**, not just a size optimization issue.

**What Failed:**
- v926-v932: CSS visibility fixes to "show" truncated views
- v935: Script extraction to separate includes (still included heavy files)
- v940: Multi-page without removing includes (414KB total, still truncated)

**What Worked:**
- v943: Multi-page routing + minimal includes + server-side calculation
  - lineup.html: 7KB HTML + 6KB styles + 5KB inline render = 18KB total ✓

**Rule:** When hitting 50KB limit, restructure architecture:
1. Split features into separate pages (`doGet(e.parameter.page)`)
2. Move calculations to server-side Code.js
3. Send minimal client-side JavaScript
4. Only include essential files (styles, small utils)

---

### Browser Caching Defeats Deployments

**Problem:** v943 deployed but browser served v932 with different function names.

**Root Causes:**
- Google Apps Script creates unique URL per deployment
- Redeploying to same ID doesn't invalidate browser cache
- Function name changes cause confusion (renderLineupDefensiveUnits vs renderDefensiveUnits)

**Solutions:**
- New features: `clasp deploy` (new URL)
- Bug fixes: Bump `appVersion` in Code.js (line 67) + `clasp deploy -i <ORIGINAL_ID>`
- User troubleshooting: Hard refresh Cmd+Shift+R or incognito window

---

### Single-Page App Routing is Complex with Multiple HTML Pages

**Problem:** Back button used `?view=insights` but app only recognizes `#insights-view` hash routing.

**Root Cause:** Mixed routing approaches between pages.

**Solution:** Use hash routing consistently for internal navigation:
```javascript
// Back button should use:
window.location.href = window.APP_URL + '#insights-view'

// NOT query params:
window.location.href = window.APP_URL + '?view=insights'  // ✗ Doesn't work
```

Also: Store team state in localStorage before navigating away, restore on return.

---

### Always Inspect Data Structure Before Writing Calculations

**Problem:** Built lineup stat calculation functions without seeing actual game data. Functions returned empty `{}`. Couldn't diagnose: missing data? Structure mismatch? Code bug?

**Solution:**
1. Export real data first: `console.log(JSON.stringify(window.games[0], null, 2))`
2. Verify structure matches expectations (game.lineup, quarter.positions, etc.)
3. Add validation layer with helpful error messages
4. Add logging at each calculation step
5. Test with actual data, not assumptions

**Result:** Can immediately distinguish between data issues vs code bugs.

---

### Good Logging Format Speeds Debugging by 10x

**Good:** `[FunctionName] Action: value1, value2`
Example: `[getLineupStats] Processing 15 games, found 3 with lineup data`

**Bad:** `Loading... Error undefined`

Good format lets you grep console and immediately understand context and flow.

---

### Lessons for Next Session

**Known Issues to Fix (v944):**
1. Back button: Change to `#insights-view` hash routing (quick 1-minute fix)
2. Empty stats: Add logging to getLineupStats() to diagnose data structure
3. Navigation: Verify hash routing works and state persists

**Documentation Created:**
- docs/LINEUP_ANALYTICS_BUGS_v943.md - Full task list and issue analysis
- docs/SESSION_LEARNINGS_Dec9_2025.md - Detailed session report with statistics
- docs/QUICK_FIX_GUIDE.md - Quick reference for common issues

**Files to Review:**
- Code.js lines 1342-1453 (server-side calculation functions)
- lineup.html lines 1-328 (lightweight client-side page)
- Verify game data structure includes lineup property

