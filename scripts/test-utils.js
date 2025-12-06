/**
 * Test Utilities - Common helpers for all integration tests
 * Provides: retry logic, error handling, timeouts
 */

/**
 * Retry a function with exponential backoff
 * @param {Function} fn - Async function to retry
 * @param {number} maxAttempts - Maximum number of attempts (default: 3)
 * @param {number} initialDelayMs - Initial delay in ms (default: 500)
 * @param {string} context - Description for logging
 * @returns {Promise} - Result of successful execution
 */
async function retryWithBackoff(fn, maxAttempts = 3, initialDelayMs = 500, context = 'operation') {
  let lastError;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`[Attempt ${attempt}/${maxAttempts}] ${context}...`);
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt < maxAttempts) {
        const delayMs = initialDelayMs * Math.pow(2, attempt - 1); // exponential backoff
        console.log(`  ✗ Failed: ${error.message}`);
        console.log(`  ↻ Retrying in ${delayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }
  
  // All attempts exhausted
  throw new Error(`${context} failed after ${maxAttempts} attempts: ${lastError.message}`);
}

/**
 * Navigate with retry logic
 * @param {Page} page - Puppeteer page object
 * @param {string} url - URL to navigate to
 * @param {Object} options - Navigation options
 * @returns {Promise}
 */
async function navigateWithRetry(page, url, options = {}) {
  const defaultOptions = {
    waitUntil: 'networkidle2',
    timeout: 30000,
  };
  
  return retryWithBackoff(
    () => page.goto(url, { ...defaultOptions, ...options }),
    3,
    500,
    `Navigate to ${url}`
  );
}

/**
 * Click element with retry logic
 * @param {Page} page - Puppeteer page object
 * @param {string} selector - CSS selector
 * @returns {Promise}
 */
async function clickWithRetry(page, selector) {
  return retryWithBackoff(
    async () => {
      await page.waitForSelector(selector, { timeout: 5000 });
      await page.click(selector);
    },
    3,
    300,
    `Click ${selector}`
  );
}

/**
 * Wait for element with retry
 * @param {Page} page - Puppeteer page object
 * @param {string} selector - CSS selector
 * @param {number} timeout - Timeout in ms
 * @returns {Promise}
 */
async function waitForElementWithRetry(page, selector, timeout = 5000) {
  return retryWithBackoff(
    () => page.waitForSelector(selector, { timeout }),
    2,
    300,
    `Wait for ${selector}`
  );
}

/**
 * Evaluate script with retry
 * @param {Page|Frame} context - Page or Frame object
 * @param {Function|string} fn - Function or script to evaluate
 * @returns {Promise}
 */
async function evaluateWithRetry(context, fn) {
  return retryWithBackoff(
    () => context.evaluate(fn),
    2,
    300,
    'Script evaluation'
  );
}

/**
 * Get better error message from test failure
 * @param {Error} error - Error object
 * @returns {string} - Formatted error message
 */
function formatErrorMessage(error) {
  const lines = [];
  lines.push(`\n❌ ERROR: ${error.message}`);
  
  if (error.stack) {
    const stackLines = error.stack.split('\n').slice(0, 5);
    lines.push('Stack trace:');
    stackLines.forEach(line => lines.push(`  ${line}`));
  }
  
  return lines.join('\n');
}

/**
 * Create a timeout promise that rejects after N ms
 * @param {number} ms - Milliseconds
 * @param {string} message - Timeout message
 * @returns {Promise}
 */
function createTimeout(ms, message = `Timeout after ${ms}ms`) {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(message)), ms);
  });
}

/**
 * Race between a promise and a timeout
 * @param {Promise} promise - Promise to race
 * @param {number} ms - Timeout in ms
 * @param {string} context - Context for error message
 * @returns {Promise}
 */
async function withTimeout(promise, ms, context = 'operation') {
  return Promise.race([
    promise,
    createTimeout(ms, `${context} timeout after ${ms}ms`),
  ]);
}

module.exports = {
  retryWithBackoff,
  navigateWithRetry,
  clickWithRetry,
  waitForElementWithRetry,
  evaluateWithRetry,
  formatErrorMessage,
  createTimeout,
  withTimeout,
};
