# Feature: [Feature Name]

**Status:** 🚧 In Development / ✅ Complete / 🔄 Iterating / ⏸️ On Hold  
**Version:** vXXX  
**Owner:** [Team/Person]  
**Last Updated:** YYYY-MM-DD

---

## Overview

### Purpose
One paragraph describing what this feature does and why it exists.

### User Benefit
What problem does this solve for users? What value does it provide?

---

## User Stories

### Primary Use Cases
1. **As a [user type]**, I want to [action], so that [benefit]
2. **As a [user type]**, I want to [action], so that [benefit]
3. **As a [user type]**, I want to [action], so that [benefit]

### Edge Cases Handled
- [Scenario 1]: [How it's handled]
- [Scenario 2]: [How it's handled]
- [Scenario 3]: [How it's handled]

---

## Technical Design

### Architecture
Brief description of how the feature is implemented.

**Components:**
- Component A: [responsibility]
- Component B: [responsibility]
- Component C: [responsibility]

### Data Flow
```
User Action → Component A → Component B → Data Store → UI Update
```

### Key Files
| File | Purpose | Lines |
|------|---------|-------|
| `file1.js` | [what it does] | XXX |
| `file2.html` | [what it does] | XXX |
| `file3.css` | [what it does] | XXX |

---

## Implementation Details

### Core Logic

**Primary Function: `functionName()`**
```javascript
/**
 * Description of what this does
 * @param {Type} paramName - Description
 * @returns {Type} Description
 */
function functionName(paramName) {
  // Key implementation details
}
```

### State Management
How does this feature manage state?
- Local state: [where/how]
- Persistent state: [where/how]
- Shared state: [where/how]

### Dependencies
- External libraries: [list]
- Internal modules: [list]
- APIs/Services: [list]

---

## User Interface

### Desktop View
Description of desktop UI/UX

**Key Elements:**
- Element 1: [description]
- Element 2: [description]

### Mobile View
Description of mobile UI/UX (if different)

**Responsive Breakpoints:**
- < 480px: [behavior]
- < 768px: [behavior]
- >= 768px: [behavior]

### Accessibility
- Keyboard navigation: [how it works]
- Screen reader support: [ARIA labels, etc.]
- Focus management: [how focus is handled]

---

## Configuration

### Settings
| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `setting1` | boolean | true | [what it controls] |
| `setting2` | number | 100 | [what it controls] |

### Feature Flags
- Flag name: `FEATURE_NAME_ENABLED`
- Default: `true` / `false`
- How to toggle: [instructions]

---

## Testing

### Test Coverage
- Unit tests: ✅ XX tests / ❌ Not yet
- Integration tests: ✅ XX tests / ❌ Not yet
- E2E tests: ✅ XX tests / ❌ Not yet

### Test Files
- `test-feature.js` - [what it tests]
- `feature-integration.test.js` - [what it tests]

### Manual Testing Checklist
- [ ] Desktop Chrome
- [ ] Desktop Safari
- [ ] Desktop Firefox
- [ ] Mobile Safari (iOS)
- [ ] Mobile Chrome (Android)
- [ ] Accessibility audit
- [ ] Performance check

### Known Issues
1. **Issue:** [Description]
   - **Severity:** Critical/High/Medium/Low
   - **Workaround:** [If available]
   - **Tracked in:** Issue #XXX

---

## Performance

### Metrics
- Initial load time: XXms
- Render time: XXms
- Memory usage: XXkb
- Bundle size impact: +XXkb

### Optimizations Applied
- [Optimization 1]: [impact]
- [Optimization 2]: [impact]

### Future Optimizations
- [ ] [Potential optimization]
- [ ] [Potential optimization]

---

## Error Handling

### Expected Errors
| Error | Cause | User Message | Resolution |
|-------|-------|--------------|------------|
| ErrorType1 | [cause] | "[message]" | [how it's handled] |
| ErrorType2 | [cause] | "[message]" | [how it's handled] |

### Logging
What gets logged and when:
- Success: [what is logged]
- Errors: [what is logged]
- Debug info: [what is logged]

---

## Deployment

### Prerequisites
- [ ] Requirement 1
- [ ] Requirement 2
- [ ] Data migration (if needed)

### Rollout Strategy
- [ ] Feature flag enabled for testing
- [ ] Beta rollout to 10% users
- [ ] Full rollout
- [ ] Monitoring enabled

### Rollback Plan
If something goes wrong:
1. [Step 1]
2. [Step 2]
3. [Step 3]

---

## Monitoring

### Key Metrics
- Metric 1: [what to track]
- Metric 2: [what to track]
- Metric 3: [what to track]

### Alerts
- Alert if: [condition]
- Alert if: [condition]

### Dashboards
- Dashboard link: [URL]
- Key graphs: [what to watch]

---

## Documentation

### User-Facing
- [ ] Help text/tooltips added
- [ ] User guide updated
- [ ] FAQ updated
- [ ] Video tutorial (if applicable)

### Developer-Facing
- [ ] Code comments
- [ ] API documentation
- [ ] Architecture diagram
- [ ] This feature doc

---

## Changelog

### Version History

**vXXX (YYYY-MM-DD)**
- Initial implementation
- [Key changes]

**vXXX (YYYY-MM-DD)**
- [Changes made]
- [Bug fixes]

---

## Future Enhancements

### Short-term (Next Sprint)
- [ ] Enhancement 1
- [ ] Enhancement 2

### Long-term (Backlog)
- [ ] Enhancement 3
- [ ] Enhancement 4

### Ideas/Wishlist
- Idea 1: [description]
- Idea 2: [description]

---

## Related Documentation

- [Related feature]: `docs/features/other-feature.md`
- [API docs]: `docs/api/endpoint.md`
- [Testing guide]: `docs/testing/TESTING_README.md`
- [Design doc]: `docs/design/feature-design.md`

---

## Lessons Learned

### What Went Well
- [Positive aspect 1]
- [Positive aspect 2]

### Challenges
- [Challenge 1]: [how it was solved]
- [Challenge 2]: [how it was solved]

### Would Do Differently
- [Insight 1]
- [Insight 2]

---

## Appendix

### Design Mockups
[Link to designs or embed images]

### API Contracts
```javascript
// Request format
{
  "field1": "value",
  "field2": 123
}

// Response format
{
  "status": "success",
  "data": {}
}
```

### Database Schema Changes
```sql
-- Migration up
ALTER TABLE ...

-- Migration down
ALTER TABLE ...
```
