# HGNC WebApp Design System

**Version:** 1.0  
**Last Updated:** December 11, 2025  
**Status:** Living Document

**Related Documents:**
- **[CSS_BEST_PRACTICES.md](./standards/CSS_BEST_PRACTICES.md)** - CSS implementation patterns and anti-patterns
- **[START_HERE.md](./START_HERE.md)** - Critical deployment and debugging rules
- **[QUICK_REFERENCE.md](./getting-started/QUICK_REFERENCE.md)** - Quick answers during development

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Design Principles](#design-principles)
3. [Design Tokens](#design-tokens)
4. [Typography](#typography)
5. [Color System](#color-system)
6. [Spacing & Layout](#spacing--layout)
7. [Components](#components)
8. [States & Feedback](#states--feedback)
9. [Responsive Design](#responsive-design)
10. [Accessibility](#accessibility)
11. [Usage Guidelines](#usage-guidelines)

---

## Overview

The HGNC WebApp Design System provides a comprehensive framework for building consistent, accessible, and beautiful user interfaces. This system follows the **4-Step Design Framework**:

1. **Foundation** - Clear product requirements linked to UX goals
2. **UX Guidelines** - Intuitive navigation, accessibility, responsiveness
3. **Design System** - Reusable tokens and components
4. **States & Screens** - Complete coverage of all UI states

### Goals

- **Consistency**: Same look and feel across all features
- **Efficiency**: Reusable components speed up development
- **Accessibility**: WCAG 2.1 AA compliant
- **Maintainability**: Token-based system for easy updates
- **Dark Mode**: Full support for light/dark themes

---

## Design Principles

### 1. User-Centric
Every design decision prioritizes user needs and intuitive interactions.

### 2. Progressive Disclosure
Show essential information first, reveal complexity only when needed.

### 3. Visual Hierarchy
Use size, color, and spacing to guide user attention.

### 4. Feedback First
Every user action receives immediate, clear feedback.

### 5. Mobile-First
Design for mobile, enhance for desktop.

---

## Design Tokens

Design tokens are the foundation of our system - reusable values that ensure consistency across the entire application.

### Why Tokens?

- **Single source of truth**: Change once, update everywhere
- **Consistency**: Same spacing/colors across all features
- **Scalability**: Easy to add new components
- **Dark mode**: Automatic theme switching

### Token Categories

```css
:root {
  /* Typography tokens */
  --font-body: 'Inter', system-ui, sans-serif;
  --font-heading: 'Space Grotesk', 'Inter', system-ui, sans-serif;
  
  /* Color tokens */
  --primary-color: #6B4C9A;      /* Hazel Glen brand purple */
  --danger-color: #ef4444;        /* Error/delete actions */
  --success-color: #10b981;       /* Success states */
  --warning-color: #f59e0b;       /* Warnings */
  
  /* Spacing tokens (4px base scale) */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-6: 24px;
  --space-8: 32px;
  
  /* Shadow tokens */
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  
  /* Transition tokens */
  --transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-base: 200ms cubic-bezier(0.4, 0, 0.2, 1);
}
```

---

## Typography

### Font Families

**Body Text**: Inter (fallback: system-ui)
- Clean, highly legible
- Optimized for UI text
- Excellent number rendering

**Headings**: Space Grotesk (fallback: Inter)
- Distinctive, modern
- Strong visual hierarchy
- Brand personality

### Type Scale

| Token | Size | Usage |
|-------|------|-------|
| `--text-xs` | 0.75rem (12px) | Labels, captions |
| `--text-sm` | 0.875rem (14px) | Secondary text |
| `--text-base` | 1rem (16px) | Body text (default) |
| `--text-lg` | 1.125rem (18px) | Emphasized text |
| `--text-xl` | 1.25rem (20px) | H4 headings |
| `--text-2xl` | 1.5rem (24px) | H2 headings |
| `--text-3xl` | 1.875rem (30px) | H1 headings |

### Usage Examples

```css
/* Headings */
h1 {
  font-family: var(--font-heading);
  font-size: var(--text-3xl);
  font-weight: 700;
  color: var(--text-primary);
}

/* Body text */
p {
  font-family: var(--font-body);
  font-size: var(--text-base);
  line-height: 1.5;
  color: var(--text-secondary);
}

/* Small labels */
.label {
  font-size: var(--text-sm);
  color: var(--text-tertiary);
}
```

---

## Color System

### Brand Colors

**Primary (Hazel Glen Purple)**
```css
--primary-color: #6B4C9A;        /* Main brand color */
--primary-hover: #5a3d82;        /* Hover state */
--primary-light: #9B7FC4;        /* Lighter variant */
--primary-lighter: #C5B3DC;      /* Very light */
--primary-lightest: #F0EBFF;     /* Tint/background */
```

**Usage:**
- Primary buttons and CTAs
- Active navigation states
- Key interactive elements
- Brand moments

### Semantic Colors

**Success (Green)**
```css
--success-color: #10b981;
--success-hover: #059669;
--success-light: #6ee7b7;
```
Use for: Confirmations, completed actions, positive stats

**Danger (Red)**
```css
--danger-color: #ef4444;
--danger-hover: #dc2626;
--danger-light: #fca5a5;
```
Use for: Errors, delete actions, critical warnings

**Warning (Orange)**
```css
--warning-color: #f59e0b;
--warning-light: #fbbf24;
```
Use for: Cautions, important notices, pending states

### Neutral Colors

**Backgrounds**
```css
--bg-color: #f9fafb;             /* Page background */
--bg-secondary: #f3f4f6;         /* Secondary areas */
--content-bg: #ffffff;           /* Cards, panels */
```

**Text**
```css
--text-primary: #111827;         /* Headings, important text */
--text-secondary: #6b7280;       /* Body text */
--text-tertiary: #9ca3af;        /* Subtle text, labels */
```

**Borders**
```css
--border-color: #e5e7eb;         /* Standard borders */
--border-light: #f3f4f6;         /* Subtle dividers */
```

### Dark Mode

All colors automatically adjust in dark mode:

```css
@media (prefers-color-scheme: dark) {
  :root {
    --primary-color: #9B7FC4;      /* Lighter in dark mode */
    --bg-color: #111827;           /* Dark background */
    --text-primary: #f9fafb;       /* Light text */
    /* ... all colors inverted */
  }
}
```

### Color Usage Guidelines

**Do:**
- ✅ Use semantic colors for their intended purpose
- ✅ Always use tokens, never hardcode colors
- ✅ Test in both light and dark modes
- ✅ Ensure sufficient contrast (4.5:1 minimum)

**Don't:**
- ❌ Use red for anything except errors/danger
- ❌ Use green for anything except success
- ❌ Mix hardcoded colors with token-based colors
- ❌ Override token values inline

---

## Spacing & Layout

### Spacing Scale (4px base)

Our spacing system uses a consistent 4px base increment:

| Token | Value | Usage |
|-------|-------|-------|
| `--space-1` | 4px | Tight spacing, icons |
| `--space-2` | 8px | Compact layouts |
| `--space-3` | 12px | Default padding |
| `--space-4` | 16px | Standard spacing |
| `--space-5` | 20px | Medium spacing |
| `--space-6` | 24px | Comfortable padding |
| `--space-8` | 32px | Large spacing |
| `--space-10` | 40px | Extra large |
| `--space-12` | 48px | Section spacing |

### Layout Tokens

```css
--layout-max-width: 800px;       /* Content max width */
--layout-wide-max: 1200px;       /* Wide layouts */
--layout-header-offset: 85px;    /* Fixed header height */
--size-button-touch: 44px;       /* Minimum touch target */
```

### Spacing Examples

```css
/* Card padding */
.card {
  padding: var(--space-6);
  gap: var(--space-4);
}

/* Section spacing */
.section {
  margin-bottom: var(--space-12);
}

/* Tight inline spacing */
.inline-group {
  gap: var(--space-2);
}
```

### Border Radius

```css
--radius-sm: 6px;     /* Small elements */
--radius: 8px;        /* Default */
--radius-md: 12px;    /* Medium */
--radius-lg: 16px;    /* Large cards */
--radius-full: 9999px; /* Pills, avatars */
```

### Shadows

```css
--shadow-sm: 0 1px 2px rgba(0,0,0,0.05);      /* Subtle lift */
--shadow: 0 1px 3px rgba(0,0,0,0.1);          /* Default */
--shadow-md: 0 4px 6px rgba(0,0,0,0.1);       /* Elevated */
--shadow-lg: 0 10px 15px rgba(0,0,0,0.1);     /* Prominent */
```

---

## Components

### Buttons

#### Primary Button (Call-to-Action)

```css
.primary-action {
  background: var(--primary-color);
  color: #fff;
  border: none;
  border-radius: var(--radius);
  padding: var(--space-3) var(--space-4);
  font-weight: 600;
  cursor: pointer;
  transition: var(--transition-base);
}

.primary-action:hover {
  background: var(--primary-hover);
  box-shadow: var(--shadow-md);
}

.primary-action:active {
  transform: translateY(1px);
}

.primary-action:focus-visible {
  outline: 2px solid var(--primary-color);
  outline-offset: 2px;
  box-shadow: 0 0 0 4px var(--primary-lightest);
}
```

**Usage:**
```html
<button class="primary-action">Save Changes</button>
```

#### Secondary Button

```css
button, .button-secondary {
  background: var(--content-bg);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius);
  padding: var(--space-3) var(--space-4);
  font-weight: 600;
}

button:hover {
  background: var(--bg-secondary);
  box-shadow: var(--shadow-sm);
}
```

**Usage:**
```html
<button>Cancel</button>
<button class="button-secondary">View Details</button>
```

#### Danger Button

```css
.button-danger {
  background: var(--danger-color);
  color: #fff;
  border: none;
}

.button-danger:hover {
  background: var(--danger-hover);
}
```

**Usage:**
```html
<button class="button-danger">Delete Player</button>
```

### Cards

Cards are the primary content container:

```css
.card {
  background: var(--content-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
  box-shadow: var(--shadow-sm);
  transition: var(--transition-base);
}

.card:hover {
  box-shadow: var(--shadow-md);
}

.card-title {
  font-family: var(--font-heading);
  font-size: var(--text-xl);
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: var(--space-3);
}

.card-subtitle {
  font-size: var(--text-sm);
  color: var(--text-tertiary);
  margin-bottom: var(--space-4);
}
```

**Usage:**
```html
<section class="card">
  <h3 class="card-title">Team Performance</h3>
  <p class="card-subtitle">Last 5 games</p>
  <div class="card-content">
    <!-- Content here -->
  </div>
</section>
```

### Navigation

#### Bottom Navigation Bar

```css
.bottom-nav {
  display: flex;
  gap: var(--space-1);
  padding: var(--space-2) var(--space-3);
  background: var(--content-bg);
  border-top: 1px solid var(--border-color);
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
}

.bottom-nav-button {
  flex: 1;
  padding: var(--space-2);
  border-radius: var(--radius);
  text-align: center;
  cursor: pointer;
  transition: var(--transition-fast);
}

.bottom-nav-button.active {
  background: var(--primary-lightest);
  color: var(--primary-color);
  border-color: var(--primary-lighter);
}
```

### Tabs

```css
.hub-tab {
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius);
  cursor: pointer;
  transition: var(--transition-fast);
}

.hub-tab[aria-selected="true"] {
  background: var(--primary-lightest);
  color: var(--primary-color);
  border-color: var(--primary-lighter);
  box-shadow: var(--shadow-sm);
}
```

---

## States & Feedback

### Loading States

#### Standard Loading Message

**Current (inconsistent):**
```html
<!-- ❌ Generic -->
<div>Loading...</div>

<!-- ✅ Contextual -->
<div>Loading lineup data...</div>
```

**Recommended Component:**

```css
.loading-state {
  text-align: center;
  padding: var(--space-6);
  color: var(--text-tertiary);
}

.loading-state-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--border-color);
  border-top-color: var(--primary-color);
  border-radius: var(--radius-full);
  animation: spin 1s linear infinite;
  margin: 0 auto var(--space-3);
}

.loading-state-message {
  font-size: var(--text-sm);
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
```

**Usage:**
```html
<div class="loading-state">
  <div class="loading-state-spinner"></div>
  <div class="loading-state-message">Loading lineup data...</div>
</div>
```

**✅ TODO: Implement this standardized component**

### Empty States

```css
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-12) var(--space-6);
  text-align: center;
}

.empty-state-icon {
  font-size: 64px;
  margin-bottom: var(--space-4);
  opacity: 0.5;
}

.empty-state-title {
  font-size: var(--text-xl);
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: var(--space-2);
}

.empty-state-message {
  font-size: var(--text-base);
  color: var(--text-secondary);
  margin-bottom: var(--space-6);
}

.empty-state-action {
  background: var(--primary-color);
  color: #fff;
  padding: var(--space-3) var(--space-6);
  border-radius: var(--radius);
  font-weight: 600;
}
```

**Usage:**
```html
<div class="empty-state">
  <div class="empty-state-icon">📊</div>
  <h3 class="empty-state-title">No Games Recorded</h3>
  <p class="empty-state-message">
    Add your first game to start tracking performance
  </p>
  <button class="empty-state-action">Add Game</button>
</div>
```

**Current Status:** ✅ Implemented

### Error States

**⚠️ TODO: Missing standardized error component**

**Recommended Component:**

```css
.error-message {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-4);
  background: var(--error-bg);
  border: 1px solid var(--danger-light);
  border-radius: var(--radius);
  color: var(--error-text);
}

.error-message-icon {
  font-size: var(--text-xl);
  flex-shrink: 0;
}

.error-message-content {
  flex: 1;
}

.error-message-title {
  font-weight: 600;
  margin-bottom: var(--space-1);
}

.error-message-description {
  font-size: var(--text-sm);
  margin-bottom: var(--space-3);
}

.error-message-action {
  background: var(--danger-color);
  color: #fff;
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-sm);
  font-size: var(--text-sm);
  font-weight: 600;
}
```

**Usage:**
```html
<div class="error-message">
  <div class="error-message-icon">⚠️</div>
  <div class="error-message-content">
    <div class="error-message-title">Failed to Load Data</div>
    <div class="error-message-description">
      Unable to connect to the server. Check your internet connection.
    </div>
    <button class="error-message-action">Retry</button>
  </div>
</div>
```

**✅ TODO: Implement this component**

### Success States

**⚠️ TODO: Missing standardized success component**

```css
.success-message {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-4);
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid var(--success-light);
  border-radius: var(--radius);
  color: var(--success-color);
}

.success-message-icon {
  font-size: var(--text-xl);
}

.success-message-text {
  font-weight: 600;
}
```

**Usage:**
```html
<div class="success-message">
  <div class="success-message-icon">✓</div>
  <div class="success-message-text">Player added successfully!</div>
</div>
```

**✅ TODO: Implement this component**

### Interactive States

All interactive elements must have these states:

1. **Default** - Normal appearance
2. **Hover** - Visual feedback on cursor over
3. **Active** - Pressed/clicked state
4. **Focus** - Keyboard focus indicator
5. **Disabled** - Non-interactive state

```css
/* Example: Complete button states */
button {
  /* Default */
  background: var(--primary-color);
  transition: var(--transition-base);
}

button:hover {
  /* Hover */
  background: var(--primary-hover);
  box-shadow: var(--shadow-md);
}

button:active {
  /* Active/Pressed */
  transform: translateY(1px);
}

button:focus-visible {
  /* Focus */
  outline: 2px solid var(--primary-color);
  outline-offset: 2px;
  box-shadow: 0 0 0 4px var(--primary-lightest);
}

button:disabled {
  /* Disabled */
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}
```

---

## Responsive Design

### Mobile-First Approach

Design for mobile screens first, then enhance for larger screens:

```css
/* Mobile (default) */
.container {
  padding: var(--space-3);
}

/* Tablet and up */
@media (min-width: 600px) {
  .container {
    padding: var(--space-6);
  }
}

/* Desktop */
@media (min-width: 1024px) {
  .container {
    padding: var(--space-8);
    max-width: var(--layout-max-width);
    margin: 0 auto;
  }
}
```

### Breakpoints

| Name | Min Width | Usage |
|------|-----------|-------|
| Mobile | 0px | Default (no media query) |
| Tablet | 600px | `@media (min-width: 600px)` |
| Desktop | 1024px | `@media (min-width: 1024px)` |
| Wide | 1440px | `@media (min-width: 1440px)` |

### Touch Targets

**Minimum touch target size: 44x44px**

```css
:root {
  --size-button-touch: 44px;
}

.mobile-button {
  min-height: var(--size-button-touch);
  min-width: var(--size-button-touch);
  padding: var(--space-3) var(--space-4);
}
```

**⚠️ TODO: Audit all interactive elements for 44px minimum**

---

## Accessibility

### Color Contrast

**WCAG 2.1 AA Requirements:**
- Normal text: 4.5:1 contrast ratio minimum
- Large text (18pt+): 3:1 contrast ratio minimum
- UI components: 3:1 contrast ratio minimum

**Current Status:** ✅ Meets requirements

### Keyboard Navigation

All interactive elements must be keyboard accessible:

```css
/* Focus indicators required */
button:focus-visible,
a:focus-visible,
input:focus-visible {
  outline: 2px solid var(--primary-color);
  outline-offset: 2px;
  box-shadow: 0 0 0 4px var(--primary-lightest);
}
```

### ARIA Labels

```html
<!-- ✅ Good: Descriptive labels -->
<button aria-label="Back to Insights">← Back</button>

<!-- ❌ Bad: No context -->
<button>Back</button>
```

### Screen Readers

```html
<!-- Loading state -->
<div role="status" aria-live="polite">
  Loading lineup data...
</div>

<!-- Error state -->
<div role="alert" aria-live="assertive">
  Failed to load data
</div>
```

---

## Usage Guidelines

### When to Use Design Tokens

**Always use tokens for:**
- ✅ Colors
- ✅ Spacing/padding/margins
- ✅ Font sizes
- ✅ Border radius
- ✅ Shadows
- ✅ Transitions

**Never hardcode:**
- ❌ `color: #6B4C9A` → Use `color: var(--primary-color)`
- ❌ `padding: 24px` → Use `padding: var(--space-6)`
- ❌ `font-size: 16px` → Use `font-size: var(--text-base)`

### Component Reusability

Before creating a new component:
1. Check if an existing component can be extended
2. Consider if it should be added to the design system
3. Document usage examples
4. Test in both light and dark modes

### Dark Mode Testing

Always test new components in dark mode:

```css
/* Test using browser DevTools or system preference */
@media (prefers-color-scheme: dark) {
  /* All token colors automatically adjust */
}
```

---

## Implementation Priorities

### ✅ Completed
- [x] Design token system
- [x] Color palette with dark mode
- [x] Typography scale
- [x] Spacing system
- [x] Button components
- [x] Card components
- [x] Empty state components
- [x] Loading states (basic)

### 🔄 In Progress
- [ ] Design system documentation (this document)

### ⚠️ TODO - Priority 1 (Critical)
- [ ] Standardized error message component
- [ ] Standardized loading state component with spinner
- [ ] Success/confirmation message component
- [ ] Enforce 44px touch targets everywhere

### ⚠️ TODO - Priority 2 (Important)
- [ ] Product Requirements Document (PRD)
- [ ] Component library with code examples
- [ ] Contextual loading messages everywhere
- [ ] Error state icons and visual feedback
- [ ] Empty state variants for different contexts

### ⚠️ TODO - Priority 3 (Enhancement)
- [ ] Animation library
- [ ] Modal/dialog patterns
- [ ] Form validation patterns
- [ ] Data visualization guidelines
- [ ] Icon library documentation

---

## Questions or Contributions

For questions about this design system or to propose additions:
1. Check existing components first
2. Review usage guidelines
3. Test in both light and dark modes
4. Document with code examples

**Maintainer:** Development Team  
**Last Review:** December 11, 2025
