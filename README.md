# HGNC WebApp

A Google Apps Script web application for managing netball teams, tracking player statistics, game schedules, and team performance insights.

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

- [CHANGELOG.md](docs/CHANGELOG.md) - Version history and release notes
- [CONTRIBUTING.md](docs/getting-started/CONTRIBUTING.md) - Contribution guidelines
- [DEVELOPMENT-PRINCIPLES.md](docs/getting-started/DEVELOPMENT-PRINCIPLES.md) - Development philosophy
- [ICON_IMAGES_STANDARDIZATION.md](docs/standards/ICON_IMAGES_STANDARDIZATION.md) - Icon implementation details
- [TESTING_README.md](docs/testing/TESTING_README.md) - Testing guidelines
- [CI_DEPLOY.md](docs/deployment/CI_DEPLOY.md) - CI/CD documentation

## 🔐 Security

- OAuth scopes limited to Google Sheets access
- Webapp access control via Apps Script settings
- Server-side validation of all user inputs
- Owner-only functionality for team editing

## 📄 License

Copyright © 2025 HGNC WebApp Contributors

## 🤝 Contributing

See [CONTRIBUTING.md](docs/getting-started/CONTRIBUTING.md) for guidelines on how to contribute to this project.

