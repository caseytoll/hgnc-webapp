# Deployment Documentation - Overview

**Last Updated:** December 10, 2025

This document clarifies the relationship between different deployment guides.

---

## 📋 Which Document Should I Use?

### For Day-to-Day Deployments: **DEPLOYMENT_CHECKLIST.md** ⭐

**Use this for:** Every single deployment

[`docs/DEPLOYMENT_CHECKLIST.md`](./DEPLOYMENT_CHECKLIST.md) is your **step-by-step guide**:
- Pre-deployment verification (deployment URL, version check)
- During deployment (git commit, clasp push, clasp deploy)
- Post-deployment verification (hard refresh, version check, smoke test)
- Rollback procedure if something breaks

**Created:** December 10, 2025 (lessons from CSS specificity debugging session)

---

### For Understanding the System: **DEPLOYMENT_WORKFLOW_v2.md**

**Use this for:** Learning how deployment works, understanding the architecture

[`docs/deployment/DEPLOYMENT_WORKFLOW_v2.md`](./deployment/DEPLOYMENT_WORKFLOW_v2.md) explains:
- Deployment architecture (stable vs numbered deployments)
- How Apps Script deployments work
- Development workflow patterns
- Historical context

**Use for:** Background knowledge, not daily workflow

---

### For Production Releases: **SHIPPING_CHECKLIST.md**

**Use this for:** Major releases, feature launches, version milestones

[`docs/deployment/SHIPPING_CHECKLIST.md`](./deployment/SHIPPING_CHECKLIST.md) covers:
- Release planning and preparation
- Comprehensive testing before shipping
- Communication with users
- Post-release monitoring

**Use for:** Planned releases, not hotfixes or daily deployments

---

## Quick Decision Tree

```
Are you deploying right now?
├─ Yes → Use DEPLOYMENT_CHECKLIST.md
├─ Want to understand deployment? → Read DEPLOYMENT_WORKFLOW_v2.md first
└─ Planning a major release? → Use SHIPPING_CHECKLIST.md
```

---

## Deployment URL Reference

**Stable Production (99% of deployments):**
```bash
AKfycbw8nTMiBtx3SMw-s9cV3UhbTMqOwBH2aHEj1tswEQ2gb1uyiE9e2Ci4eHPqcpJ_gwo0ug
```

**Command:**
```bash
clasp deploy -i AKfycbw8nTMiBtx3SMw-s9cV3UhbTMqOwBH2aHEj1tswEQ2gb1uyiE9e2Ci4eHPqcpJ_gwo0ug -d "v{VERSION} - {DESCRIPTION}"
```

**Development (@HEAD, auto-updates):**
```bash
AKfycbyzIhkw5F5HJm7x1W3rGSdQHZefDvB2-U9M04RzvuRh
```

---

## Related Documentation

- **For debugging deployment issues:** `docs/operations/DEBUGGING_STRATEGY.md`
- **For CI/CD automation:** `docs/deployment/CI_DEPLOY.md`
- **For GitHub Actions:** `docs/deployment/GITHUB_ACTIONS_SETUP.md`
- **For deployment failures analysis:** `docs/POST_MORTEM_CSS_SPECIFICITY_2025_12_10.md` (deployment URL confusion section)

---

## History

**Why three deployment docs?**

1. **DEPLOYMENT_WORKFLOW_v2.md** (Nov 2025) - Original comprehensive guide
2. **SHIPPING_CHECKLIST.md** (Nov 2025) - Added for major releases
3. **DEPLOYMENT_CHECKLIST.md** (Dec 10, 2025) - Created after 16-deployment debugging session revealed need for step-by-step daily workflow

Each serves a different purpose. They complement, not duplicate.
