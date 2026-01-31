# Deployment Guide: HGNC Team Manager

## Production URL
- The live coach's site is deployed at:  
  **https://hgnc-team-manager.pages.dev**

## Hosting Platform
- The site is hosted on **Cloudflare Pages**.

## Deployment Process
1. **Build the site:**
   - Run: `npm run build`
   - Output is placed in the `dist/` directory.
2. **Deploy to Cloudflare Pages:**
   - Run: `npx wrangler pages deploy dist --project-name=hgnc-team-manager`
   - This will deploy the latest build to https://hgnc-team-manager.pages.dev

## Environment
- All production deployments use the `dist/` directory as the publish root.
- The project uses Vite for building the SPA.
- API calls are proxied as needed (see netlify.toml for legacy config, but Cloudflare is the current host).

## Parent Portal
- Parent portals are deployed as separate Cloudflare Pages projects, one per team, using the same automated scripts.
- See `scripts/deploy-parent-portals-deploy.cjs` for details.

## Notes
- Netlify is no longer used for production deployment.
- For troubleshooting or advanced deployment, see the scripts in the `scripts/` directory.

---

For more details, see the scripts/README.md or contact the project maintainer.
