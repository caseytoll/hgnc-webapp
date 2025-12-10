# HGNC WebApp

A Google Apps Script web application for managing netball teams, tracking player statistics, game schedules, and team performance insights.

---

## 🚨 For AI Agents & Developers: START HERE FIRST

**Before doing ANY work on this project, read:**

1. **[`docs/START_HERE.md`](./docs/START_HERE.md)** (5 min) - Critical rules that prevent wasting hours
2. **[`docs/DEPLOYMENT_CHECKLIST.md`](./docs/DEPLOYMENT_CHECKLIST.md)** (10 min) - Never deploy to wrong URL again
3. **[`docs/LESSONS_LEARNED.md`](./docs/LESSONS_LEARNED.md)** (15 min) - Patterns from past mistakes

**These 30 minutes of reading will save you 3+ hours of debugging.**

Common mistakes if you skip this:
- ❌ Deploy to wrong URL, user never sees changes (happened 6 times on Dec 10, 2025)
- ❌ Check CSS classes but not computed styles (wasted 12 versions on Dec 10, 2025)
- ❌ Add `!important` without checking conflicts (broke all views on Dec 10, 2025)
- ❌ Forget to instruct hard refresh (user sees cached version for hours)

**[Full documentation index →](./docs/DOCUMENTATION_INDEX.md)**

---

## 🏗️ Project Structure

```
hgnc-webapp/
├── src/                      # Source code
│   ├── includes/            # JavaScript modules (js-*.html)
│   ├── icons/               # Icon asset definitions
│   └── styles.html          # CSS styles
├── tests/                    # Test files and screenshots
│   ├── screenshots/         # Runtime check screenshots
│   └── *.js                # Test utilities
├── scripts/                  # Build and deployment scripts
│   ├── efficient-deploy.sh  # Optimized deployment
│   ├── runtime-check.js     # Smoke tests
│   └── pre-deploy-check.sh  # Pre-deployment validation
├── assets/                   # Static assets (images, icons)
├── docs/                     # Documentation
├── infra/                    # Infrastructure as code (Terraform)
├── Code.js                   # Apps Script server-side entry point
├── index.html                # Main HTML template
└── appsscript.json          # Apps Script configuration
```

## 🚀 Quick Start

### Prerequisites
- Node.js 14+ and npm
- Google Apps Script CLI (`@google/clasp`)
- Access to the HGNC Google Sheets spreadsheet

### Installation

```bash
# Install dependencies
npm install

# Login to Google Apps Script
npx clasp login

# Clone the project (if not already done)
npx clasp clone <SCRIPT_ID>
```

### Development

```bash
# Run pre-deployment checks
npm test

# Deploy to Apps Script
npm run deploy:efficient

# Run runtime smoke tests
node scripts/runtime-check.js
```

## 📦 Deployment

### Efficient Deployment

The project uses an optimized deployment process that only pushes changed files:

```bash
./scripts/efficient-deploy.sh "Description of changes"
```

This script:
1. Identifies changed files
2. Updates `.clasp.json` with `filePushOrder`
3. Pushes to Apps Script
4. Creates a new version
5. Deploys the version
6. Runs smoke tests

### Manual Deployment

```bash
npx clasp push
npx clasp deploy
```

## 🎨 Features

- **Team Management**: Add/edit players, track team rosters
- **Game Scheduling**: View and manage game schedules
- **Player Statistics**: Track individual player performance
- **Team Performance Insights**: Advanced analytics dashboard
- **Offensive/Defensive Leaders**: Performance leaderboards
- **Player Analysis**: Detailed player statistics and trends
- **Netball Ladder**: Live competition standings

## 🖼️ Icon Assets

All insight menu icons use modern WebP format with PNG fallbacks for optimal performance:

- **Team Performance**: WebP + PNG (265KB → 774KB fallback)
- **Offensive Leaders**: WebP + PNG (214KB → 722KB fallback)
- **Defensive Wall**: WebP + PNG (218KB → 768KB fallback)
- **Player Analysis**: WebP + PNG with @2x retina variant

Icons are hosted on jsDelivr CDN and loaded via a 3-tier fallback system for reliability.

## 🔧 Configuration

### Pinning assets on the CDN

We publish optimized assets held in this repository to jsDelivr. For production
stability, pin the CDN references to a tag or commit SHA rather than using
`@master`.

To pin all CDN references in the repo to a tag or commit (e.g. `@v1.0.0`), run:

```bash
./scripts/pin-cdn.sh @v1.0.0
```

Then run tests and commit the changes.

### Environment Variables

For runtime checks and CI:

```bash
# Apps Script deployment URL
export DEPLOYMENT_URL="https://script.google.com/macros/s/.../exec"

# Or for public deployments
export DEPLOYMENT_PUBLIC_URL="https://script.google.com/macros/s/.../exec"
```

## 🧪 Testing

### Pre-deployment Checks

```bash
./scripts/pre-deploy-check.sh
```

Validates:
- No bare base64 URIs in code
- Icon files are properly formatted
- HTML syntax is valid

### Runtime Smoke Tests

```bash
node scripts/runtime-check.js
```

Tests:
- Page loads successfully
- All critical elements present
- Icon images display correctly
- Owner-mode functionality
- Navigation works properly

### Screenshot Comparison

```bash
npm run test:screenshot-compare
```

## 📚 Documentation

📖 **[Complete Documentation Index](docs/DOCUMENTATION_INDEX.md)** - Start here for all documentation

### Quick Links

**New to the project?** Read these in order:
1. [LESSONS_LEARNED.md](docs/LESSONS_LEARNED.md) - Critical insights from past work
2. [QUICK_REFERENCE.md](docs/getting-started/QUICK_REFERENCE.md) - Daily reference
3. [DEVELOPMENT-PRINCIPLES.md](docs/getting-started/DEVELOPMENT-PRINCIPLES.md) - **Read before coding**

**Essential Documentation:**
- [CHANGELOG.md](docs/CHANGELOG.md) - Version history and release notes
- [CSS_BEST_PRACTICES.md](docs/standards/CSS_BEST_PRACTICES.md) - CSS patterns & anti-patterns
- [TESTING_README.md](docs/testing/TESTING_README.md) - Testing guidelines
- [DEPLOYMENT_WORKFLOW_v2.md](docs/deployment/DEPLOYMENT_WORKFLOW_v2.md) - How to deploy
- [DEBUGGING_STRATEGY.md](docs/operations/DEBUGGING_STRATEGY.md) - Debug methodology

**By Topic:**
- **Standards:** [ICON_IMAGES_STANDARDIZATION.md](docs/standards/ICON_IMAGES_STANDARDIZATION.md), [GIT_HOOKS.md](docs/standards/GIT_HOOKS.md)
- **Deployment:** [CI_DEPLOY.md](docs/deployment/CI_DEPLOY.md), [SHIPPING_CHECKLIST.md](docs/deployment/SHIPPING_CHECKLIST.md)
- **Operations:** [ARCHIVE_POLICY.md](docs/operations/ARCHIVE_POLICY.md), [PROJECT_STATUS_SUMMARY.md](docs/operations/PROJECT_STATUS_SUMMARY.md)
- **Learning:** [POST_MORTEM_2025_12_06.md](docs/postmortems/POST_MORTEM_2025_12_06.md)

**Contributing:** See [CONTRIBUTING.md](docs/getting-started/CONTRIBUTING.md)

## 🔐 Security

- OAuth scopes limited to Google Sheets access
- Webapp access control via Apps Script settings
- Server-side validation of all user inputs
- Owner-only functionality for team editing

## 📄 License

Copyright © 2025 HGNC WebApp Contributors

## 🤝 Contributing

See [CONTRIBUTING.md](docs/getting-started/CONTRIBUTING.md) for guidelines on how to contribute to this project.

