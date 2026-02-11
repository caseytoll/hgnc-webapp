# Deploy Parent Portal

Deploy the Parent Portal to Cloudflare Pages. $ARGUMENTS

## Steps

1. **Build**: Run `cd apps/parent-portal && npm run build`. Verify the build completes without errors.

2. **Deploy**: Run `wrangler pages deploy dist --project-name=hgnc-gameday --branch=main --commit-dirty=true` (from the parent-portal directory).

3. **Verify**: Confirm the deploy URL is returned and accessible.

4. **Report**: Show the deployed URL.
