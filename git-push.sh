#!/bin/bash

# Exit on error
set -e

echo "=== NumID Git Push Automation ==="

# Initialize git repository if not already done
if [ ! -d .git ]; then
  git init
  echo "✅ Initialized empty Git repository."
else
  echo "ℹ️ Git repository already initialized."
fi

# Associate remote origin repository
echo "Resetting remote origin to: https://github.com/inepali/numid.git"
git remote remove origin 2>/dev/null || true
git remote add origin https://github.com/inepali/numid.git

# Stage all files excluding .gitignore paths
echo "Staging files..."
git add .

# Check if there are changes to commit
if git diff-index --quiet HEAD --; then
  echo "ℹ️ No new changes to commit."
else
  echo "Committing files..."
  git commit -m "Initialize NumID MVP: Next.js 15 App with Supabase & Cloudflare routing"
fi

# Rename target branch to main
git branch -M main

# Push to GitHub
echo "Pushing codebase to origin main branch..."
git push -u origin main

echo "=== Git Push Completed Successfully ==="
