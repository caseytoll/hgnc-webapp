### Fix: Insights icons — CDN fallbacks, runtime fallback, and optimized WebP assets

This PR contains the following changes:

- Add optimized player-analysis icon WebP and smaller PNG versions
- Add server-level CDN fallback via `Code.js` when inline data URIs aren't present
- Add client-side runtime fallback `ensureInsightsCardImages()` to replace missing or legacy Apps Script hosted assets with CDN-based URLs
- Add CSS fallback for Player Analysis (CDN) so older deployments get a working background image
- Add `scripts/efficient-deploy.sh` and `scripts/deploy_and_test.sh` to perform efficient `clasp` deployments and basic runtime verification
- Add a CHANGELOG entry `v730` for these changes

- Note:
- This PR applies CDN fallbacks using jsDelivr. Pre-deploy checks now error on `@master` CDN references and require a pinned tag/commit SHA to avoid deployment-time 404s.
- To help pin CDN references, the repo includes `scripts/pin-cdn.sh` which replaces `@master` with the tag/commit you supply and updates files that reference the CDN. After running it, commit and push the updated references.
- If you'd like me to merge this PR automatically once CI passes, reply here and I will proceed with merge + deploy.

How to test locally
- Run `npm run lint` and `npm run test` to run local checks
- To deploy quickly: `CLASP_SCRIPT_ID=... ./scripts/efficient-deploy.sh "Deploy: fix insights icons"`
- Basic post-deploy check (private apps): `CLASP_SCRIPT_ID=... ./scripts/deploy_and_test.sh "Verify: insights icons"`
- Basic post-deploy check (public site or CI-accessible): `CLASP_SCRIPT_ID=... ./scripts/deploy_and_test.sh "Verify: insights icons" "https://my-public-deploy-domain/"` or set `DEPLOYMENT_PUBLIC_URL` environment variable.

If you want me to merge + deploy automatically after CI passes, please confirm and I’ll merge and deploy the PR.
