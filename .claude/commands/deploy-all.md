# Deploy All

Full deployment pipeline: backend, Coach App, and Parent Portal. $ARGUMENTS

## Steps

### 1. Backend
- Run `cd apps-script && clasp push && clasp deploy -i AKfycbwss2trWP44QVCxMdvNzk89sXQaCnhyFbUty22s_dXIg0NOA94Heqagt_bndZYR1NWo -d "deploy-all"`

### 2. Coach App
- Bump `REVISION` in `apps/coach-app/vite.config.js` line 8 (a→b→c for same day, reset to 'a' on new day)
- Run `npm run build`
- Run `cd apps/coach-app && wrangler pages deploy dist --project-name=hgnc-team-manager --branch=main --commit-dirty=true`

### 3. Parent Portal
- Run `cd apps/parent-portal && npm run build`
- Run `wrangler pages deploy dist --project-name=hgnc-gameday --branch=main --commit-dirty=true`

### 4. Git
- Stage, commit, and push all changes

### 5. Report
- Show all deployment results and URLs
