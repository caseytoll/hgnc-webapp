# Mobile-First Development Guide

**Last Updated**: December 7, 2025  
**Status**: Best Practices Derived from Live Testing  
**Scope**: Design, layout, testing, and validation for mobile-first web apps

---

## Quick Reference: Why Mobile First?

1. **Constraints Force Better Design** - Smaller screen = must prioritize information
2. **Desktop Will Always Have More Space** - Designs that work on mobile scale up easily
3. **Growing Mobile Usage** - HGNC app primarily used on phones by field teams
4. **Testing on Real Devices Reveals Issues** - Desktop emulation misses crucial details

---

## Phase 1: Design & Information Architecture

### Scoring System for Mobile Layouts

Use this 100-point scale to objectively evaluate mobile layout designs:

| Category | Score Range | Evaluation Criteria |
|----------|-------------|-------------------|
| **Readability** | 0-25 | Text sizes appropriate, no unexpected wrapping, hierarchy clear |
| **Information Hierarchy** | 0-25 | Primary info prominent, secondary info de-emphasized, scannable |
| **Visual Alignment** | 0-20 | Elements vertically/horizontally aligned consistently |
| **Spacing & Density** | 0-15 | Appropriate whitespace, not cramped, uses mobile width well |
| **Touch Targets** | 0-15 | Buttons/clickable areas >44px, proper spacing between |

### Example Application (from v858-v870 Schedule Page)

**v860 Design**: 62/100
- Readability: 18/25 (long team names wrapped unexpectedly)
- Information Hierarchy: 15/25 (date below opponent felt wrong)
- Visual Alignment: 10/20 (elements at different visual heights)
- Spacing & Density: 12/15 (too much vertical space)
- Touch Targets: 7/15 (edit button small)

**v870 Design**: 92/100+
- Readability: 24/25 (team names shortened, clear line breaks)
- Information Hierarchy: 24/25 (date/edit secondary, matchup/score primary)
- Visual Alignment: 19/20 (explicit align-self, line-height standardized)
- Spacing & Density: 14/15 (compact two-line layout)
- Touch Targets: 11/15 (button appropriately sized)

### Information Hierarchy Best Practices

**Principle**: User scans mobile screen for key question, then drills for details

**Example: Schedule Row**
```
Question User Asks: "Who are we playing and what's the score?"
↓
PRIMARY INFO: Round + Opponent + Score (line 2, larger, bold)
↓
Question User Asks: "When is this game?"
↓
SECONDARY INFO: Date + Edit button (line 1, smaller, lighter)
```

**Application Rule**:
- Line 1 (top): Secondary information (date, edit, metadata)
- Line 2 (bottom): Primary information (matchup, score, action)

*Why bottom for primary?* Users' eyes scan top-to-bottom, but land on bottom for detail. Primary information should be readable at first glance AND remain visible when scrolling.

### Typography for Mobile

| Element | Size | Weight | Notes |
|---------|------|--------|-------|
| Heading | 1.1em | 600+ | Clear section breaks |
| Body | 0.9em | 400-500 | Default text, readable |
| Secondary | 0.65-0.75em | 400 | Metadata, dates, helper text |
| Badge/Label | 0.5-0.7em | 600-700 | Warnings, status indicators |
| Button Text | 0.8em | 600 | Touch targets >44px tall |

**Rules**:
- ❌ Never use font-size < 0.6em (unreadable on mobile)
- ✅ Ensure line-height >= 1.2 for readability
- ✅ Secondary text should be noticeably smaller (visual hierarchy)
- ✅ High-contrast colors for text (WCAG AA minimum)

---

## Phase 2: Layout Implementation

### Flex Layout Patterns (Proven Patterns from Session)

#### Pattern 1: Two-Line Information Stack
**Use Case**: When you have multiple related pieces of info (date + score + opponent)

```html
<!-- Line 1: Secondary info -->
<div class="game-row-line1">
  <span class="game-row-date">6 Dec 2025</span>
  <span class="spacer"></span>
  <button class="edit-btn">[Edit]</button>
</div>

<!-- Line 2: Primary info -->
<div class="game-row-line2">
  <span class="game-round">R15:</span>
  <span class="game-opponent">vs Monty 11 White</span>
  <span class="spacer"></span>
  <span class="game-row-score">8-6</span>
</div>
```

```css
.game-row {
  display: flex;
  flex-direction: column;
  gap: 6px;  /* Separation between lines */
}

.game-row-line1,
.game-row-line2 {
  display: flex;
  align-items: center;
  gap: 8px;
}

.game-row-line1 {
  justify-content: space-between;
}

.game-row-line2 {
  justify-content: flex-start;
}

.spacer {
  flex: 1;  /* Pushes following element to right */
}
```

**Key Points**:
- ✅ `flex-direction: column` stacks lines vertically
- ✅ `align-items: center` centers all items on each line
- ✅ Individual items can override with `align-self: center`
- ✅ Spacer element with `flex: 1` controls spacing distribution

#### Pattern 2: Conditional Visibility
**Use Case**: Show different content based on game status (normal vs abandoned vs bye)

```javascript
// Instead of creating three different HTML blocks,
// use conditional class assignment:

function renderGameRow(game) {
  var html = '<div class="game-row';
  
  if (game.status === 'bye') {
    html += ' is-bye';
  }
  
  html += '">';
  
  // Same HTML structure, CSS handles appearance
  html += '<div class="game-row-line1">';
  html += getLine1Content(game);
  html += '</div>';
  
  html += '<div class="game-row-line2">';
  html += getLine2Content(game);  // Returns different content based on status
  html += '</div>';
  
  html += '</div>';
  return html;
}
```

**Benefits**:
- Single rendering path (easier to debug)
- CSS classes control appearance
- Easy to add new game statuses

### Avoiding Responsive Design Problems

#### Problem: Content Wrapping Unexpectedly
**Cause**: Text + elements on one line exceed 375px (typical mobile width)

**Prevention**:
1. **Shorten text** (team nicknames, abbreviated labels)
2. **Stack vertically** (two-line layout instead of one-line)
3. **Test at 375px width** before considering done

**Example**: "Montmorency 11 White" (26 chars) → "Monty 11 White" (14 chars) = 50% shorter

#### Problem: Elements Appear Misaligned
**Cause**: Mixed line-heights, different font-sizes, missing align-self

**Prevention**:
```css
/* WRONG - elements at different heights */
.mixed-alignment {
  display: flex;
  gap: 8px;
}

/* CORRECT - all elements same height */
.correct-alignment {
  display: flex;
  align-items: center;  /* Container baseline */
  gap: 8px;
}

.correct-alignment span {
  align-self: center;   /* Item explicit centering */
  line-height: 1.2;     /* Consistent line-height */
}
```

#### Problem: Touch Targets Too Small
**Cause**: Buttons/clickable areas < 44px (minimum touch target)

**Prevention**:
```css
/* WRONG - button too small to reliably tap */
.edit-btn {
  padding: 2px 4px;     /* Only 20px tall */
  font-size: 0.8em;
}

/* CORRECT - sufficient touch target */
.edit-btn {
  padding: 8px 12px;    /* ~40px tall */
  min-width: 44px;
  font-size: 0.8em;
}
```

**WCAG 2.5.5 Standard**: Minimum 44x44 CSS pixels for target size

---

## Phase 3: Testing on Mobile

### Pre-Deployment Testing Checklist

#### Desktop Testing (First Pass)
- [ ] Open DevTools (F12)
- [ ] Enable mobile emulation (Ctrl+Shift+M)
- [ ] Test at 375px width (iPhone width)
- [ ] Test at 768px width (tablet)
- [ ] Scroll through entire view
- [ ] Check Console for errors
- [ ] Clear cache (Cmd+Shift+R or Ctrl+Shift+R)

#### Physical Mobile Device Testing (REQUIRED)
- [ ] Test on actual iPhone/Android phone
- [ ] Test portrait orientation
- [ ] Test landscape orientation
- [ ] Perform touch interactions (no mouse)
- [ ] Check actual font rendering (different from desktop)
- [ ] Verify colors don't change with screen brightness
- [ ] Take screenshots for reference

#### Validation Testing
- [ ] Does text wrap as expected? (No surprise breaks)
- [ ] Are all buttons tap-able without zooming? (>44px)
- [ ] Do elements align vertically? (Check baseline)
- [ ] Is information hierarchy clear? (Primary vs secondary)
- [ ] Does color contrast meet WCAG AA? (4.5:1 for text)

### Screenshot-Based Validation

**From Session**: User provided screenshots of v858-v870 schedule page on mobile device

**What Screenshots Revealed**:
- v860: "too spread out" + wrapping issues (visible in photo)
- v862: "wonky" appearance + vertical alignment problems
- v867: Nickname mapping working ("Montmorency" → "Monty")
- v869: Wrong line order (date/edit on line 2, should be line 1)
- v870: Typography now balanced (smaller date, centered opponent)

**Lesson**: Screenshots capture real-world rendering that emulation misses
- Font anti-aliasing different
- Touch target perceived size different
- Color brightness different
- Wrapping behavior different

**For Future Work**: Use screenshot-based validation as primary metric, not desktop appearance

---

## Phase 4: Refinement Workflow

### Scoring-Based Iteration Process

**Step 1: Baseline Score**
- Deploy initial design
- Test on mobile device
- Score 0-100 using scoring framework
- Identify lowest-scoring categories

**Step 2: Targeted Improvement**
- Focus on lowest-scoring category
- Make one-category improvement per iteration
- Don't try to fix everything at once

**Step 3: Test & Score**
- Deploy improved version
- Test same scenario on mobile
- Score again
- Document which changes improved which category

**Step 4: Repeat**
- If score ≥90, consider done
- If score <90, identify next category to improve
- Continue until target reached

### Example Iteration from Session

```
v860: Score 62/100
  ├─ Readability: 18/25 (team names wrap)
  ├─ Hierarchy: 15/25 (wrong order)
  └─ Action: Shorten team names + restructure layout

v867: Score 92/100 (after nickname mapping)
  ├─ Readability: 24/25 ✓ (improved)
  ├─ Hierarchy: 22/25 ✓ (improved)
  ├─ Alignment: 16/20 (opponent appears higher)
  └─ Action: Fix vertical alignment + reduce font sizes

v870: Score 92/100+ (after typography polish)
  ├─ Alignment: 19/20 ✓ (opponent centered)
  ├─ Readability: 24/25 ✓ (date smaller, clearer)
  └─ Done: All categories >90
```

---

## Phase 5: Common Mobile CSS Pitfalls & Fixes

### Pitfall 1: -webkit Prefixes and Mobile Browser Incompatibility

**Problem**: CSS works on desktop but not mobile browsers

**Causes**:
- Missing `-webkit-` prefixes for mobile Safari
- Feature not supported on older Android browsers
- CSS Grid not available (use flexbox instead)

**Fix**:
```css
/* WRONG - missing webkit prefix */
.blur-effect {
  backdrop-filter: blur(4px);
}

/* CORRECT - with webkit prefix */
.blur-effect {
  -webkit-backdrop-filter: blur(4px);
  backdrop-filter: blur(4px);
}

/* WRONG - CSS Grid not fully supported mobile */
.grid-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
}

/* CORRECT - flexbox compatible */
.flex-layout {
  display: flex;
  flex: 1;
}
```

### Pitfall 2: Fixed Positioning Issues

**Problem**: `position: fixed` behaves differently on mobile (especially with viewport zoom, keyboard open)

**Safe Approach**:
```css
/* WRONG - position: fixed with transforms unreliable */
.modal {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

/* CORRECT - use flexbox centering instead */
.modal-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  position: fixed;
}

.modal {
  width: 90%;
  max-width: 400px;
  /* Automatically centered by flex */
}
```

### Pitfall 3: Font Size Below 16px Causes Zoom on Input Focus

**Problem**: When user taps input with font-size <16px, browser auto-zooms (disorienting)

**Fix**:
```css
/* WRONG - causes zoom when focused */
input {
  font-size: 14px;
}

/* CORRECT - prevents zoom */
input {
  font-size: 16px;  /* Minimum to prevent zoom */
}

/* For labels/other text, 14px is fine */
label {
  font-size: 14px;
}
```

### Pitfall 4: Viewport Height (100vh) Issues

**Problem**: `height: 100vh` includes mobile browser UI (address bar, etc.), causing overflow

**Fix**:
```css
/* WRONG - 100vh includes browser UI */
.full-height {
  height: 100vh;
  overflow: hidden;
}

/* CORRECT - use max-height with fallback */
.full-height {
  height: 100%;
  max-height: 100vh;
  overflow-y: auto;
}

/* Or use viewport units that account for UI */
.full-height {
  height: 100dvh;  /* Dynamic viewport height */
  overflow-y: auto;
}
```

---

## Appendix: Tools & Resources

### Browser DevTools for Mobile Testing
1. **Emulation Mode** (Ctrl+Shift+M): Simulates mobile viewport
2. **Device Presets**: iPhone SE (375px), iPad (768px)
3. **Throttling**: Simulate slow network (helpful for performance)
4. **Touch Emulation**: Simulates touch events for testing

### Online Validators
- **HTML**: https://validator.w3.org/
- **CSS**: https://jigsaw.w3.org/css-validator/
- **WCAG Accessibility**: https://www.accessibilityvalidator.com/
- **Responsive Design**: https://responsively.app/ (free tool)

### Reference Documentation
- MDN Mobile Development: https://developer.mozilla.org/en-US/docs/Web/Guide/Mobile
- WCAG 2.1 Guidelines: https://www.w3.org/WAI/WCAG21/quickref/
- Flexbox Playground: https://flexboxfroggy.com/

---

## Related Documents
- `DEVELOPMENT_SESSION_2025_12_07.md` - Live example of scoring-based iteration
- `GOOGLE_APPS_SCRIPT_CACHING.md` - Caching challenges specific to mobile
- `DEVELOPMENT-PRINCIPLES.md` - General development best practices
