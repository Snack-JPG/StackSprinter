# 🚀 OIDC Deployment Guide

Deploy without storing Vercel tokens by using GitHub Actions with OpenID Connect (OIDC).

## 🎯 Why OIDC?

- **No long-lived tokens** in GitHub Secrets
- **Automatic token rotation** by GitHub
- **Improved security** with short-lived credentials
- **Audit trail** of all deployments

## ⚡ Quick Setup

### 1. Configure Vercel Integration

```bash
# Install Vercel GitHub App
# Visit: https://github.com/apps/vercel

# Link your repository
vercel link --project your-app-name
```

### 2. Enable OIDC in GitHub Actions

Update your `.github/workflows/deploy.yml`:

```yaml
name: Deploy with OIDC

on:
  push:
    branches: [main]

permissions:
  id-token: write
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          
      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: '8'
          
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
        
      - name: Build application
        run: pnpm build
        
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}  # Still needed for now
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

### 3. Set Required Secrets

```bash
# Get your Vercel org and project IDs
vercel project ls
vercel org ls

# Set in GitHub repository secrets
gh secret set VERCEL_ORG_ID --body "your_org_id"
gh secret set VERCEL_PROJECT_ID --body "your_project_id"
```

## 🔧 Full OIDC Setup (Advanced)

For complete token-free deployment:

### 1. Create Vercel OIDC Provider

```bash
# This feature is coming to Vercel soon
# For now, we use the GitHub App integration
```

### 2. Configure Trust Relationship

```json
{
  "oidc": {
    "issuer": "https://token.actions.githubusercontent.com",
    "audience": "sts.amazonaws.com",
    "subject": "repo:your-org/your-repo:ref:refs/heads/main"
  }
}
```

### 3. Modified GitHub Actions Workflow

```yaml
name: Deploy with Full OIDC

on:
  push:
    branches: [main]

permissions:
  id-token: write
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Configure OIDC Token
        uses: actions/github-script@v7
        with:
          script: |
            const token = await core.getIDToken('vercel.com')
            core.setSecret(token)
            core.exportVariable('VERCEL_OIDC_TOKEN', token)
            
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
        
      - name: Deploy with OIDC
        run: |
          npx vercel@latest \
            --token $VERCEL_OIDC_TOKEN \
            --prod \
            --yes
```

## 🏗️ StackSprinter OIDC Integration

Update StackSprinter to support OIDC deployment:

### Enhanced CLI Command

```bash
pnpm dlx tsx cli/stacksprinter.ts create \
  --app-name "my-app" \
  --deployment-method "oidc" \
  --github-org "my-org"
```

### Updated Workflow Template

StackSprinter will generate workflows with OIDC configuration:

```yaml
# Generated .github/workflows/deploy.yml
name: StackSprinter Deploy

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

permissions:
  id-token: write
  contents: read
  pull-requests: write

env:
  NODE_VERSION: '18'
  PNPM_VERSION: '8'

jobs:
  deploy:
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          
      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: ${{ env.PNPM_VERSION }}
          
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
        
      - name: Build application
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
        run: pnpm build
        
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

## 🔒 Security Benefits

### Token Lifecycle
- **Short-lived**: OIDC tokens expire in minutes
- **Scoped**: Limited to specific repository and branch  
- **Auditable**: All deployments logged in GitHub Actions
- **Revocable**: Disable by updating workflow permissions

### Comparison

| Method | Security | Setup | Maintenance |
|--------|----------|-------|-------------|
| **Long-lived Token** | ⚠️ Medium | Easy | Manual rotation |
| **GitHub App** | ✅ Good | Medium | Automatic |
| **OIDC** | ✅ Excellent | Complex | Automatic |

## 🔧 Troubleshooting OIDC

### Common Issues

**Token not generated**:
```bash
# Check permissions in workflow
permissions:
  id-token: write  # Required for OIDC
  contents: read
```

**Invalid audience**:
```bash
# Verify audience in getIDToken call
const token = await core.getIDToken('vercel.com')  # Must match Vercel config
```

**Deployment fails**:
```bash
# Check Vercel project is linked
vercel link --project your-project-id

# Verify org and project IDs
echo $VERCEL_ORG_ID
echo $VERCEL_PROJECT_ID
```

### Debug Mode

Enable debug logging in GitHub Actions:

```yaml
- name: Debug OIDC Token
  env:
    ACTIONS_STEP_DEBUG: true
  run: |
    echo "Token audience: vercel.com"
    echo "Repository: $GITHUB_REPOSITORY"
    echo "Ref: $GITHUB_REF"
```

## 🚀 Migration Guide

### From Token to OIDC

1. **Install Vercel GitHub App**:
   ```bash
   # Visit: https://github.com/apps/vercel
   # Install on your repository
   ```

2. **Update Secrets**:
   ```bash
   # Remove old token
   gh secret delete VERCEL_TOKEN
   
   # Add new identifiers
   gh secret set VERCEL_ORG_ID --body "your_org_id"
   gh secret set VERCEL_PROJECT_ID --body "your_project_id"
   ```

3. **Update Workflow**:
   ```bash
   # Replace .github/workflows/deploy.yml
   # Use OIDC template above
   ```

4. **Test Deployment**:
   ```bash
   # Push to main branch
   git push origin main
   
   # Monitor GitHub Actions
   gh workflow view deploy
   ```

## 📋 Checklist

- [ ] Vercel GitHub App installed and configured
- [ ] Repository linked to Vercel project
- [ ] OIDC permissions added to workflow
- [ ] Org and Project IDs set as secrets
- [ ] Old VERCEL_TOKEN removed from secrets
- [ ] Test deployment completed successfully
- [ ] Monitor first few deployments for issues

---

**OIDC provides the most secure deployment method. Once set up, you'll never worry about token rotation again!** 🔒