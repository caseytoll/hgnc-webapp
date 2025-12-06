# Development Principles & Learnings
**Last Updated**: 2025-11-24  
**Purpose**: Living document reviewed before implementing ANY change

---

## 🔴 NON-NEGOTIABLES (User Has to Remind Me Repeatedly)

### 1. ALWAYS Use Stable Deployment URL
**Production ID**: `AKfycbw8nTMiBtx3SMw-s9cV3UhbTMqOwBH2aHEj1tswEQ2gb1uyiE9e2Ci4eHPqcpJ_gwo0ug`  
**Current Version**: @453 (v365.53)

**EVERY deployment must use**:
```bash
clasp push
clasp deploy -i AKfycbw8nTMiBtx3SMw-s9cV3UhbTMqOwBH2aHEj1tswEQ2gb1uyiE9e2Ci4eHPqcpJ_gwo0ug -d "v{X} - {description}"
```

**NEVER**:
- ❌ `clasp deploy` (creates new URL)
- ❌ `clasp deploy -d "description"` (creates new URL)
- ❌ Forget the `-i` flag

**Why this matters**: Users have bookmarks, links shared. Changing URL breaks everything.

**About @HEAD**: The @HEAD deployment (`AKfycbyzIhkw5F5HJm7x1W3rGSdQHZefDvB2-U9M04RzvuRh`) is read-only and auto-updates with every `clasp push`. While convenient for development, use the numbered deployment for production to maintain deployment control and rollback capability.

**Happened**: 
- v365.30 - forgot `-i` flag, created @402
- v365.51 - created @438-440 before remembering to use `-i`

### 2. Test in Browser BEFORE Deploying
**User has to remind me**: "Did you test this in DevTools first?"

**EVERY code change**:
1. Open browser DevTools console
2. Test the actual function/selector/regex
3. Verify it works with real data
4. THEN deploy

**Why this matters**: One browser test catches issues that take 10 deploys to debug.

### 3. Check ALL Files Where Feature Is Used
**User has to remind me**: "Did you check all the files?"

When implementing features that appear in multiple places:
- Search entire codebase (`grep_search`)
- Update ALL instances
- Don't assume "it's probably just in one file"

**Example**: Logo should appear in index.html AND js-navigation.html (team selector header)

### 4. Don't Assume - Ask for Data Samples
**User has to remind me**: "Check the actual file content first"

When working with:
- API responses
- File contents  
- Spreadsheet columns
- Any external data

**Do**: Ask "Can you show me a sample?" or use `read_file` to see actual content
**Don't**: Assume structure based on variable names

### 5. Update Version Number AND Changelog
**User might have to remind me**: "Update the changelog"

**Every deploy**:
1. Update version in Code.js (`template.appVersion`)
2. Update CHANGELOG.md with what changed
3. Deploy with version in description

**Don't**: Deploy first, update changelog later (easy to forget)

### 6. Read the Principles Doc BEFORE Starting Work
**User shouldn't have to say**: "Did you check the principles doc?"

At the start of EVERY session, EVERY feature request:
1. Open DEVELOPMENT-PRINCIPLES.md
2. Read the checklist
3. Check if similar work has been done before
4. Apply learnings

**This file only helps if I actually read it.**

---

## 🚨 PRE-IMPLEMENTATION CHECKLIST

Before writing ANY code, answer these:

- [ ] **Am I using the correct deployment command?** (See above, with `-i` flag)
- [ ] **Have I seen the actual data structure?** (Don't assume API shapes)
- [ ] **Is this the simplest solution?** (Fade vs 3D flip)
- [ ] **What happens if this fails?** (Add try-catch now, not later)
- [ ] **Does HTML validate?** (Check closing tags)
- [ ] **Can I test this locally first?** (Browser console, DevTools)

---

## ⚡ CRITICAL PATTERNS FROM 365 VERSIONS

### 1. DATA PERSISTENCE: Static-Until-Game Pattern
**Context**: This is a sports stats app. Data only changes when:
- New game is added/edited/deleted
- Team roster changes (rare)
- Season switches (rare)

**Current Reality**: Data is essentially **static between games** (weekly updates at most)

**Optimization Strategy**:
```javascript
// CACHE AGGRESSIVELY - data doesn't expire until mutation
// INVALIDATE EXPLICITLY - only recalculate when data changes

// ✅ GOOD: Calculate once, reuse forever
var lastGamesHash = null;
var cachedStats = null;

function getStats() {
  const currentHash = JSON.stringify(games.map(g => g.id + g.lastModified));
  if (currentHash === lastGamesHash && cachedStats) {
    return cachedStats; // Instant return, no recalculation
  }
  
  lastGamesHash = currentHash;
  cachedStats = calculateExpensiveStats();
  return cachedStats;
}

// ❌ BAD: Recalculate on every view switch
function showStatsView() {
  recalculateAllStats(); // Wasteful if games haven't changed
  renderStats();
}
```

**Invalidation Points** (only times we need to recalculate):
1. Game added/edited/deleted → `invalidateStatsCache()`
2. Player added/removed → `invalidatePlayerCache()`
3. Manual refresh button → User explicitly requests recalc
4. Season change → Full cache clear

**Implementation Checklist**:
- [ ] Hash game IDs + timestamps to detect changes
- [ ] Cache calculated stats in memory (survives view switches)
- [ ] Only recalculate on data mutation, not navigation
- [ ] Persist cache to IndexedDB (survives page refresh)
- [ ] Add cache hit/miss metrics to console

**Performance Impact**:
- Recalculation: 50-200ms (13 games, 9 players)
- Cache read: <1ms
- **Potential savings**: 95%+ of stat calculations eliminated

**Current Issues** (v365.54):
- ✅ Stats cached with hash-based invalidation
- ✅ IndexedDB persistence implemented
- ✅ Cache metrics tracking active
- ⚠️ 100+ forEach loops remain (low priority - only run on cache miss)
- ⚠️ 80+ getElementById calls remain (already cached in most hot paths)
- ✅ Critical path optimized (view switching, stats calculation)

**Remaining Optimization Opportunities** (v365.54):
1. **Insights Detail Functions**: 15+ forEach loops in detail views (lines 689-1100 js-render.html)
   - Only executed when drilling into details (not critical path)
   - Would save 5-10ms on detail view loads
   - Priority: LOW (detail views are infrequent, data already cached)

2. **Game Iteration Loops**: Core logic forEach (lines 319-602 js-core-logic.html)
   - Only run on cache miss (95% eliminated by caching)
   - Converting would save 10-20ms during recalculation
   - Priority: LOW (already cached, runs rarely)

3. **Remaining getElementById Calls**: ~80 uncached calls
   - Most in infrequent code paths (admin, setup, detail views)
   - Critical paths already cached (view switching, navigation)
   - Priority: LOW (not on hot path)

4. **querySelectorAll in Event Handlers**: ~10 instances
   - Event-driven, not on render path
   - User-initiated actions (clicks, scrolls)
   - Priority: LOW (not performance-critical)

**Performance Impact Analysis**:
- ✅ **Critical path**: 95% optimized (stats caching + view element caching)
- ✅ **Initial load**: <1ms with IndexedDB cache
- ✅ **View switching**: <5ms (cached elements)
- ✅ **Stats calculation**: Skipped 95% of time (hash check)
- ⏱️ **Detail views**: 10-30ms (acceptable for drill-down)
- ⏱️ **Recalculation**: 50-200ms (only on data change)

**Optimization Decision Matrix**:
| Optimization | Savings | Frequency | Effort | Priority |
|--------------|---------|-----------|--------|----------|
| Stats caching | 95% | Every view | High | ✅ DONE |
| View element cache | 85% | Every switch | Medium | ✅ DONE |
| IndexedDB persist | Instant reload | Page refresh | High | ✅ DONE |
| Detail forEach loops | 5-10ms | Rare | Medium | LOW |
| Remaining getElementById | 1-2ms | Rare | Low | LOW |
| Core logic forEach | 10-20ms | 5% of loads | High | LOW |

**Recommendation**: Current optimization is complete for critical paths. Further work shows diminishing returns (<10ms savings on infrequent operations). Focus on feature development unless performance issues reported.

**Completed Optimizations (v365.54)**:
1. ✅ Hash-based change detection (games + players)
2. ✅ In-memory stats cache with instant restore
3. ✅ IndexedDB persistence (survives refresh)
4. ✅ Smart invalidation on data mutations only
5. ✅ Cache metrics logging (hits/misses/hit rate)
6. ✅ View element caching (15+ elements)
7. ✅ Form input caching (6 fields)
8. ✅ requestAnimationFrame rendering (schedule)
9. ✅ Score/date memoization
10. ✅ Null-safe DOM access throughout

### 2. DEBUGGING: Front-Load, Don't Iterate
**Bad**: 20 deploys adding one log statement each (v274-v290)  
**Good**: One deploy with comprehensive logging + error handling

```javascript
// ALWAYS include from the start:
function anyFunction() {
  try {
    console.log('Starting anyFunction with:', arguments);
    const result = /* work */;
    console.log('anyFunction result:', result);
    return result;
  } catch(e) {
    console.error('anyFunction failed:', e);
    return fallbackValue; // Never crash silently
  }
}
```

### 2. CSS: Parent Chain First
**Learning**: v290 blank screen = unclosed div, v260-267 invisible = parent `display:none`

**Before adding CSS diagnostics, check**:
1. HTML validates (closing tags)
2. Parent elements visible
3. Inline vs external style conflicts

```javascript
// Add this helper at project start:
function debugVisibility(selector) {
  let el = document.querySelector(selector);
  const chain = [];
  while (el) {
    chain.push({
      tag: el.tagName,
      display: getComputedStyle(el).display,
      visibility: getComputedStyle(el).visibility,
      dimensions: el.getBoundingClientRect()
    });
    el = el.parentElement;
  }
  console.table(chain);
}
```

### 3. DATA: Validate Shapes at Boundaries
**Learning**: v339 only read columns A-F, missed G-H with critical URLs

**Pattern**:
```javascript
// At every data boundary (API → cache → display):
function loadData() {
  const raw = fetchFromSource();
  
  // Validate immediately
  const required = ['id', 'name', 'ladderApi', 'resultsApi'];
  const missing = required.filter(k => !raw[k]);
  if (missing.length) {
    console.error('Missing required fields:', missing, raw);
    return null;
  }
  
  console.log('Validated data:', raw);
  return raw;
}
```

### 4. REGEX: Test Against Real Data
**Learning**: v365.33 - `/data:image\/[^"]+/` failed on 93KB base64 string

**Pattern**:
```javascript
// In browser console BEFORE deploying:
const realSample = "data:image/jpeg;base64,/9j/4gv4S...{actual data}...";
const pattern = /data:image[^\s]*/;
console.log('Match:', realSample.match(pattern)); // Verify full capture
```

### 5. DEPLOYMENTS: Small & Tagged
**Learning**: v365.30 created new URL by forgetting `-i` flag, 15 deployments accumulated

**Rules**:
- ✅ Production: `clasp deploy -i AKfycbw8nTMiBtx3SMw-s9cV3UhbTMqOwBH2aHEj1tswEQ2gb1uyiE9e2Ci4eHPqcpJ_gwo0ug -d "v{X} - {description}"`
- ✅ One feature per deploy
- ✅ Test in DevTools before deploying
- ❌ Never batch unrelated changes
- 🗑️ Clean up test deployments weekly

### 6. COMPLEX ALGORITHMS: Paper First
**Learning**: v303-v327 lineup optimization took 24 versions

**Before coding**:
1. Write priority hierarchy on paper
2. Define hard constraints (must-play) vs soft bonuses (prefer)
3. Model edge cases
4. Start with simplest working version

**Example** (lineup rotation):
```
HARD CONSTRAINTS (enforce with logic):
- 7 playing, 2 off per quarter
- Player X plays all 4 quarters

SOFT PREFERENCES (scoring bonuses):
- Favorite position: +300
- Same bib as last quarter: +100
- Balanced court time: penalty based on diff

Start with constraints, add bonuses incrementally.
```

### 7. MOBILE-FIRST DESIGN
**Learning**: v365.30 iPhone navigation redesign successful - 56px touch targets, text-only

**Rules**:
- Design for 375px width first
- Touch targets minimum 48px (prefer 56px)
- Remove decoration (emojis) for clarity
- Desktop expansion is easy, mobile constraints are hard

### 8. FILE EXTENSIONS MATTER
**Learning**: v365.29 - "base image code.js" failed clasp validation, .html worked

**Rules**:
- `.js` = executable code (Apps Script validates syntax)
- `.html` = templates/data (no validation)
- Use correct extension for content type

### 9. ERROR HANDLING: Default, Not Optional
**Learning**: v365.33 added try-catch after logo failed, should have been there from start

**Template**:
```javascript
function getLogoDataUrl() {
  try {
    const content = HtmlService.createHtmlOutputFromFile('base image code').getContent();
    const match = content.match(/data:image[^\s]*/);
    if (match) return match[0];
    
    console.warn('Logo regex failed, using fallback');
    return '#'; // Always have fallback
  } catch(e) {
    console.error('Logo load error:', e);
    return '#';
  }
}
```

### 10. FEATURE REMOVAL > FEATURE ADDITION
**Learning**: v363, v365.31 - removing debug button & RAW/DAP toggle improved UX

**Practice**:
- Quarterly feature audit: "Is anyone using this?"
- Remove before adding new features
- Simplicity compounds over time

---

## 📋 WORKFLOW PROCESS

### Every Feature Request:

1. **Understand** (5 min)
   - What's the actual data? (Ask to see samples)
   - What's the simplest solution?
   - What are the failure modes?

2. **Plan** (5 min)
   - Write approach in comments/pseudocode
   - Complex logic? Sketch on paper first
   - Identify validation points

3. **Implement** (30 min)
   - Add error handling immediately
   - Log inputs/outputs
   - Test regex/selectors in console first
   - Validate HTML before deploying

4. **Test** (10 min)
   - Browser DevTools (don't skip)
   - Check parent element visibility
   - Verify data shapes match expectations

5. **Deploy** (2 min)
   - Use correct deployment ID
   - One feature only
   - Update changelog

6. **Verify** (5 min)
   - Test in production
   - Check console for errors
   - Confirm feature works as expected

**Total**: ~1 hour with validation beats 4 hours debugging across 20 deploys

---

## 🎯 SUCCESS METRICS

Track these to measure improvement:

- **Deploys per feature**: Target ≤3 (down from 10-20)
- **Time to first working version**: Target ≤1 hour
- **Production bugs**: Target 0 silent failures (all have try-catch)
- **Deployment cleanup**: Monthly review, keep only production + @HEAD

---

## 🔄 CONTINUOUS LEARNING

**After each feature:**
1. Did it take >5 deploys? What would have prevented iterations?
2. Add new pattern to this doc (date it)
3. Monthly: Review changelog, extract new learnings

**Update this file when**:
- Same mistake made twice
- New debugging pattern discovered
- Tool/platform limitation found

---

## 📚 REFERENCE ANTI-PATTERNS

### The "Just One More Deploy" Trap
Symptoms: Making small tweaks without understanding root cause  
Fix: Stop. Read code. Test in DevTools. Then deploy once.

### The "It Should Work" Assumption
Symptoms: Not checking actual API responses, assuming data shapes  
Fix: Always log and inspect real data before writing code.

### The "While I'm In There" Feature Creep
Symptoms: Batching unrelated changes in one deploy  
Fix: One feature per deploy. Other ideas go in backlog.

### The "I'll Add Error Handling Later"
Symptoms: Functions that crash silently, no try-catch  
Fix: Template every function with try-catch from the start.

---

## 💡 QUICK WINS

Things that always help:
- ✅ `console.table()` for arrays/objects
- ✅ `debugger;` statement in browser
- ✅ Validate HTML with online checker before deploying
- ✅ Test regex at regex101.com with real samples
- ✅ Check MDN docs for API compatibility
- ✅ Ask "What's the simplest version that could work?"

---

**Remember**: The goal is not to avoid mistakes, but to learn faster. Update this doc every time you discover a better way.
