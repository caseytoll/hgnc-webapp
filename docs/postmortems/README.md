# Post-Mortems

This folder contains comprehensive root cause analyses of incidents, outages, and critical issues. Post-mortems are blameless documents focused on learning and prevention.

## 📚 Documents in This Folder

### 🔍 Recent Post-Mortems

1. **[CODE_INTERACTION_ISSUES_2025_12_11.md](CODE_INTERACTION_ISSUES_2025_12_11.md)** ⭐⭐⭐  
   *Time: 45 minutes*  
   **Date:** 2025-12-11  
   **Issue:** 6 critical function reference issues (hideView undefined, renderInsights not exposed, naming mismatches)  
   **Root Causes:** JavaScript scope confusion, incomplete implementation, inconsistent naming  
   **Prevention:** Updated development principles, module contracts, pre-deployment checklist

2. **[POST_MORTEM_CSS_SPECIFICITY_2025_12_10.md](POST_MORTEM_CSS_SPECIFICITY_2025_12_10.md)** ⭐⭐  
   *Time: 30 minutes*  
   **Date:** 2025-12-10  
   **Issue:** CSS specificity conflicts causing styling issues  
   **Root Causes:** Cascading style conflicts, selector specificity problems  
   **Prevention:** CSS organization standards, specificity guidelines

## 🎯 Purpose of Post-Mortems

Post-mortems serve multiple purposes:

### Learning
- Understand what went wrong and why
- Identify contributing factors beyond immediate cause
- Build institutional knowledge

### Prevention
- Document specific action items to prevent recurrence
- Update processes and documentation
- Improve testing and validation

### Culture
- Maintain blameless environment
- Encourage transparency and learning
- Share knowledge across team

## 📋 Post-Mortem Template

When creating a new post-mortem, use the template from `../templates/post-mortem-template.md` and include:

1. **Incident Summary** - What happened and when
2. **Timeline** - Chronological sequence of events
3. **Root Cause Analysis** - Deep dive into contributing factors
4. **Impact Assessment** - Who/what was affected
5. **Resolution** - How the issue was fixed
6. **Prevention Measures** - Actions to prevent recurrence
7. **Lessons Learned** - Key takeaways

## 🔍 How to Use Post-Mortems

### For New Team Members
- Read recent post-mortems to understand common pitfalls
- Learn from past mistakes without repeating them
- Understand team's learning culture

### When Debugging
- Search for similar issues in past post-mortems
- Check if issue has occurred before
- Review prevention measures that may have been missed

### During Development
- Reference prevention strategies from relevant post-mortems
- Apply lessons learned to current work
- Update post-mortems if new information emerges

## 📊 Post-Mortem Statistics

**Total Post-Mortems:** 2 (as of 2025-12-11)

**Categories:**
- Code Quality: 1
- CSS/Styling: 1

**Most Common Root Causes:**
1. Incomplete implementation
2. Lack of integration testing
3. Inconsistent naming/patterns

## 🔗 Related Documentation

- **Operations**: See `../operations/` for health assessments and audits
- **Standards**: See `../standards/` for coding standards that prevent issues
- **Testing**: See `../testing/` for testing strategies that catch issues early
- **Getting Started**: See `../getting-started/DEVELOPMENT-PRINCIPLES.md` for updated principles

## 💡 Contributing

If you encounter a significant issue:
1. Create a post-mortem using the template
2. Include thorough root cause analysis
3. Document specific prevention measures
4. Update related documentation
5. Share findings with the team

**Remember:** Post-mortems are blameless. Focus on systems and processes, not individuals.

---

*Last Updated: 2025-12-11*
