# 🔐 Security Guide

StackSprinter follows security-first principles to protect your applications and credentials.

## 🎯 Token Scopes

### Supabase Access Token
- **Scope**: Organization-level access
- **Purpose**: Create projects, manage database schemas, run migrations
- **Never use**: Service role keys in CLI operations
- **Get it**: [Supabase Dashboard → Account → Access Tokens](https://supabase.com/dashboard/account/tokens)

### Vercel Token
- **Scope**: Deploy and environment management
- **Purpose**: Deploy applications, set environment variables
- **Alternative**: Use OIDC for GitHub Actions (see [oidc.md](oidc.md))
- **Get it**: [Vercel → Account Settings → Tokens](https://vercel.com/account/tokens)

### GitHub Token
- **Scope**: `repo` access only
- **Purpose**: Create repositories, push code, manage basic settings
- **Never grant**: Admin, delete, or organization permissions beyond necessary
- **Get it**: [GitHub → Settings → Developer settings → Tokens](https://github.com/settings/tokens)

## 🛡️ Secret Management

### Environment Variables
```bash
# ✅ GOOD - Local development only
cp .env.example .env
# Edit .env with your tokens

# ❌ BAD - Never commit secrets
git add .env  # This is blocked by .gitignore
```

### CI/CD Secrets
```bash
# ✅ GOOD - Use GitHub Secrets
gh secret set SUPABASE_ACCESS_TOKEN --body "your_token"

# ✅ BETTER - Use OIDC (no tokens needed)
# See docs/oidc.md for setup
```

### Token Redaction
StackSprinter automatically redacts secrets in logs:
```typescript
// Patterns automatically redacted:
// - Supabase keys: sb[a-zA-Z0-9]{40,}
// - Vercel tokens: vercel_[a-zA-Z0-9]{24}
// - GitHub tokens: ghp_[a-zA-Z0-9]{36}
// - Any key/token/password patterns
```

## 🚫 What We Never Do

- **Print secrets** to stdout or logs
- **Store service role keys** - only anon keys for client-side use
- **Commit credentials** - `.env` is git-ignored
- **Transmit tokens** unnecessarily - scoped to minimum required operations
- **Cache credentials** - fresh authentication per session

## 🔒 Database Security

### Row Level Security (RLS)
```sql
-- All tables have RLS enabled by default
CREATE POLICY "profiles_policy" ON profiles
  FOR ALL USING (auth.uid() = id);

-- Anonymous users can only read examples
CREATE POLICY "examples_read" ON examples
  FOR SELECT USING (true);
```

### Migration Safety
```typescript
// Migrations are validated before execution
const validation = validateQuery(migrationSQL);
if (!validation.valid) {
  throw new Error(`Migration blocked: ${validation.reason}`);
}
```

## 🤖 MCP Security

### Read-Only by Default
```json
{
  "env": {
    "ALLOW_WRITE": "false"  // Explicit opt-in required for writes
  }
}
```

### Query Validation
```typescript
// Blocked patterns in MCP queries:
const BLOCKED_PATTERNS = [
  /\b(INSERT|UPDATE|DELETE|DROP|CREATE|ALTER)\b/i,
  /\b(EXEC|EXECUTE|sp_|xp_)\b/i,
  /\b(INFORMATION_SCHEMA\.ROUTINES)\b/i
];
```

### Write Operation Gates
```typescript
function checkWritePermission(operation: string) {
  if (!process.env.ALLOW_WRITE) {
    throw new Error(`Write operation "${operation}" requires ALLOW_WRITE=true`);
  }
}
```

## 📋 Security Checklist

### Before Deployment
- [ ] Tokens have minimum required scopes
- [ ] `.env` file is not committed to git
- [ ] Service role keys are never used in client applications
- [ ] Database RLS policies are enabled and tested
- [ ] MCP server is configured with read-only permissions

### Production Setup
- [ ] Use OIDC instead of long-lived tokens where possible
- [ ] Enable Vercel's security features (headers, CSP)
- [ ] Configure Supabase auth policies appropriately
- [ ] Set up monitoring for authentication failures
- [ ] Regularly rotate access tokens

### Incident Response
- [ ] Immediately revoke compromised tokens
- [ ] Check audit logs for unauthorized access
- [ ] Update affected environment variables
- [ ] Force re-authentication for affected services
- [ ] Document and review security incident

## 🚨 Security Issues

If you discover a security vulnerability:

1. **Do NOT** open a public GitHub issue
2. **Do NOT** discuss in public forums
3. **Email**: security@stacksprinter.dev (not implemented yet)
4. **Include**: Detailed steps to reproduce
5. **Expect**: Response within 48 hours

## 🔄 Regular Maintenance

### Monthly
- Review and rotate access tokens
- Audit user permissions and access
- Check for dependency security updates
- Review authentication logs

### Quarterly  
- Update security dependencies
- Review RLS policies for new tables
- Audit MCP server permissions
- Security team review (if applicable)

---

**Remember**: Security is a process, not a destination. Stay vigilant and keep your tokens safe! 🛡️