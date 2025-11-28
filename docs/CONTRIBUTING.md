# Contributing — CHANGELOG Guidelines

## Testing & Deployment Workflow

Before deploying changes, please use the testing tools to catch issues early:

### Quick Validation
```bash
./scripts/pre-deploy-check.sh
```

### Full Testing & Deployment
```bash
./scripts/test-and-deploy.sh "Description of changes"
```

### Browser Testing
After deployment, use these console commands for validation:
```javascript
AppValidator.runAllChecks()        // Run all checks
AppValidator.checkDataAvailability() // Verify data loaded
AppValidator.testInsightsNavigation() // Test navigation
```

See `TESTING_README.md` for detailed testing instructions.

## CHANGELOG Guidelines

Please follow this simple guideline when adding entries to `CHANGELOG.md`:

- Add unreleased items under the `## [Unreleased]` section as short bullets.
- When creating a release, add a new `## v<version> — YYYY-MM-DD` section above older versions.
- Keep each bullet short (one line) and owner-visible. Prefer user-facing changes first, then developer notes.
- For releases, include a short **Files changed (high level)** list with the key files touched (not every line-level diff).
- If you need to provide file-level diffs or commit hashes, include them in the release notes or reference the git tag (e.g., `v243`).
- Use `Qtr`/`Qtrs` for visible UI copy when referring to quarters.

Example entry:

## vX.Y — 2025-11-21
- Fixed leaderboard alignment and accessibility.
- Normalized 'Qtr' label across UI.

**Files changed (high level):**
- `index.html`, `js-render.html`, `styles.html`

Thank you — keeping a concise, consistent changelog helps audits and releases.
