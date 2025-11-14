# Pull Request

## Description
<!-- Provide a brief description of the changes in this PR -->

## Related Issues
<!-- Link related issues using keywords: Fixes #123, Closes #456, Related to #789 -->
- Fixes #
- Related to #

## Type of Change
<!-- Mark the relevant option with an [x] -->
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update
- [ ] Code refactoring (no functional changes)
- [ ] Performance improvement
- [ ] Test coverage improvement
- [ ] Build/CI improvement

## Changes Made
<!-- Provide a detailed list of changes -->
-
-
-

## Testing Performed
<!-- Describe the tests you ran to verify your changes -->

### Unit Tests
- [ ] All existing unit tests pass
- [ ] New unit tests added for new functionality
- [ ] Test coverage maintained/improved (>80%)

### Integration Tests
- [ ] All integration tests pass
- [ ] New integration tests added (if applicable)

### Manual Testing
- [ ] Tested on macOS
- [ ] Tested on Windows
- [ ] Tested on Linux
- [ ] Tested with VS Code version: [version]

### Test Scenarios Covered
1.
2.
3.

## Code Quality Checklist
- [ ] Code follows the project's TypeScript style guide
- [ ] ESLint passes with no errors (`npm run lint`)
- [ ] Prettier formatting applied (`npm run format`)
- [ ] No `any` types used (strict TypeScript)
- [ ] Functions are small and focused (<50 lines)
- [ ] Complex logic is documented with comments
- [ ] No console.log statements (proper logging used)
- [ ] Error handling is comprehensive and graceful

## Documentation
- [ ] Code changes are reflected in documentation
- [ ] JSDoc comments added for public APIs
- [ ] README.md updated (if needed)
- [ ] CHANGELOG.md updated
- [ ] User-facing changes documented in `docs/`

## Database Changes
<!-- If this PR includes database schema changes -->
- [ ] Migration script created
- [ ] Schema version updated
- [ ] Backward compatibility maintained
- [ ] Database tests updated

## Performance Impact
<!-- Describe any performance implications -->
- [ ] No significant performance impact
- [ ] Performance improved
- [ ] Performance regression (justified and documented)

**Benchmarks:**
<!-- If applicable, provide before/after metrics -->
- Before:
- After:

## Breaking Changes
<!-- List any breaking changes and migration steps -->
- [ ] No breaking changes
- [ ] Breaking changes documented below:

**Migration Guide:**
```
[Steps for users to migrate]
```

## Screenshots/Recordings
<!-- If applicable, add screenshots or screen recordings -->

**Before:**
<!-- Screenshot of old behavior -->

**After:**
<!-- Screenshot of new behavior -->

## Security Considerations
- [ ] No security implications
- [ ] Security impact assessed and documented
- [ ] No sensitive data logged or exposed
- [ ] Input validation added where necessary

## Additional Notes
<!-- Any additional information for reviewers -->

## Reviewer Checklist
<!-- For reviewers to complete -->
- [ ] Code changes make sense and are well-structured
- [ ] Tests are comprehensive and pass
- [ ] Documentation is clear and complete
- [ ] No obvious security issues
- [ ] Performance is acceptable
- [ ] Breaking changes are justified and documented
- [ ] Database changes are properly handled
- [ ] Code follows project conventions

## Pre-Merge Checklist
<!-- To be completed before merging -->
- [ ] All CI checks pass
- [ ] At least one approval received
- [ ] All review comments addressed
- [ ] Branch is up-to-date with target branch
- [ ] Conventional commit messages used
- [ ] Version bumped (if applicable)

---

## Commit Convention
This project uses [Conventional Commits](https://www.conventionalcommits.org/):
- `feat:` new feature
- `fix:` bug fix
- `docs:` documentation changes
- `test:` test additions/changes
- `refactor:` code refactoring
- `perf:` performance improvements
- `chore:` build/tooling changes
