# Multi-Step Team Wizard - Backup & Recovery Plan

## Overview
This document outlines the comprehensive backup and recovery strategy for implementing the multi-step team creation wizard. All critical files have been backed up and multiple recovery mechanisms are in place.

## Backup Locations

### 1. Git Branch & Commit
- **Branch**: `feature/multi-step-team-wizard`
- **Commit**: `50ef115` - "BACKUP: Pre-wizard implementation - all files backed up"
- **Recovery**: `git reset --hard 50ef115` or `git checkout 50ef115`

### 2. File Backups
Location: `backups/wizard-implementation/20260211_143000/`
Files backed up:
- `main-views.html` - Apps Script modal HTML structure
- `js-navigation.html` - Modal initialization and navigation logic
- `js-server-comms.html` - Form handling and API communication
- `app.js` - Main app team creation logic
- `coach-app.js` - Coach app team creation logic

### 3. Recovery Commands

#### Quick Recovery (Revert All Changes)
```bash
# From project root
git reset --hard 50ef115
git clean -fd  # Remove any untracked files created during implementation
```

#### File-by-File Recovery
```bash
# Restore individual files from backup
cp backups/wizard-implementation/20260211_143000/main-views.html apps-script/src/includes/
cp backups/wizard-implementation/20260211_143000/js-navigation.html apps-script/src/includes/
cp backups/wizard-implementation/20260211_143000/js-server-comms.html apps-script/src/includes/
cp backups/wizard-implementation/20260211_143000/app.js src/js/
cp backups/wizard-implementation/20260211_143000/coach-app.js apps/coach-app/src/js/app.js
```

## Testing Strategy

### Pre-Implementation Testing
Before making any changes, verify these work:
1. **Apps Script Modal**: Open team creation modal, create team successfully
2. **Coach App Modal**: Open add team modal, create team with coach
3. **Main App Modal**: Open add team modal, create basic team
4. **API Functionality**: All three apps can load teams list after creation

### Post-Implementation Testing
After each change, test:
1. **Wizard Navigation**: All steps work, back/forward navigation
2. **Form Validation**: Required fields, data types, duplicate checking
3. **API Integration**: Teams created successfully via all apps
4. **Error Handling**: Invalid data shows appropriate errors
5. **Mobile Responsiveness**: Wizard works on mobile devices

### Rollback Testing
If issues found:
1. Use git reset to revert changes
2. Restore from file backups if needed
3. Test that original functionality is restored

## Implementation Plan

### Phase 1: Coach App (Lowest Risk)
- Start with coach app (simplest implementation)
- Test thoroughly before proceeding
- If issues, rollback only affects coach app

### Phase 2: Main App
- Apply similar changes to main app
- Test both apps work independently

### Phase 3: Apps Script (Highest Risk)
- Most complex due to modal structure
- Test all three implementations
- Have all recovery mechanisms ready

## Risk Mitigation

### 1. Incremental Changes
- Make small, testable changes
- Test after each modification
- Commit frequently with descriptive messages

### 2. Feature Flags
- Consider adding feature flags to enable/disable wizard
- Allows quick rollback without code changes

### 3. Parallel Testing
- Keep original modals functional during development
- Test both old and new implementations

## Emergency Recovery

If catastrophic failure occurs:

1. **Immediate**: `git reset --hard 50ef115`
2. **If git fails**: Restore from `backups/wizard-implementation/20260211_143000/`
3. **Verify**: Test all three team creation methods work
4. **Deploy**: Push working version to production

## Success Criteria

- All three apps maintain existing functionality
- Multi-step wizard improves UX for new users
- No breaking changes to existing workflows
- All recovery mechanisms tested and functional

## Contact
If recovery is needed, all backups and git history are preserved for immediate restoration.