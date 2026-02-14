# Deploy All

Full deployment pipeline: backend, Coach App, and Parent Portal. $ARGUMENTS

## Steps

### 1. Backend
- Run `cd apps-script && clasp push && clasp deploy -i AKfycbz3DmnPOLstWmOmJs4nzDQn42XXWe0E2ujLpmfo4e4WZFkInXxUdeL8-W0SImYj9EQj -d "deploy-all"`

### 2. Coach App
- Bump `REVISION` in `apps/coach-app/vite.config.js` line 8 (a→b→c for same day, reset to 'a' on new day)
- Run `npm run build`
- Run `cd apps/coach-app && wrangler pages deploy dist --project-name=hgnc-team-manager --branch=master --commit-dirty=true`

### 3. Parent Portal
- Run `cd apps/parent-portal && npm run build`
- Run `wrangler pages deploy dist --project-name=hgnc-gameday --branch=main --commit-dirty=true`

### 4. Git
- Stage, commit, and push all changes

### 5. Report
- Show all deployment results and URLs
