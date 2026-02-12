# Deploy Coach App

Deploy the Coach's App to Cloudflare Pages. $ARGUMENTS

## Steps

1. **Bump version**: Open `apps/coach-app/vite.config.js` and increment the `REVISION` letter on line 8 (a→b→c for same day, reset to 'a' on new day). Today's date format: `YYYY-MM-DD`.

2. **Build**: Run `npm run build` from the project root. Verify the build completes without errors.

3. **Deploy**: Run `cd apps/coach-app && wrangler pages deploy dist --project-name=hgnc-team-manager --branch=main --commit-dirty=true`

4. **Verify**: Confirm the deploy URL is returned and accessible.

5. **Report**: Show the deployed URL and the new version string.
