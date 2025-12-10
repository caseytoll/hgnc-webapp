# Debugging Strategy - Layout & Display Issues

**Last Updated:** December 10, 2025 (Added: CSS Specificity Diagnostics)

---

## ⚠️ CRITICAL: Always Check Computed Styles First

**Rule:** Before assuming an element's display state based on its CSS classes, ALWAYS check the computed styles.

### Why This Matters

CSS cascade and specificity can cause an element to have unexpected styles even when it has the "correct" classes:

```javascript
// ❌ WRONG - Assumes class = behavior
if (element.classList.contains('hidden')) {
  console.log('Element is hidden');  // MAY BE FALSE!
}

// ✅ RIGHT - Verify actual computed style
const computed = window.getComputedStyle(element);
console.log('Element computed display:', computed.display);
if (computed.display === 'none') {
  console.log('Element is actually hidden');
}
```

### Standard Diagnostic Template

For ANY "element not showing" or "element showing when it shouldn't" issue:

```javascript
function diagnoseElementDisplay(elementId) {
  const el = document.getElementById(elementId);
  if (!el) {
    console.error('[DIAG] Element not found:', elementId);
    return;
  }
  
  const computed = window.getComputedStyle(el);
  
  console.log('[DIAG]', elementId, ':', {
    // Classes (what we THINK is happening)
    hasHiddenClass: el.classList.contains('hidden'),
    allClasses: Array.from(el.classList),
    
    // Computed styles (what's ACTUALLY happening)
    computedDisplay: computed.display,
    computedVisibility: computed.visibility,
    computedOpacity: computed.opacity,
    
    // Dimensions (actual rendered size)
    offsetHeight: el.offsetHeight,
    offsetWidth: el.offsetWidth,
    scrollHeight: el.scrollHeight,
    
    // Position
    offsetTop: el.offsetTop,
    offsetLeft: el.offsetLeft
  });
}

// Use it:
diagnoseElementDisplay('fixture-view');
```

### Real-World Example: CSS Specificity Override

**Scenario (Dec 10, 2025):** All hidden views were rendering visibly, taking 13,707px vertical space.

**What we saw:**
```javascript
element.classList.contains('hidden')  // true ✓
```

**What we missed (until v1023):**
```javascript
window.getComputedStyle(element).display  // "block" ❌
// Should have been "none"!
```

**Root cause:** `.view { display: block !important; }` came AFTER `.hidden { display: none !important; }` in stylesheet, so it won!

**Cost:** 12 versions debugging DOM structure when it was CSS cascade all along.

**Lesson:** Computed styles check should be in FIRST diagnostic, not version 12.

---

## Blank Insights Page - Historical Analysis

### Executive Summary (Historical)

**Root Cause:** The `.view` container (parent of insights dashboard) has `offsetHeight: 0` despite having valid CSS rules. This creates a circular dependency in CSS height calculation where:
1. Parent `.view` has `height: auto` → waits for child to determine size
2. Children have `height: 100%` → wait for parent to have height
3. Parent's `min-height: 670px` doesn't apply because auto height takes precedence
4. Result: entire chain collapses to 0 offsetHeight

**Why CSS Can't Solve Alone:** The `.view` element is at the bottom of a height chain (`body` → `main#main-content` → `.view`) where no ancestor has explicit height, so the auto-height cascade prevents min-height from working.

---

## What We've Tried (39 versions)

### ✅ Successful Fixes
- **v789-790**: Fixed control flow - `showView()` now properly removes `hidden` class
- **v811**: Added `overflow: visible !important` to prevent clipping
- **v813**: Added `min-height: 100vh` to dashboard container

### ❌ Attempted but Insufficient
- **v808**: `min-height: 100vh` on `.view` → computed correctly but offsetHeight still 0
- **v812**: `height: 100vh` on `.view` → broke other views (reverted)
- **v804-806**: Explicit pixel heights on containers → child height still 0
- **v810**: `overflow: visible` without !important → media query override still applied

### 🔍 Logged Issues Identified
- **CSS Computed vs Actual**: Min-height shows 670px in computed styles but offsetHeight = 0
- **Display Values Correct**: All elements have correct display (grid, block, flex)
- **Content in DOM**: All elements exist and populated with correct data
- **Parent Chain Zero**: Every element in hierarchy has offsetHeight = 0

---

## Comprehensive Fix Strategy (5 Approaches)

### **Approach 1: Force Parent Layout (HIGHEST PRIORITY)**
**Theory:** If we force `body` and `main#main-content` to have explicit height, it will cascade to `.view`

**Changes:**
- Add `height: 100vh` to `body`
- Add `height: 100%` to `main#main-content`
- Set `html { height: 100% }`
- Use `display: flex` on main to ensure children respect height

**Risk:** May affect other views (needs smoke test)

**Why It Might Work:** Google Apps Script iframes have limited viewport - forcing explicit heights ensures layout participation

---

### **Approach 2: JavaScript Fallback (MEDIUM PRIORITY)**
**Theory:** After render, manually set heights using JavaScript since CSS cascade is broken

**Changes:**
- After rendering dashboard content, measure `scrollHeight` of innermost child
- Propagate height upward: card → grid → dashboard → view
- Set explicit `height` on parent to match child scrollHeight

**Code Pattern:**
```javascript
// After renderNewInsightsDashboardContent completes
if (dashboardContainer) {
  const contentHeight = dashboardContainer.scrollHeight;
  dashboardContainer.style.height = contentHeight + 'px';
  
  const viewEl = dashboardContainer.closest('.view');
  if (viewEl) {
    viewEl.style.height = 'auto';
    viewEl.style.minHeight = viewEl.scrollHeight + 'px';
  }
}
```

**Why It Might Work:** Breaks circular dependency by providing measured values instead of relying on CSS cascade

---

### **Approach 3: Display Model Change (MEDIUM PRIORITY)**
**Theory:** Grid/Flex might be causing height issues - try different display model

**Changes:**
- Change `.view` from default block to `display: flex` or `display: grid`
- Set `flex-direction: column` if flex
- Add `flex: 1` or `flex-grow: 1`
- Ensure parent `main#main-content` is also flex container

**Why It Might Work:** Flex/Grid handle height calculation differently than block flow

---

### **Approach 4: Container Query / Containment (LOW PRIORITY)**
**Theory:** Browser containment properties might be affecting layout

**Changes:**
- Remove any `contain` properties that might be restricting layout
- Check for `contain: layout` or similar
- Add `contain: paint` if needed for performance (won't affect height)

**Why It Might Work:** Containment can disable size introspection

---

### **Approach 5: Media Query Override Cleanup (LOW PRIORITY)**
**Theory:** Media query at line 4495 might still have issues

**Changes:**
- Audit all media queries targeting `.view`
- Ensure no `height: auto !important` or `max-height: 0` rules
- Verify `overflow: visible !important` is working

---

## Diagnostic Logging Plan

Add comprehensive logging to identify exactly where the height calculation fails:

### Phase 1: Parent Chain Analysis
```javascript
// Log the entire parent chain up to body
let current = viewEl;
let depth = 0;
while (current && depth < 10) {
  console.log(`Depth ${depth}:`, {
    tagName: current.tagName,
    id: current.id,
    className: current.className,
    offsetHeight: current.offsetHeight,
    scrollHeight: current.scrollHeight,
    computedHeight: getComputedStyle(current).height,
    computedMinHeight: getComputedStyle(current).minHeight,
    computedMaxHeight: getComputedStyle(current).maxHeight,
    display: getComputedStyle(current).display,
  });
  current = current.parentElement;
  depth++;
}
```

### Phase 2: Intrinsic Size Analysis
```javascript
// Check if elements have intrinsic size when detached
const testElement = dashboardContainer.cloneNode(true);
document.body.appendChild(testElement);
console.log('Cloned element offsetHeight:', testElement.offsetHeight);
document.body.removeChild(testElement);
```

### Phase 3: Layout Recalculation Trigger
```javascript
// Force browser reflow/repaint
viewEl.style.display = 'none';
void viewEl.offsetHeight; // Force reflow
viewEl.style.display = 'block';
```

---

## Implementation Order

1. **v815**: Add comprehensive parent chain diagnostics to js-render.html
2. **v816**: Add intrinsic size clone test
3. **v817**: Try Approach 1 (force body/main height) with smoke test
4. **v818**: If v817 fails, revert and try Approach 2 (JavaScript fallback)
5. **v819**: If v818 fails, try Approach 3 (display model change)

---

## Success Metrics

- ✅ Dashboard offsetHeight > 0 (measured in offsetHeight log, not computed style)
- ✅ Cards visible in viewport
- ✅ Cards have measured height (not 0)
- ✅ Flip animation works
- ✅ All other views still render correctly (smoke test passes)
- ✅ No console errors related to height/layout

---

## Critical Observations

1. **Computed Styles Don't Match offsetHeight**: This is the key issue - CSS rules exist but aren't participating in layout
2. **All Children Zero**: Not just direct children, entire chain is zero - parent problem
3. **Display Values Correct**: Rules ARE being applied, just not for height
4. **Content is in DOM**: It's not a rendering issue, it's a height/layout calculation issue

This pattern suggests:
- Elements might be in `display: none` state during height calculation
- Parent might not be participating in document layout flow
- Circular dependency in height calculation (parent needs child size, child needs parent size)
- Viewport/container too narrow causing height collapse
