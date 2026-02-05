# Contributing to Swiparr

Thank you for your interest in contributing to Swiparr! We welcome contributions from the community and are pleased to have you join us.

## 💚 Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code.

## 🤝 How to Contribute

### 1. Start with a Discussion

Before starting work on any significant changes, please open a discussion to:

- **Propose features** or improvements
- **Discuss bug fixes** and verify the issue
- **Get feedback** on your approach
- **Coordinate** with other contributors

**Discussion Categories:**
- 💡 [Ideas](https://github.com/m3sserstudi0s/swiparr/discussions/new?category=ideas) - New features
- 🐛 [Bugs](https://github.com/m3sserstudi0s/swiparr/discussions/new?category=bugs) - Bug reports
- ❓ [Q&A](https://github.com/m3sserstudi0s/swiparr/discussions/new?category=q-a) - Questions

### 2. Development Workflow

#### Set Up Your Environment

```bash
# Clone the repository
git clone https://github.com/m3sserstudi0s/swiparr.git
cd swiparr

# Install dependencies
npm install

# Start development server
npm run dev

# The app will be available at http://localhost:3000
```

#### Create a Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-bug-fix
```

#### Make Your Changes

- Follow the code style guidelines in [AGENTS.md](AGENTS.md)
- Ensure your code passes linting: `npm run lint`
- Test your changes thoroughly
- Add or update tests if applicable

#### Commit Your Changes

We follow conventional commits for clear, readable commit messages:

```bash
git commit -m "feat: add new swipe animation"
git commit -m "fix: resolve session timeout issue"
git commit -m "docs: update API documentation"
```

**Types:**
- `major`: Breaking changes (major version bump)
- `feat:` New feature (minor version bump)
- `patch`: Bug fix (patch version bump) (default)
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes (formatting, etc)
- `refactor:` Code refactoring
- `test:` Adding or updating tests
- `chore:` Maintenance tasks

These types can be combined, like: `major: feat`.

### 3. Submit a Pull Request

1. Push your branch to your fork
2. Open a Pull Request against the `main` branch
3. Fill out the PR template completely
4. Link any related discussions or issues
5. Wait for review and address feedback

**PR Requirements:**
- Clear description of changes
- Screenshots for UI changes
- Tests for new functionality
- Documentation updates
- Passes CI checks

### 4. Review Process

- Maintainers will review your PR within a few days
- Address any feedback or requested changes
- Once approved, your PR will be merged
- Your contribution will be included in the next release!

## 🎯 Areas for Contribution

### 🎨 Frontend / UI
- Improve mobile responsiveness
- Enhance accessibility (a11y)
- Create new UI components
- Animate interactions
- Design improvements

### 🔧 Backend / API
- Provider integrations (improve Emby/Plex)
- Performance optimizations
- New API endpoints
- Database improvements
- Security enhancements

### 📱 Features
- New swipe gestures
- Enhanced session controls
- Custom matching algorithms
- Social features
- Export/import functionality

### 📚 Documentation
- User guides and tutorials
- API documentation
- Installation guides
- Troubleshooting
- Translations

### 🧪 Testing
- Unit tests for components
- Integration tests for API
- E2E tests for user flows
- Test coverage improvements

### 🐛 Bug Fixes
- Browse existing issues in discussions
- Reproduce and fix bugs
- Improve error handling
- Edge case handling

## 📝 Code Guidelines

### TypeScript Standards
- Use strict mode
- Define explicit return types
- Avoid `any`, use proper types
- Follow existing patterns

### React Components
- Use functional components with hooks
- Server components by default
- `'use client'` only when needed
- Accessible markup

### Database Changes
- Use Drizzle ORM patterns
- Add migrations for schema changes
- Index foreign keys
- Use proper cascade rules

### API Routes
- Validate all inputs with Zod
- Return proper HTTP status codes
- Consistent error responses
- Document endpoints

## 🧪 Testing

While we have minimal tests currently, we welcome test contributions:

```bash
# Add tests as needed for new features
# Test patterns to be established
```

## 📖 Documentation

When contributing, ensure:

- Code is self-documenting with clear variable names
- Complex logic has comments
- API endpoints have JSDoc comments
- User-facing features have help text
- Update README.md if adding features

## 🐛 Reporting Issues

### Bug Reports

1. Search existing discussions first
2. Use the bug report template
3. Provide:
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details
   - Screenshots if applicable
   - Browser console logs

### Feature Requests

1. Check if similar feature exists
2. Open discussion in Ideas category
3. Explain:
   - The problem you're solving
   - Your proposed solution
   - Alternative approaches
   - Mockups if applicable

## 💬 Getting Help

- **Questions?** Use [Q&A discussions](https://github.com/m3sserstudi0s/swiparr/discussions/new?category=q-a)
- **Stuck?** Tag `@maintainers` in your discussion
- **Discord?** May be available in the future

## ⭐ Recognition

Contributors will be:
- Listed in release notes
- Mentioned in README.md (for significant contributions)
- Awarded GitHub contributor badge
- Invited to join the organization (for regular contributors)

## 🚫 What We Don't Accept

- ❌ AI-generated code without human review
- ❌ Breaking changes without discussion
- ❌ Code that compromises security
- ❌ Features that bloat the core experience
- ❌ Copyrighted material without proper attribution

## 📜 Legal

By contributing to Swiparr, you:
- Agree to license your contributions under MIT License
- Confirm you have the right to contribute this code
- Understand contributions may be used commercially

## 🙏 Thank You!

Your contributions make Swiparr better for everyone. Whether it's a small bug fix or a major feature, every contribution is valued and appreciated.

**Questions about contributing?** Open a [discussion](https://github.com/m3sserstudi0s/swiparr/discussions) and ask!

---

<div align="center">

**Happy contributing!** 🎉

<p>
  <a href="https://github.com/m3sserstudi0s/swiparr">🏠 Back to Main Repo</a> •
  <a href="https://swiparr.app">🎬 Try Swiparr Cloud</a>
</p>

</div>
