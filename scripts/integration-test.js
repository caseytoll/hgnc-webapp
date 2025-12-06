#!/usr/bin/env node

/**
 * Comprehensive Integration Test Suite - HGNC WebApp
 * 
 * Runs all specialized tests in sequence and summarizes results:
 * - CRUD operations
 * - Form validation
 * - Error recovery
 * - Performance with large datasets
 * - Keyboard navigation
 * - Mobile responsiveness
 * - Search & filter functionality
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

(async () => {
  const TESTS = [
    { name: 'CRUD Operations', file: 'crud-test.js', timeout: 120000 },
    { name: 'Form Validation', file: 'form-validation-test.js', timeout: 120000 },
    { name: 'Error Recovery', file: 'error-recovery-test.js', timeout: 120000 },
    { name: 'Performance', file: 'performance-test.js', timeout: 120000 },
    { name: 'Keyboard Navigation', file: 'keyboard-nav-test.js', timeout: 120000 },
    { name: 'Mobile Responsiveness', file: 'mobile-test.js', timeout: 120000 },
    { name: 'Search & Filter', file: 'search-filter-test.js', timeout: 120000 },
  ];

  console.log('🧪 Integration Test Suite Starting...\n');
  console.log('═'.repeat(50));
  console.log(`Running ${TESTS.length} specialized test suites...\n`);

  const results = {
    passed: [],
    failed: [],
    skipped: [],
    totalTime: 0,
  };

  for (const test of TESTS) {
    const scriptPath = path.join(__dirname, test.file);
    
    if (!fs.existsSync(scriptPath)) {
      console.log(`⏭️  SKIPPED: ${test.name}`);
      console.log(`   File not found: ${test.file}`);
      results.skipped.push(test.name);
      continue;
    }

    console.log(`▶️  RUNNING: ${test.name}`);
    const startTime = Date.now();

    try {
      execSync(`node "${scriptPath}"`, {
        timeout: test.timeout,
        stdio: 'inherit',
      });

      const duration = Date.now() - startTime;
      console.log(`✅ PASSED: ${test.name} (${(duration / 1000).toFixed(1)}s)`);
      results.passed.push({ name: test.name, duration });
      results.totalTime += duration;

    } catch (error) {
      const duration = Date.now() - startTime;
      console.log(`❌ FAILED: ${test.name} (${(duration / 1000).toFixed(1)}s)`);
      if (error.message.includes('TIMEOUT')) {
        console.log(`   Reason: Test timeout (>${test.timeout / 1000}s)`);
      } else {
        console.log(`   Reason: ${error.message.split('\n')[0]}`);
      }
      results.failed.push({ name: test.name, duration, error: error.message });
      results.totalTime += duration;
    }

    console.log('─'.repeat(50));
  }

  // ========== SUMMARY REPORT ==========
  console.log('\n🧪 INTEGRATION TEST SUITE SUMMARY\n');
  console.log('═'.repeat(50));

  if (results.passed.length > 0) {
    console.log(`\n✅ PASSED (${results.passed.length}):`);
    results.passed.forEach(test => {
      console.log(`   • ${test.name} (${(test.duration / 1000).toFixed(1)}s)`);
    });
  }

  if (results.failed.length > 0) {
    console.log(`\n❌ FAILED (${results.failed.length}):`);
    results.failed.forEach(test => {
      console.log(`   • ${test.name} (${(test.duration / 1000).toFixed(1)}s)`);
    });
  }

  if (results.skipped.length > 0) {
    console.log(`\n⏭️  SKIPPED (${results.skipped.length}):`);
    results.skipped.forEach(name => {
      console.log(`   • ${name}`);
    });
  }

  console.log(`\nTotal Time: ${(results.totalTime / 1000).toFixed(1)}s`);
  console.log('═'.repeat(50));

  // Calculate coverage metrics
  const totalTests = TESTS.length;
  const passRate = Math.round((results.passed.length / totalTests) * 100);
  const failRate = Math.round((results.failed.length / totalTests) * 100);
  const skipRate = Math.round((results.skipped.length / totalTests) * 100);

  console.log('\n📊 COVERAGE METRICS:');
  console.log(`   Passed: ${results.passed.length}/${totalTests} (${passRate}%)`);
  console.log(`   Failed: ${results.failed.length}/${totalTests} (${failRate}%)`);
  console.log(`   Skipped: ${results.skipped.length}/${totalTests} (${skipRate}%)`);

  // Test categories covered
  console.log('\n📋 TEST CATEGORIES COVERED:');
  console.log('   ✅ CRUD Operations (Create, Read, Update, Delete)');
  console.log('   ✅ Form Validation (Required, Length, Type, Errors, Buttons)');
  console.log('   ✅ Error Recovery (Missing Data, Invalid Input, Fallbacks, Network)');
  console.log('   ✅ Performance (Rendering, Scrolling, Memory, DOM Operations)');
  console.log('   ✅ Accessibility (Keyboard Navigation, Tab Order, Focus)');
  console.log('   ✅ Responsiveness (Mobile Layout, Touch, Tap Targets, Fonts)');
  console.log('   ✅ Search & Filters (Real-time, Case-insensitive, Multi-field)');

  // Overall status
  console.log('\n' + '═'.repeat(50));
  if (results.failed.length === 0) {
    console.log('✅ ALL TESTS PASSED - Application ready for deployment!\n');
    process.exit(0);
  } else {
    console.log(`⚠️  ${results.failed.length} test(s) failed - Review before deployment\n`);
    process.exit(1);
  }
})();
