# Error Handling & Observability Guide

## Better Error Messages in Tests

All tests should provide context-rich error messages to speed up debugging.

### Error Message Format

```
❌ TEST_NAME: Failed to [action that failed]

Context:
  - Expected: [what we wanted]
  - Actual: [what we got]
  - URL: [test endpoint]
  
Stack:
  [relevant stack trace lines]
```

### Using formatErrorMessage()

The `test-utils.js` provides a helper for consistent error formatting:

```javascript
const { formatErrorMessage } = require('./test-utils');

try {
  await testSomething();
} catch (error) {
  console.error(formatErrorMessage(error));
  process.exit(1);
}
```

Output example:
```
❌ ERROR: Failed to fetch player data

Stack trace:
  at Object.<anonymous> (/Users/casey-work/HGNC WebApp/hgnc-webapp/scripts/crud-test.js:45:12)
  at processImmediate (internal/timers.js:9)
```

### Custom Error Context

For more detailed debugging, wrap errors with context:

```javascript
try {
  const result = await fetch(url).then(r => r.json());
} catch (error) {
  const contextError = new Error(`Failed to fetch from ${url}: ${error.message}`);
  contextError.originalError = error;
  contextError.context = {
    url,
    timeout: 30000,
    method: 'POST',
    bodySize: 1024,
  };
  throw contextError;
}
```

### Pre-Flight Checks

Validate prerequisites before running tests:

```javascript
function validatePrerequisites() {
  const issues = [];
  
  // Check environment
  if (!process.env.APP_URL && !process.env.APP_URL_PUBLIC) {
    issues.push('Missing APP_URL or APP_URL_PUBLIC environment variable');
  }
  
  // Check Chrome availability
  const chromePath = process.env.PUPPETEER_EXECUTABLE_PATH || 
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  if (!fs.existsSync(chromePath)) {
    issues.push(`Chrome not found at ${chromePath}`);
  }
  
  // Check test file readiness
  if (!fs.existsSync('./scripts/test-utils.js')) {
    issues.push('test-utils.js not found - cannot run tests');
  }
  
  if (issues.length > 0) {
    console.error('❌ Prerequisites not met:\n');
    issues.forEach(issue => console.error(`  • ${issue}`));
    process.exit(1);
  }
  
  console.log('✓ All prerequisites met');
}
```

### Timeout Handling

Use `withTimeout()` to add meaningful timeout messages:

```javascript
const { withTimeout } = require('./test-utils');

try {
  await withTimeout(
    page.goto(url),
    30000,
    'Page load'
  );
} catch (error) {
  console.error(`Page took too long to load. Common causes:
    1. Network issue - check internet connectivity
    2. Server down - check ${url}
    3. Browser crash - check Chrome process
  
  Error: ${error.message}`);
  process.exit(1);
}
```

## Observability in Production

### Logging Best Practices

In `Code.js`, always log meaningful operations:

```javascript
// ✅ Good - includes context and outcome
Logger.log('TEAM_CREATED: ' + teamId + ' by ' + userEmail + ' - ' + (Date.now() - startTime) + 'ms');

// ❌ Bad - no context
Logger.log('done');
```

### Error Logging Pattern

```javascript
function safeApiCall(endpoint, data) {
  const startTime = Date.now();
  try {
    const response = UrlFetchApp.fetch(endpoint, {
      method: 'post',
      payload: JSON.stringify(data),
      muteHttpExceptions: true
    });
    
    Logger.log('API_CALL_SUCCESS: ' + endpoint + ' - ' + (Date.now() - startTime) + 'ms');
    return JSON.parse(response.getContentText());
    
  } catch (error) {
    Logger.log('API_CALL_FAILED: ' + endpoint + ' - ' + error.toString() + 
               ' [' + (Date.now() - startTime) + 'ms]');
    throw error;
  }
}
```

### Monitoring for Patterns

Log patterns help identify recurring issues:

```javascript
// Count errors by type
const ERROR_LOG_PATTERN = /ERROR_(\w+): (.+)/;

// Parse logs:
// ERROR_TIMEOUT: Page load - 30000ms
// ERROR_NETWORK: CDN unreachable - net::ERR_NAME_NOT_RESOLVED
// ERROR_AUTH: Invalid deployment ID
```

## Dependency Security

### npm audit Integration

The CI pipeline now runs `npm audit --audit-level=moderate`:

```bash
# Local check
npm audit --audit-level=moderate

# Fix vulnerabilities
npm audit fix --audit-level=moderate

# Check specific package
npm audit --json | jq '.[] | select(.advisories[].module=="lodash")'
```

### Fixing Vulnerabilities

```bash
# Update all dependencies
npm update

# Update specific package
npm install <package>@latest

# Force resolution for indirect dependencies
# Edit package.json with resolution field (npm 8+):
{
  "overrides": {
    "lodash": "^4.17.21"
  }
}
```

### Dependencies to Monitor

High-risk packages (especially in tests):
- `puppeteer-core` - Browser automation
- `axios` - HTTP requests  
- `googleapis` - Google API client
- `@google/clasp` - Deployment tool

## Logging Setup for Tests

### Per-Test Logging

```javascript
// scripts/test-runner.js
function createTestLogger(testName) {
  const prefix = `[${testName}]`;
  return {
    info: (msg) => console.log(`${prefix} ℹ️  ${msg}`),
    success: (msg) => console.log(`${prefix} ✓ ${msg}`),
    error: (msg) => console.error(`${prefix} ✗ ${msg}`),
    debug: (msg) => {
      if (process.env.DEBUG) console.log(`${prefix} 🐛 ${msg}`);
    }
  };
}

// Usage
const log = createTestLogger('CRUD');
log.info('Starting CRUD operations');
log.success('Created team');
log.error('Failed to delete team');
```

### Environment-Specific Logging

```bash
# Verbose logging
DEBUG=true npm run test:integration

# Production logging (minimal)
npm run test:integration

# CI logging (detailed for artifacts)
CI=true npm run test:integration
```

## Debugging Tips

### Access Page Console Logs

```javascript
page.on('console', msg => {
  const type = msg.type().substr(0, 3).toUpperCase();
  console.log(`[PAGE ${type}] ${msg.text()}`);
});

page.on('error', err => console.log('PAGE ERROR:', err));
page.on('pageerror', err => console.log('PAGE CRASH:', err));
```

### Capture Network Requests

```javascript
page.on('response', response => {
  if (!response.ok()) {
    console.log(`✗ ${response.status()} ${response.url()}`);
  }
});

page.on('requestfailed', request => {
  console.log(`✗ Failed: ${request.failure().errorText}`);
});
```

### Take Screenshots on Failure

```javascript
try {
  await testSomething();
} catch (error) {
  await page.screenshot({
    path: `./tests/screenshots/failure-${Date.now()}.png`
  });
  throw error;
}
```

---

**Summary:** Use context-rich errors, validate prerequisites, log patterns for monitoring, and check dependencies for security.
