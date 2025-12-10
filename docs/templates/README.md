# Templates

This folder contains document templates to ensure consistency across project documentation.

## 📚 Available Templates

1. **[post-mortem-template.md](post-mortem-template.md)** ⭐⭐⭐  
   *Use for:* Creating incident post-mortems and root cause analyses  
   **Sections:** Incident summary, timeline, root cause analysis, impact, resolution, prevention, lessons learned

2. **[feature-spec-template.md](feature-spec-template.md)** ⭐⭐⭐  
   *Use for:* Documenting new feature specifications  
   **Sections:** Overview, requirements, design, implementation, testing, deployment

3. **[api-documentation-template.md](api-documentation-template.md)** ⭐⭐  
   *Use for:* Documenting APIs and interfaces  
   **Sections:** Endpoint description, parameters, responses, examples, error handling

## 🎯 Why Use Templates?

Templates provide:
- **Consistency** - All documents follow the same structure
- **Completeness** - Important sections aren't forgotten
- **Efficiency** - Start with a proven structure
- **Quality** - Built-in best practices

## 📋 How to Use Templates

### 1. Choose the Right Template
Match your document type to the appropriate template:
- Incident/issue analysis → `post-mortem-template.md`
- New feature → `feature-spec-template.md`
- API/interface → `api-documentation-template.md`

### 2. Copy the Template
```bash
# Example: Create a new post-mortem
cp docs/templates/post-mortem-template.md docs/postmortems/POST_MORTEM_[ISSUE]_[DATE].md
```

### 3. Fill in All Sections
- Don't skip sections - mark as "N/A" if not applicable
- Be thorough and specific
- Add context and examples
- Include dates and version information

### 4. Review and Update
- Have someone review your document
- Update template if you find missing sections
- Keep templates current with project needs

## 🔧 Customizing Templates

Templates should evolve with project needs:

### When to Update a Template
- Missing critical sections
- Sections are consistently marked "N/A"
- New patterns emerge from recent documents
- Team feedback suggests improvements

### How to Update
1. Propose changes to the team
2. Update the template
3. Document changes in `CHANGELOG.md`
4. Update this README if adding new templates
5. Notify team of changes

## 📊 Template Usage Guidelines

### Required Information
All templates should include:
- **Title** - Clear, descriptive name
- **Date** - Creation and last updated dates
- **Author** - Who created/maintains the document
- **Version** - If applicable

### Naming Conventions
- Post-mortems: `POST_MORTEM_[ISSUE]_YYYY_MM_DD.md`
- Features: `FEATURE_[NAME]_SPEC.md`
- APIs: `API_[SERVICE]_DOCUMENTATION.md`

### Storage Locations
- Post-mortems → `../postmortems/`
- Feature specs → `../operations/` or dedicated feature folder
- API docs → `../standards/` or dedicated API folder

## 🔗 Related Documentation

- **Standards**: See `../standards/` for documentation standards
- **Post-mortems**: See `../postmortems/` for post-mortem examples
- **Operations**: See `../operations/DOCUMENTATION_MAINTENANCE.md` for maintenance guidelines

## 💡 Contributing New Templates

To add a new template:
1. Identify a recurring document type that needs standardization
2. Create a comprehensive template with all necessary sections
3. Add clear instructions and examples in the template
4. Update this README with the new template
5. Share with the team for feedback
6. Add to `DOCUMENTATION_INDEX.md`

## 📝 Template Checklist

Before finalizing any template:
- [ ] All sections are clearly labeled
- [ ] Instructions are provided for each section
- [ ] Examples are included where helpful
- [ ] Metadata section (title, date, author) is included
- [ ] Related documentation is linked
- [ ] Template is added to this README
- [ ] Template is added to `DOCUMENTATION_INDEX.md`

---

*Last Updated: 2025-12-11*
