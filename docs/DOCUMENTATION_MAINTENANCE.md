# Documentation Maintenance Guide

**Last Updated:** December 10, 2025  
**Purpose:** Guidelines for keeping documentation current and accurate

---

## Documentation Staleness Rules

### Active Documents (Require Regular Updates)

These documents should be reviewed and updated regularly:

| Document | Update Frequency | Last Updated | Next Review |
|----------|-----------------|--------------|-------------|
| LESSONS_LEARNED.md | After each major issue | Dec 10, 2025 | Ongoing |
| CHANGELOG.md | Every deployment | Varies | N/A |
| START_HERE.md | When critical rules change | Dec 10, 2025 | Mar 2026 |
| DEPLOYMENT_CHECKLIST.md | When workflow changes | Dec 10, 2025 | Mar 2026 |
| DEVELOPMENT-PRINCIPLES.md | When non-negotiables change | Nov 2025 | Mar 2026 |

### Reference Documents (Stable)

These documents are reference material and don't require frequent updates:

| Document | Type | Last Updated |
|----------|------|--------------|
| NETBALL_RULES_REFERENCE.md | Reference | Dec 9, 2025 |
| CSS_BEST_PRACTICES.md | Standards | Dec 10, 2025 |
| QUICK_FIX_GUIDE.md | Historical | Historical |

Mark with `**Type**: Reference document (stable, does not require frequent updates)` at top.

---

## When to Archive Documents

**Archive immediately after creating if:**
- Document is version-specific (e.g., `TASKS_v944.md`, `DEPLOYMENT_v944.md`)
- Document is session-specific (e.g., `SESSION_SUMMARY_Dec9_2025.md`)
- Document is a one-time analysis (e.g., `COMPREHENSIVE_ANALYSIS_SUMMARY.md`)

**Archive location structure:**
```
docs/archive/
├── 2025-12-07/          # Date-based for sessions
│   ├── DEVELOPMENT_SESSION_2025_12_07.md
│   └── DESIGN_CODE_REVIEW_2025_12_07.md
├── 2025-12-09/
│   ├── SESSION_LEARNINGS_Dec9_2025.md
│   ├── SESSION_SUMMARY_Dec9_2025.md
│   └── v943_SESSION_REVIEW.md
└── [general]/           # Version-specific, no date
    ├── ARCHITECTURE_v945_LAZY_LOAD.md
    ├── DEPLOYMENT_v944.md
    └── PRE_DEPLOY_VALIDATION_v988.md
```

**Before archiving:**
1. Extract key learnings into `LESSONS_LEARNED.md`
2. Update `CHANGELOG.md` if version-specific
3. Create post-mortem if significant issue
4. Then move to archive

---

## Root Directory Policy

**Only these types of documents in `docs/` root:**

1. **Entry points:**
   - START_HERE.md
   - DOCUMENTATION_INDEX.md
   - README.md (if exists)

2. **Evergreen living documents:**
   - LESSONS_LEARNED.md (append-only)
   - CHANGELOG.md (append-only)
   - DEPLOYMENT_CHECKLIST.md
   - POST_MORTEM_* (recent, <30 days)

3. **Quick references:**
   - QUICK_FIX_GUIDE.md
   - NETBALL_RULES_REFERENCE.md (reference only)
   - SERVICE_WORKER_DEPLOYMENT.md (reference only)

4. **GitHub Actions / CI:**
   - GITHUB_ACTIONS_QUICK_START.md

**Everything else goes in subdirectories:**
- `getting-started/` - Onboarding, principles, contributing
- `operations/` - Debugging, maintenance, project status
- `standards/` - Code style, CSS, icons, git hooks
- `testing/` - Test suites, coverage, error handling
- `deployment/` - Workflows, shipping, CI/CD
- `postmortems/` - Detailed post-mortem analyses
- `templates/` - Document templates
- `archive/` - Historical documents

---

## Updating DOCUMENTATION_INDEX.md

**When to update:**
- New document added to any folder
- Document moved to archive
- Document deleted
- Major reorganization

**What to update:**
1. Last Updated date
2. Total Documents count (run: `find docs -type f -name "*.md" | wc -l`)
3. Total Lines count (run: `find docs -type f -name "*.md" -exec wc -l {} + | tail -1`)
4. Add entry to appropriate section
5. Update folder structure if changed

**Script to auto-update counts:**
```bash
#!/bin/bash
TOTAL_FILES=$(find docs -type f -name "*.md" | wc -l | tr -d ' ')
TOTAL_LINES=$(find docs -type f -name "*.md" -exec wc -l {} + | tail -1 | awk '{print $1}')
echo "Total Documents: $TOTAL_FILES markdown files"
echo "Total Lines: $TOTAL_LINES lines"
```

---

## Adding "Last Updated" to Documents

**Template:**
```markdown
# Document Title

**Last Updated:** December 10, 2025  
**Purpose:** Brief description of what this doc does

---
```

**For reference documents:**
```markdown
# Document Title

**Type:** Reference document (stable, does not require frequent updates)  
**Last Updated:** December 10, 2025  
**Purpose:** Brief description

---
```

---

## Post-Mortem Document Lifecycle

1. **Create post-mortem** in `docs/` root with date: `POST_MORTEM_CSS_SPECIFICITY_2025_12_10.md`
2. **Extract key learnings** into `LESSONS_LEARNED.md` within 24 hours
3. **Update relevant guides** (e.g., CSS_BEST_PRACTICES.md, DEBUGGING_STRATEGY.md)
4. **After 30 days:** Move to `docs/postmortems/` archive
5. **Keep reference** in DOCUMENTATION_INDEX under "Learning from History"

---

## Quality Checklist for New Documents

Before adding any new document:

- [ ] Does it belong in a subdirectory rather than root?
- [ ] Does it have "Last Updated" date?
- [ ] Is it in DOCUMENTATION_INDEX.md?
- [ ] Does it link to related documents?
- [ ] Is the purpose clear in first paragraph?
- [ ] Would a future AI agent find this via search?

---

## Enforcement

**Scripts:**
- `scripts/doc-reminder.sh` - Shows documentation overview
- `scripts/pre-deploy-verify.sh` - Checks deployment best practices
- `scripts/pre-commit` (existing) - Pre-commit validations
- `scripts/doc-staleness-check.sh` - Fails if non-reference docs (outside archive/) are older than 90 days (override with STALE_DAYS)

**Planned:**
- `scripts/archive-old-docs.sh` - Auto-suggest archiving version-specific docs

---

## Contact

For questions about documentation organization, see:
- `docs/DOCUMENTATION_INDEX.md` - Complete index
- `docs/START_HERE.md` - Quick reference for critical docs
- `docs/LESSONS_LEARNED.md` - Historical learnings
