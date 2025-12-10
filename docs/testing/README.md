# Testing

This folder contains testing documentation, strategies, frameworks, and guidelines for the HGNC WebApp project.

## 📚 Documents in This Folder

### 🎯 Essential Testing Guides

1. **[TESTING_README.md](TESTING_README.md)** ⭐⭐⭐  
   *Time: 30 minutes*  
   Comprehensive overview of testing strategy, tools, and procedures.

2. **[test-strategy.md](test-strategy.md)** ⭐⭐⭐  
   *Time: 25 minutes*  
   Overall testing strategy covering unit, integration, and E2E tests.

3. **[testing-checklist.md](testing-checklist.md)** ⭐⭐⭐  
   *Time: 15 minutes*  
   Pre-deployment testing checklist to ensure quality.

### 🧪 Test Types & Frameworks

4. **[unit-testing.md](unit-testing.md)** ⭐⭐  
   *Time: 20 minutes*  
   Unit testing guidelines and best practices.

5. **[integration-testing.md](integration-testing.md)** ⭐⭐  
   *Time: 25 minutes*  
   Integration testing strategies for module interactions.

6. **[e2e-testing.md](e2e-testing.md)** ⭐⭐  
   *Time: 30 minutes*  
   End-to-end testing with user flows and scenarios.

### 🛠️ Testing Tools & Utilities

7. **[test-utilities.md](test-utilities.md)** ⭐  
   *Time: 15 minutes*  
   Helper utilities and test harnesses.

8. **[mock-data.md](mock-data.md)** ⭐  
   *Time: 10 minutes*  
   Guidelines for creating and using mock data.

9. **[coverage-reporting.md](coverage-reporting.md)** ⭐  
   *Time: 15 minutes*  
   Code coverage metrics and reporting.

## 🎯 Testing Philosophy

Our testing approach prioritizes:

### Quality Over Speed
- Write tests that actually catch bugs
- Don't just chase coverage numbers
- Test realistic scenarios, not just happy paths

### Integration Over Isolation
- Unit tests are good, integration tests are better
- Test how components work together
- Catch issues that only appear in real usage

### Practical Over Perfect
- Focus on high-value tests
- Test critical user flows thoroughly
- Don't test trivial code

## 📋 Testing Levels

### 1. Unit Tests
**What:** Test individual functions in isolation  
**When:** For pure functions, utilities, helpers  
**Tools:** Node.js test scripts  
**Coverage:** ~60% of codebase

### 2. Integration Tests
**What:** Test how modules interact  
**When:** For feature flows, data handling  
**Tools:** Custom test harnesses  
**Coverage:** ~30% of codebase

### 3. End-to-End Tests
**What:** Test complete user flows  
**When:** For critical user journeys  
**Tools:** Manual testing, runtime checks  
**Coverage:** ~10% of workflows

## 🔧 Running Tests

### Quick Test Suite
```bash
# Run all tests
npm test

# Run specific test
node tests/test-html.js
node tests/test-tp.js
```

### Pre-Deployment Tests
```bash
# Full pre-deployment check
./scripts/pre-deploy-check.sh

# Individual checks
npm run lint
npm run test
./scripts/runtime-check.js
```

### Coverage Report
```bash
# Generate coverage report
npm run coverage
```

## 🐛 When Tests Fail

1. **Read the error message carefully**
2. **Check recent changes** - What did you modify?
3. **Run tests locally** - Reproduce the failure
4. **Isolate the issue** - Which specific test is failing?
5. **Check related files** - Did you update all dependencies?
6. **Review post-mortems** - Has this happened before?

See `../getting-started/DEBUGGING_STRATEGY.md` for systematic debugging.

## ✅ Writing Good Tests

### Do
- ✅ Test realistic scenarios
- ✅ Use descriptive test names
- ✅ Test edge cases and errors
- ✅ Keep tests simple and focused
- ✅ Mock external dependencies
- ✅ Make tests reproducible

### Don't
- ❌ Test implementation details
- ❌ Write flaky tests
- ❌ Skip error cases
- ❌ Create dependencies between tests
- ❌ Test third-party code
- ❌ Ignore failing tests

## 📊 Testing Metrics

**Current Test Suite:**
- Unit Tests: 5 test files
- Integration Tests: Runtime checks
- Test Coverage: ~70% (estimated)
- Test Execution Time: < 5 seconds

**Quality Metrics:**
- Zero linting errors (enforced)
- All tests must pass before deployment
- No known flaky tests

## 🔗 Related Documentation

- **Getting Started**: See `../getting-started/DEBUGGING_STRATEGY.md` for debugging
- **Deployment**: See `../deployment/` for deployment testing requirements
- **Standards**: See `../standards/` for code quality standards
- **Post-mortems**: See `../postmortems/` for lessons from testing gaps

## 💡 Testing Best Practices

### Before Writing Code
1. Understand what you're testing
2. Review existing tests for patterns
3. Plan test cases for new features

### While Writing Code
1. Write tests alongside code
2. Run tests frequently
3. Test edge cases and errors

### Before Committing
1. Run full test suite
2. Check test coverage
3. Verify no tests are skipped
4. Run linting

### In Pull Reviews
1. Review test quality, not just coverage
2. Ensure tests actually validate behavior
3. Check for realistic test data
4. Verify error cases are tested

---

*Last Updated: 2025-12-11*
