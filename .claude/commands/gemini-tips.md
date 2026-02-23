# Using Gemini CLI for Codebase Analysis

Tips for using `gemini -p` with the `@` syntax to analyze this codebase. $ARGUMENTS

---

## Project-Specific Examples

```bash
# Understand how both apps share code
gemini -p "@apps/coach-app/src/js/ @apps/parent-portal/src/js/ @common/ How do the two apps share common modules? What's duplicated vs shared?"

# Analyze the data flow from API to UI
gemini -p "@apps/coach-app/src/js/api.js @apps/coach-app/src/js/app.js @apps-script/Code.js Trace how team data flows from Google Sheets through the API to the UI"

# Check stats calculation consistency
gemini -p "@common/stats-calculations.js @common/mock-data.js @apps/coach-app/src/js/app.js Are stats calculated consistently between mock data and live data?"

# Review all test coverage
gemini -p "@apps/coach-app/src/js/*.test.js @apps/parent-portal/src/js/*.test.js @common/ What functionality is tested vs untested?"

# Understand lineup data structure usage
gemini -p "@apps/ @common/ How is the lineup data structure (Q1-Q4 with positions) used throughout the codebase?"

# Check for XSS protection
gemini -p "@apps/ @common/utils.js Where is escapeHtml() used? Are there any places rendering user input without escaping?"

# Analyze offline/sync behavior
gemini -p "@apps/coach-app/src/js/app.js @apps/coach-app/src/js/api.js How does localStorage caching work with the API sync?"
```

## When to Use Gemini

Use `gemini -p` when:
- Analyzing patterns across both apps and common modules
- Tracing data flow from Apps Script backend through to UI
- Checking consistency between coach-app and parent-portal implementations
- Reviewing test coverage across the monorepo
- Understanding how shared modules are used differently by each app

## Syntax Notes

- `@path/` includes a directory recursively
- `@file.js` includes a single file
- Paths are relative to current working directory
- Run from project root for the examples above
