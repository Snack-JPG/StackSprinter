# Contributing to StackSprinter

Thank you for your interest in contributing to StackSprinter! This document provides guidelines and information for contributors.

## 🎯 Project Vision

StackSprinter aims to eliminate the friction between having an idea and seeing it live on the web. We want to make full-stack web development as simple as a single command while maintaining production-grade quality and security.

## 🤝 How to Contribute

### Reporting Issues

1. **Check existing issues** first to avoid duplicates
2. **Use issue templates** when available
3. **Provide detailed information**:
   - Operating system and version
   - Node.js version
   - Complete error messages
   - Steps to reproduce
   - Expected vs actual behavior

### Feature Requests

1. **Search existing requests** to avoid duplicates
2. **Describe the use case** - what problem does this solve?
3. **Provide examples** of how the feature would be used
4. **Consider backwards compatibility** implications

### Pull Requests

1. **Fork the repository** and create a feature branch
2. **Follow coding standards** (see below)
3. **Write tests** for new functionality
4. **Update documentation** as needed
5. **Test locally** with the verification script
6. **Keep PRs focused** - one feature/fix per PR

## 🏗️ Development Setup

### Prerequisites

- Node.js 18+
- pnpm 8+
- Git
- All CLI tools (see README)

### Local Setup

```bash
# Clone your fork
git clone https://github.com/your-username/stacksprinter
cd stacksprinter

# Install dependencies
pnpm install

# Run the install script to verify setup
./scripts/install.sh --verbose

# Create a test app to verify functionality
pnpm dlx tsx cli/stacksprinter.ts create \\
  --app-name "test-app" \\
  --verbose
```

### Testing

```bash
# Type checking
pnpm run typecheck

# Run verification script
./scripts/verify.sh --app-name "test-app"

# Manual testing of CLI
pnpm dlx tsx cli/stacksprinter.ts --help
```

## 📋 Coding Standards

### TypeScript

- **Use strict TypeScript** - no `any` types without justification
- **Export interfaces** for all public APIs
- **Document complex functions** with JSDoc comments
- **Use meaningful names** for variables and functions
- **Prefer explicit types** over inference for public APIs

Example:
```typescript
/**
 * Creates a new Supabase project with the specified configuration
 */
export async function createSupabaseProject(
  appName: string,
  org: string = 'default',
  region: string = 'us-east-1'
): Promise<SupabaseProject> {
  // Implementation
}
```

### Error Handling

- **Use typed errors** with meaningful messages
- **Log errors** with appropriate level
- **Provide actionable error messages** to users
- **Clean up resources** on failure

Example:
```typescript
try {
  await execCommand(`supabase projects create ${projectName}`);
} catch (error) {
  logError(`Failed to create Supabase project: ${error.message}`, 'createProject');
  throw new Error(`Supabase project creation failed. Check your token and organization settings.`);
}
```

### Security

- **Never log secrets** - use `redactSecrets()` function
- **Validate all inputs** before passing to external commands
- **Use environment variables** for sensitive data
- **Follow principle of least privilege** for API permissions

Example:
```typescript
function validateQuery(query: string): { valid: boolean; reason?: string } {
  if (BLOCKED_PATTERNS.some(pattern => pattern.test(query))) {
    return { valid: false, reason: 'Query contains blocked operations' };
  }
  return { valid: true };
}
```

### CLI Design

- **Provide meaningful feedback** to users
- **Use consistent flag names** across commands
- **Support verbose mode** for debugging
- **Make operations idempotent** when possible
- **Fail fast** with clear error messages

## 🧪 Testing Guidelines

### Test App Creation

When testing CLI functionality:

```bash
# Use predictable names for test apps
stacksprinter create --app-name "test-feature-xyz"

# Clean up after testing
rm -rf test-feature-xyz/
# Also clean up remote resources manually
```

### MCP Testing

When testing MCP functionality:

```bash
# Set read-only mode for safety
export ALLOW_WRITE=false

# Test with sample queries
echo '{"jsonrpc": "2.0", "method": "tools/call", "params": {"name": "db_list_tables", "arguments": {"project_ref": "test"}}, "id": 1}' | tsx mcp/tools.ts
```

## 📝 Documentation Standards

### README Updates

- **Keep examples working** - test all code examples
- **Use consistent formatting** with existing patterns
- **Include expected outputs** for CLI commands
- **Update table of contents** if adding sections

### Code Comments

- **Document the why, not the what**
- **Use JSDoc** for functions and classes
- **Explain complex logic** inline
- **Keep comments up to date** with code changes

### Changelog

For significant changes, update the changelog following [Keep a Changelog](https://keepachangelog.com/) format:

```markdown
## [1.1.0] - 2024-01-15
### Added
- New MCP tool for database schema management
- Support for custom Supabase regions

### Changed
- Improved error messages for authentication failures

### Fixed
- Race condition in concurrent project creation
```

## 🔄 Release Process

### Version Bumping

We use semantic versioning:
- **Patch** (1.0.1): Bug fixes, no breaking changes
- **Minor** (1.1.0): New features, backwards compatible
- **Major** (2.0.0): Breaking changes

### Release Checklist

Before releasing:
- [ ] All tests pass
- [ ] Documentation is updated
- [ ] Examples work with new version
- [ ] Breaking changes are documented
- [ ] Version is bumped in package.json

## 🏷️ Areas for Contribution

### High Impact

1. **Additional cloud providers** - AWS, Azure, Railway
2. **More framework templates** - SvelteKit, Astro, Remix
3. **Enhanced MCP tools** - deployment management, monitoring
4. **Better error recovery** - automatic retry, rollback
5. **Performance optimizations** - parallel operations, caching

### Medium Impact

1. **Additional databases** - PlanetScale, Neon, MongoDB
2. **More authentication providers** - Auth0, Firebase Auth
3. **Enhanced CLI UX** - progress bars, spinner animations
4. **Template customization** - themes, starter content
5. **Monitoring integration** - Sentry, DataDog

### Lower Impact

1. **Code quality tools** - ESLint configs, Prettier
2. **Additional examples** - different industries/use cases
3. **Windows compatibility** - PowerShell scripts
4. **Bash completion** - tab completion for CLI
5. **Telemetry** - optional usage analytics

## 🐛 Common Issues

### Development Problems

**TypeScript errors:**
```bash
# Clear build cache
rm -rf node_modules/.cache
pnpm install
```

**CLI not working:**
```bash
# Rebuild and link
pnpm run build
npm link
```

**Supabase connection issues:**
```bash
# Check authentication
supabase auth status
# Re-login if needed
supabase auth login --token your_token
```

### Testing Issues

**State file conflicts:**
```bash
# Remove old state files
rm -rf test-*/.stacksprinter/
```

**Resource cleanup:**
```bash
# List and clean up test resources
vercel project ls | grep test-
gh repo list | grep test-
supabase projects list | grep test-
```

## 🤔 Questions?

- **Technical questions**: Open a discussion on GitHub
- **Bug reports**: Create an issue with reproduction steps
- **Feature ideas**: Start with a discussion before implementing
- **Security concerns**: Email security@stacksprinter.dev (not public issues)

## 📄 Legal

By contributing to StackSprinter, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to StackSprinter! 🚀