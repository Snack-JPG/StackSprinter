# 🧹 Complete Teardown Guide

Need to completely remove a StackSprinter application? This guide ensures clean removal of all resources.

## 🎯 Quick Teardown

For most cases, use this automated script:

```bash
./scripts/teardown.sh --app-name "your-app-name" --confirm
```

## 🔧 Manual Teardown

If you prefer manual control or the script isn't available:

### 1. Remove Vercel Project

```bash
# List your projects
vercel project ls

# Remove the specific project
vercel project rm your-app-name --yes

# Or via web interface:
# https://vercel.com/dashboard → Select project → Settings → General → Delete Project
```

### 2. Delete Supabase Project

```bash
# List your projects
supabase projects list

# Find your project reference
supabase projects delete your-project-ref --confirm

# Alternative: Web interface
# https://supabase.com/dashboard → Select project → Settings → General → Delete project
```

**⚠️ Warning**: Supabase project deletion is irreversible and will destroy all data.

### 3. Remove GitHub Repository

```bash
# Delete via GitHub CLI
gh repo delete owner/repo-name --yes

# Or via web interface:
# https://github.com/owner/repo-name → Settings → Danger Zone → Delete repository
```

### 4. Clean Local Files

```bash
# Remove the generated app directory
rm -rf your-app-name/

# Remove any cached data
rm -rf ~/.stacksprinter/cache/your-app-name

# Optional: Clean up any logs
rm -rf ~/.stacksprinter/logs/your-app-name*
```

## 🔍 Verification

Ensure everything is cleaned up:

```bash
# Check Vercel projects
vercel project ls | grep your-app-name

# Check Supabase projects  
supabase projects list | grep your-app-name

# Check GitHub repos
gh repo list | grep your-app-name

# Check local files
ls -la | grep your-app-name
```

If any commands return results, the resource still exists and needs manual removal.

## 📋 Complete Teardown Script

Create `scripts/teardown.sh`:

```bash
#!/bin/bash
set -e

APP_NAME=""
CONFIRM=false
FORCE=false

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --app-name)
      APP_NAME="$2"
      shift 2
      ;;
    --confirm)
      CONFIRM=true
      shift
      ;;
    --force)
      FORCE=true
      shift
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

if [[ -z "$APP_NAME" ]]; then
  echo "Error: --app-name is required"
  exit 1
fi

if [[ "$CONFIRM" != true ]] && [[ "$FORCE" != true ]]; then
  echo "This will permanently delete all resources for '$APP_NAME'"
  echo "Add --confirm to proceed"
  exit 1
fi

echo "🧹 Starting teardown for $APP_NAME..."

# Load state if available
STATE_FILE="$APP_NAME/.stacksprinter/state.json"
if [[ -f "$STATE_FILE" ]]; then
  PROJECT_REF=$(jq -r '.supabaseProjectRef // empty' "$STATE_FILE")
  VERCEL_PROJECT=$(jq -r '.vercelProjectId // empty' "$STATE_FILE")
  GITHUB_REPO=$(jq -r '.githubRepoUrl // empty' "$STATE_FILE")
else
  echo "⚠️ No state file found, using app name for cleanup"
  PROJECT_REF=""
  VERCEL_PROJECT="$APP_NAME"
  GITHUB_REPO=""
fi

# 1. Remove Vercel project
if [[ -n "$VERCEL_PROJECT" ]]; then
  echo "🌐 Removing Vercel project: $VERCEL_PROJECT"
  vercel project rm "$VERCEL_PROJECT" --yes || echo "⚠️ Vercel project not found or already deleted"
fi

# 2. Delete Supabase project
if [[ -n "$PROJECT_REF" ]]; then
  echo "🗄️ Deleting Supabase project: $PROJECT_REF"
  supabase projects delete "$PROJECT_REF" --confirm || echo "⚠️ Supabase project not found or already deleted"
fi

# 3. Remove GitHub repository
if [[ -n "$GITHUB_REPO" ]]; then
  REPO_PATH=$(echo "$GITHUB_REPO" | sed 's|https://github.com/||')
  echo "📚 Deleting GitHub repository: $REPO_PATH"
  gh repo delete "$REPO_PATH" --yes || echo "⚠️ GitHub repository not found or already deleted"
fi

# 4. Clean local files
echo "🗑️ Removing local files..."
rm -rf "$APP_NAME/"
rm -rf ~/.stacksprinter/cache/"$APP_NAME" 2>/dev/null || true
rm -rf ~/.stacksprinter/logs/"$APP_NAME"* 2>/dev/null || true

echo "✅ Teardown completed for $APP_NAME"
echo ""
echo "Verification commands:"
echo "  vercel project ls | grep $APP_NAME"
echo "  supabase projects list | grep $APP_NAME"
echo "  gh repo list | grep $APP_NAME"
```

## 🔒 Selective Cleanup

Sometimes you only want to remove specific resources:

### Remove Only Vercel Deployment
```bash
vercel project rm your-app-name --yes
# Keeps database and GitHub repo intact
```

### Remove Only Database
```bash
supabase projects delete your-project-ref --confirm
# Keeps Vercel deployment and GitHub repo
```

### Remove Only GitHub Repository
```bash
gh repo delete owner/repo-name --yes  
# Keeps Vercel and Supabase resources
```

## 🚨 Recovery Options

### Before Full Deletion
```bash
# Export database schema
supabase db dump --project-ref your-ref > backup.sql

# Download code backup
gh repo clone owner/repo-name backup-repo

# Export Vercel environment variables
vercel env pull .env.backup --project your-app
```

### Partial Recovery
If you accidentally deleted one component:

**Lost Vercel deployment**:
```bash
# Redeploy from existing GitHub repo
cd your-existing-repo
vercel --prod
```

**Lost GitHub repo**:
```bash
# Create new repo from local backup
gh repo create new-repo-name --private
git remote add origin https://github.com/owner/new-repo-name
git push -u origin main
```

**Lost Supabase project**:
```bash
# Create new project and restore from SQL dump
supabase projects create new-project-name
supabase db reset --project-ref new-ref
psql -f backup.sql -h db.new-ref.supabase.co
```

## ⚠️ Important Warnings

- **Database deletion is irreversible** - Always backup first
- **GitHub repo deletion removes all history** - Consider archiving instead
- **Vercel deployments can be restored** from GitHub repo
- **Custom domains** need to be manually removed from Vercel
- **Environment variables** are deleted with projects

## 📞 Help & Support

If you encounter issues during teardown:

1. Check the [troubleshooting section](../README.md#troubleshooting) in the main README
2. Verify your CLI tools are authenticated and up to date  
3. Try manual deletion via web interfaces as backup
4. Open an issue on GitHub if automated scripts fail

---

**Remember**: Measure twice, delete once! 🎯