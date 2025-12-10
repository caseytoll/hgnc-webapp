# Standards & Best Practices

This folder contains coding standards, conventions, and best practices for the HGNC WebApp project.

## 📚 Documents in This Folder

1. **[code-style-guide.md](code-style-guide.md)** ⭐⭐⭐  
   *Time: 30 minutes*  
   Comprehensive code style guidelines covering JavaScript, HTML, and CSS conventions.

2. **[naming-conventions.md](naming-conventions.md)** ⭐⭐⭐  
   *Time: 20 minutes*  
   Naming conventions for functions, variables, files, and documentation.

3. **[pr-review-checklist.md](pr-review-checklist.md)** ⭐⭐⭐  
   *Time: 15 minutes*  
   Checklist for reviewing pull requests to ensure quality and consistency.

## 🎯 Why Standards Matter

Standards ensure:
- **Consistency** - Code looks like it was written by one person
- **Maintainability** - Future developers can understand and modify code easily
- **Quality** - Common pitfalls are avoided
- **Collaboration** - Team members have shared expectations

## 📋 Key Standards

### Code Style
- Use consistent indentation (2 spaces)
- Follow JavaScript ES6+ conventions
- Keep functions small and focused
- Document complex logic with comments

### Naming
- Functions: `camelCase` for internal, expose to `window` explicitly
- Variables: `camelCase` for local, `SCREAMING_SNAKE_CASE` for constants
- Files: `kebab-case.html` for includes, `SCREAMING_SNAKE_CASE.md` for root docs
- Classes: `PascalCase`

### Documentation
- Update docs when changing code
- Add JSDoc comments for public functions
- Keep README files current
- Create post-mortems for significant issues

### Testing
- Write tests for new features
- Ensure tests pass before committing
- Include integration tests for user flows
- Test edge cases and error conditions

## 🔍 Using Standards

### Before Coding
1. Review relevant standards for the area you're working in
2. Check `../getting-started/DEVELOPMENT-PRINCIPLES.md` for architectural patterns
3. Look at existing code for examples

### During Development
1. Follow code style guidelines
2. Use naming conventions consistently
3. Write clear, self-documenting code
4. Add comments for complex logic

### Before Submitting PR
1. Use `pr-review-checklist.md` to self-review
2. Run linters and formatters
3. Ensure tests pass
4. Update documentation as needed

## 🔗 Related Documentation

- **Getting Started**: See `../getting-started/DEVELOPMENT-PRINCIPLES.md` for architectural principles
- **Testing**: See `../testing/` for testing standards
- **Operations**: See `../operations/DOCUMENTATION_MAINTENANCE.md` for doc standards
- **Templates**: See `../templates/` for document templates

## 💡 Updating Standards

Standards evolve with the project. To propose changes:
1. Discuss with the team
2. Document rationale
3. Update affected files
4. Communicate changes
5. Add to `CHANGELOG.md`

## 📊 Standards Compliance

We use automated tools to enforce standards:
- **ESLint** - JavaScript linting
- **Prettier** - Code formatting (if configured)
- **HTML Validator** - HTML validation
- **Custom Scripts** - Project-specific checks

See `../testing/` for details on running these tools.

---

*Last Updated: 2025-12-11*
