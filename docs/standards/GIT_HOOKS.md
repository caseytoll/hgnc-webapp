#!/usr/bin/env bash

# Git Pre-Commit Hook Overview
# ═════════════════════════════════════════════════════════════════════════════════

## What Gets Checked

The pre-commit hook runs automatically before every git commit and validates:

### 1. **Documentation Organization**
   - All .md files (except README.md) must be in docs/ subdirectories
   - Prevents clutter in the project root
   - Standard: docs/deployment/, docs/testing/, docs/operations/, etc.

### 2. **File Structure Consistency**
   - Verifies all required HTML includes are present
   - Checks for broken references in index.html
   - Ensures src/ directory structure is intact

### 3. **JavaScript Code Quality**
   - Brace matching validation (ensures balanced { } pairs)
   - Detects orphaned console.log statements for debugging
   - Checks for syntax errors

### 4. **CDN Asset References**
   - Ensures CDN links are pinned to specific commits
   - Prevents using @master references in production
   - Maintains reproducible builds

### 5. **Version Synchronization**
   - Verifies Code.js and VERSION.txt are in sync
   - Prevents deployment with mismatched versions

## Installation

The hook is automatically installed when you run:

```bash
./scripts/setup-hooks.sh
```

This copies the pre-commit hook template from `scripts/hooks/pre-commit` 
to `.git/hooks/pre-commit` and makes it executable.

## What Happens on Commit

```
$ git commit -m "your message"

→ Pre-commit hook runs automatically
  ✓ Checks documentation organization
  ✓ Validates file structure
  ✓ Verifies JavaScript syntax
  ✓ Confirms CDN pinning
  
✅ If all checks pass → Commit succeeds
❌ If any check fails → Commit is blocked, fix issues, try again
```

## Examples

### Example 1: Documentation Organization

```
# ❌ This will block commit:
$ mv SHIPPING_CHECKLIST.md ./  # Move file to root
$ git add SHIPPING_CHECKLIST.md
$ git commit -m "Add checklist"
→ Hook blocks: "ERROR: Found documentation file in root: SHIPPING_CHECKLIST.md"

# ✅ Solution:
$ mv SHIPPING_CHECKLIST.md docs/deployment/
$ git add .
$ git commit -m "Add checklist"  # Now succeeds
```

### Example 2: Bypassing the Hook (Not Recommended)

If you absolutely need to skip the checks (emergency only):

```bash
git commit --no-verify
```

⚠️ **Warning**: This bypasses all safety checks. Use sparingly.

## Console.log Statements

The hook flags console.log statements as warnings because:
- They're useful for debugging during development
- They should be removed before production releases
- The warning reminds you to clean them up

**Not blocked**: Warnings don't prevent commits
**Not required to remove**: Use as needed for debugging
**Best practice**: Remove before major releases or when code is stable

## Checking Before Commit

To run pre-deployment checks manually without committing:

```bash
./scripts/pre-deploy-check.sh
```

This shows all potential issues before you attempt to commit.

## Hook Location

The hook is stored in two places:
- **Template**: `scripts/hooks/pre-commit` (tracked in git)
- **Active**: `.git/hooks/pre-commit` (local installation, not tracked)

The template is shared with your team via git. Each developer needs to run 
`setup-hooks.sh` once to install their local copy.

## Troubleshooting

### Hook not running?
```bash
# Check if it's installed and executable
ls -la .git/hooks/pre-commit

# If missing, reinstall:
./scripts/setup-hooks.sh
```

### Hook is too strict?
Edit `scripts/hooks/pre-commit` and adjust validation rules as needed.

### Want to disable hooks project-wide?
Remove the hook installation and don't run `setup-hooks.sh`.
(Not recommended - these checks catch important issues)

## Future Enhancements

Potential additions to the pre-commit hook:
- ESLint validation for JavaScript
- Unit test execution
- File size checks
- Spell-checking in documentation
