#!/bin/bash
# Create a new feature branch from main
# Usage: ./scripts/development/create-branch.sh feature/my-feature-name

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get the repository root directory
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"

# Check if branch name is provided
if [ -z "$1" ]; then
    echo -e "${RED}❌ Error: Branch name is required${NC}"
    echo ""
    echo "Usage: $0 <branch-name>"
    echo ""
    echo "Examples:"
    echo "  $0 feature/distributed-caching"
    echo "  $0 fix/cache-invalidation-bug"
    echo "  $0 refactor/agent-orchestration"
    echo "  $0 docs/api-documentation"
    echo ""
    echo "Branch naming convention: <type>/<short-description>"
    echo "Types: feature, fix, refactor, docs, perf, test, chore"
    exit 1
fi

BRANCH_NAME="$1"

# Validate branch name format (basic check)
if [[ ! "$BRANCH_NAME" =~ ^(feature|fix|refactor|docs|perf|test|chore)/.+ ]]; then
    echo -e "${YELLOW}⚠️  Warning: Branch name doesn't follow convention <type>/<description>${NC}"
    echo "Recommended format: feature/my-feature, fix/bug-description, etc."
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Check if branch already exists locally
if git show-ref --verify --quiet refs/heads/"$BRANCH_NAME"; then
    echo -e "${RED}❌ Error: Branch '$BRANCH_NAME' already exists locally${NC}"
    echo ""
    read -p "Switch to existing branch? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git checkout "$BRANCH_NAME"
        echo -e "${GREEN}✅ Switched to branch '$BRANCH_NAME'${NC}"
        exit 0
    else
        exit 1
    fi
fi

# Check if branch exists on remote
if git show-ref --verify --quiet refs/remotes/origin/"$BRANCH_NAME"; then
    echo -e "${YELLOW}⚠️  Branch '$BRANCH_NAME' exists on remote${NC}"
    read -p "Checkout and track remote branch? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git checkout -b "$BRANCH_NAME" origin/"$BRANCH_NAME"
        echo -e "${GREEN}✅ Checked out and tracking remote branch '$BRANCH_NAME'${NC}"
        exit 0
    else
        exit 1
    fi
fi

# Ensure we're on main
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo -e "${YELLOW}⚠️  Currently on branch '$CURRENT_BRANCH', not 'main'${NC}"
    read -p "Switch to main? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
    git checkout main
fi

# Check for uncommitted changes
if ! git diff-index --quiet HEAD --; then
    echo -e "${RED}❌ Error: You have uncommitted changes${NC}"
    echo "Please commit or stash your changes before creating a new branch"
    echo ""
    echo "Options:"
    echo "  1. Commit changes: git add . && git commit -m 'your message'"
    echo "  2. Stash changes: git stash"
    exit 1
fi

# Pull latest changes from main
echo -e "${BLUE}📥 Pulling latest changes from main...${NC}"
git pull origin main

# Create and switch to new branch
echo -e "${BLUE}🌿 Creating branch '$BRANCH_NAME'...${NC}"
git checkout -b "$BRANCH_NAME"

echo ""
echo -e "${GREEN}✅ Successfully created and switched to branch '$BRANCH_NAME'${NC}"
echo ""
echo "Next steps:"
echo "  1. Make your changes"
echo "  2. Commit: git add . && git commit -m 'feat: your changes'"
echo "  3. Push: git push -u origin $BRANCH_NAME"
echo "  4. Create PR on GitHub"
echo ""
