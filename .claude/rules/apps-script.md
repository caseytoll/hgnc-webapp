---
globs: apps-script/**
---

# Apps Script Rules

- **No IIFEs in control flow**: Use named helper functions in Code.js conditional expressions — IIFEs fail silently
- **Column indexing**: `getDataRange().getValues()` is 0-indexed; `getRange(row, col)` is 1-indexed
- **POST-only handlers**: `savePlayerLibrary` and `saveTeamData` have no GET handlers (removed to prevent PIN auth bypass)
- **appsscript.json**: MUST include `"webapp": {"access": "ANYONE_ANONYMOUS", "executeAs": "USER_DEPLOYING"}` or ALL URLs return 404. `clasp push --force` can strip this.
- **Action case sensitivity**: `handleApiRequest` must NOT lowercase the action parameter — switch cases use camelCase
- **Deployment**: `cd apps-script && clasp push && clasp deploy -i <DEPLOYMENT_ID> -d "Description"`
- **API URL consistency**: Same deployment ID must appear in ALL config files (config.js both apps, .env, deploy commands, scripts, etc.)
