#!/usr/bin/env bash
set -e

echo "=== Push ML Data Analysis to GitHub ==="
echo "Target repository: https://github.com/cliffnim/mldata-analysis.git"
echo ""

if [ -z "$1" ]; then
  echo "Usage: ./push-to-github.sh <YOUR_GITHUB_PERSONAL_ACCESS_TOKEN>"
  echo ""
  echo "Or set the GITHUB_TOKEN environment variable:"
  echo "  export GITHUB_TOKEN=ghp_your_token_here"
  echo "  ./push-to-github.sh"
  echo ""
  read -p "Enter your GitHub Personal Access Token (classic with 'repo' scope): " TOKEN
else
  TOKEN="$1"
fi

if [ -z "$TOKEN" ]; then
  echo "Error: Token cannot be empty."
  exit 1
fi

git remote set-url origin "https://${TOKEN}@github.com/cliffnim/mldata-analysis.git"
git branch -M main
git push -u origin main

# Reset remote URL to clean URL so token is not saved in plain text
git remote set-url origin "https://github.com/cliffnim/mldata-analysis.git"

echo ""
echo " Successfully pushed to https://github.com/cliffnim/mldata-analysis"
echo "Check your GitHub Actions tab to see your GitHub Pages deployment build!"
