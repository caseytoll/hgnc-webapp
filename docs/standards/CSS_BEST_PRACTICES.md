# CSS Best Practices

This document captures key learnings and patterns for maintaining consistent, mobile-first CSS in the HGNC webapp.

## Table of Contents
- [CSS Specificity & !important Rules](#css-specificity--important-rules)
- [Flexbox Alignment Patterns](#flexbox-alignment-patterns)
- [Mobile-First Development](#mobile-first-development)
- [Cache Busting Strategy](#cache-busting-strategy)
- [Debugging CSS Issues](#debugging-css-issues)

---

## CSS Specificity & !important Rules

### Understanding the Cascade

**Critical Rule:** When two CSS rules have equal specificity and both use `!important`, the rule that appears LAST in the stylesheet wins.

**Example of the problem:**
```css
/* styles.html line 506 */
.hidden {
  display: none !important;  /* Specificity: 0,0,1,0 (1 class) */
}

/* styles.html line 629 (123 lines later) */
.view {
  display: block !important;  /* Specificity: 0,0,1,0 (1 class) */
  /* ↑ WINS because same specificity but defined later */
}
```

**Result:** An element with both classes `<div class="view hidden">` will have `display: block` (NOT hidden!).

### Specificity Hierarchy

```
Highest  →  Inline styles: style="..."
         →  ID selectors: #id
         →  Class selectors: .class
         →  Element selectors: div
Lowest   →  Order in stylesheet (last wins if equal)
```

**Calculating specificity:**
- `.view.hidden` = 0,0,2,0 (2 classes) beats `.view` = 0,0,1,0 (1 class)
- `.view.hidden` = 0,0,2,0 (2 classes) beats `.hidden` = 0,0,1,0 (1 class)
- `#main .view` = 0,1,1,0 (1 ID + 1 class) beats `.view.hidden` = 0,0,2,0

### !important Anti-Patterns

**❌ DON'T: Use !important to fix specific view issues globally**
```css
/* Trying to fix one view, breaks all views */
.view:not(.hidden) {
  display: block !important;  /* Forces ALL visible views to block */
  width: 100%;                /* Overrides flex/grid layouts */
}
```

**✅ DO: Use higher specificity instead of !important**
```css
/* Target specific view with higher specificity */
.view.insights-view {
  display: grid;  /* No !important needed */
}
```

### Before Adding !important

**Required checklist:**

1. **Search for conflicts:**
   ```bash
   grep -n "display.*!important" src/styles.html
   grep -n ".view" src/styles.html
   ```

2. **Check computed styles:**
   ```javascript
   const el = document.querySelector('.view.hidden');
   console.log('Computed display:', window.getComputedStyle(el).display);
   // Should be "none", but might be "block" due to conflict!
   ```

3. **Try higher specificity first:**
   ```css
   /* Instead of: */
   .hidden { display: none !important; }
   
   /* Try: */
   .view.hidden { display: none; }  /* Higher specificity, no !important */
   ```

4. **Test ALL affected elements:**
   - If changing `.view`, test all 20+ view elements
   - Check both visible and hidden states
   - Verify no layout shifts

### The .view.hidden Pattern (Learned Dec 10, 2025)

**Problem:** `.view { display: block !important; }` overrode `.hidden { display: none !important; }`

**Solution:**
```css
.hidden {
  display: none !important;
  visibility: hidden !important;
}

/* Higher specificity wins */
.view.hidden {
  display: none !important;  /* 2 classes beats 1 class */
  visibility: hidden !important;
}

.view {
  display: block !important;  /* Only affects non-hidden views now */
}
```

**Why it works:** `.view.hidden` (2 classes) has higher specificity than `.view` (1 class).

**Cost of not knowing this:** 13 versions, 3 hours, 13,707px of invisible vertical space.

---

## Flexbox Alignment Patterns

### Left-Aligned Content with Variable-Width Right Elements

**Scenario**: You need content to be consistently left-aligned regardless of the width of elements to its right (e.g., scores, badges, status indicators).

**❌ Anti-Pattern**: Separate elements with spacer between them

```html
<!-- DON'T DO THIS -->
<div class="container">
  <span class="prefix">R15:</span>
  <span class="spacer"></span>  <!-- ⚠️ Spacer between content -->
  <span class="content">vs Opponent</span>
  <span class="spacer"></span>
  <span class="right">Score</span>
</div>
```

```css
.spacer { flex: 1; }  /* ⚠️ Causes content to shift based on right element width */
```

**Problem**: The spacer expands/contracts based on available space, causing the content position to vary when the right element changes width.

**✅ Correct Pattern**: Combine content into single element with fixed-width prefix

```html
<!-- DO THIS -->
<div class="container">
  <span class="content-line">
    <span class="prefix">R15:</span> vs Opponent
  </span>
  <span class="spacer"></span>  <!-- ✅ Spacer after content -->
  <span class="right">Score</span>
</div>
```

```css
.container {
  display: flex;
  justify-content: flex-start;
  gap: 0;
}

.prefix {
  display: inline-block;
  width: 2.5em;  /* Fixed width for consistent alignment */
  text-align: left;
}

.content-line {
  flex-shrink: 0;
  flex-grow: 0;
}

.spacer {
  flex: 1;  /* ✅ Pushes right element away, content stays fixed */
  min-width: 8px;
}

.right {
  flex-shrink: 0;
}
```

**Result**: Content always starts at the same position (2.5em from left), regardless of the width of the right element.

**Real-world example**: Schedule game rows where opponent names must align consistently whether showing scores (narrow) or "ABANDONED" badges (wide).

---

## Mobile-First Development

### Consistency Across Breakpoints

**Rule**: Desktop and mobile layouts MUST use the same alignment strategy, only adjusting sizing/spacing.

**❌ Anti-Pattern**: Different layout strategies per breakpoint

```css
/* Desktop */
.spacer { flex: 1; }

/* Mobile */
@media (max-width: 480px) {
  .spacer { 
    flex: 0 0 auto;  /* ⚠️ Different behavior! */
    min-width: 4px; 
  }
}
```

**Problem**: Creates inconsistent UX across devices and makes debugging difficult.

**✅ Correct Pattern**: Same strategy, different sizing

```css
/* Desktop */
.spacer { 
  flex: 1; 
  min-width: 8px; 
}

.prefix { width: 2.5em; }

/* Mobile */
@media (max-width: 480px) {
  .spacer { 
    flex: 1;  /* ✅ Same behavior */
    min-width: 8px; 
  }
  
  .prefix { 
    width: 2.5em;  /* ✅ Same width */
    font-size: 0.85em;  /* Only adjust size */
  }
}
```

### Mobile Testing Checklist

Before marking mobile work as complete:

1. ✅ Test on actual mobile device, not just browser resize
2. ✅ Hard refresh to clear cache (Cmd+Shift+R or pull-down refresh)
3. ✅ Compare side-by-side with desktop to verify consistency
4. ✅ Test with different content widths (short/long names, scores vs badges)

---

## Cache Busting Strategy

### appVersion Must Be Updated

**Critical**: Google Apps Script caches CSS/JS aggressively. Clients won't see changes without cache busting.

**Required workflow**:

1. Make CSS/JS changes
2. Update `appVersion` in `Code.js`:
   ```javascript
   template.appVersion = '913';  // Increment after every deploy
   ```
3. Deploy to Google Apps Script
4. Verify version in browser console: `window.appVersion`

**Symptoms of cache issues**:
- "The fix didn't work" when code is correct
- Old styles visible despite new deployment
- Inconsistent behavior between users

**Solution**: Always increment `appVersion` as part of deployment workflow.

### Deployment Checklist

```bash
# 1. Make code changes
# 2. Update appVersion in Code.js
# 3. Commit
git add -A
git commit -m "Fix: description"

# 4. Push to Google Apps Script
clasp push

# 5. Create version
clasp version "Description"

# 6. Deploy
clasp deploy -i [deployment-id] -d "Description"

# 7. Pin CDN (if using)
./scripts/pin-cdn.sh @$(git rev-parse --short HEAD)
```

---

## Debugging CSS Issues

### Visual Alignment Problems

**Symptoms**:
- Content appears right-aligned when it should be left-aligned
- Alignment varies based on other elements' width
- "It looks different on mobile vs desktop"

**Debugging process**:

1. **Add diagnostic logging**:
   ```javascript
   setTimeout(() => {
     const element = document.querySelector('.problematic-element');
     const styles = window.getComputedStyle(element);
     console.log('🎨 Computed styles:', {
       width: styles.width,
       flexGrow: styles.flexGrow,
       flexShrink: styles.flexShrink,
       position: element.offsetLeft + 'px from left'
     });
   }, 100);
   ```

2. **Inspect parent container**:
   - `justify-content` value
   - `gap` setting
   - Child element flex properties

3. **Check for conflicting media queries**:
   ```bash
   # Search for selector in all media queries
   grep -n "\.selector" src/styles.html
   ```

4. **Verify cache is fresh**:
   - Check `window.appVersion` in console
   - Hard refresh (Cmd+Shift+R)
   - Clear browser cache if needed

### Common Pitfalls

| Problem | Cause | Solution |
|---------|-------|----------|
| Content shifts horizontally | Spacer with `flex: 1` between content elements | Move spacer after content, combine content into single element |
| Mobile looks different than desktop | Different flex properties in media query | Use same strategy, only adjust sizing |
| Changes not visible | Old cached version | Increment `appVersion` |
| Elements wrapping unexpectedly | `min-width: 0` on flex child | Remove `min-width` or set explicit width |

---

## Version History

- **2025-12-08**: Initial version based on schedule alignment refactor
  - Documented flexbox alignment pattern
  - Added mobile-first consistency rules
  - Documented cache busting workflow

---

## Related Documentation

- [DEVELOPMENT-PRINCIPLES.md](./DEVELOPMENT-PRINCIPLES.md) - Overall development philosophy
- [TESTING_README.md](./TESTING_README.md) - Testing strategies
- [DEBUGGING_STRATEGY.md](./DEBUGGING_STRATEGY.md) - General debugging approaches
