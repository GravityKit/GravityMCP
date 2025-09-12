#!/bin/bash

# Script to help rename gravity-mcp to GravityMCP
# This handles GitHub repository renaming and npm package publishing

echo "🚀 Renaming gravity-mcp to GravityMCP"
echo "====================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Update git remote
echo -e "${YELLOW}Step 1: Update Git Remote${NC}"
echo "Current remote:"
git remote -v
echo ""
echo "To rename the GitHub repository:"
echo "1. Go to https://github.com/GravityKit/gravity-mcp/settings"
echo "2. Change repository name from 'gravity-mcp' to 'GravityMCP'"
echo "3. GitHub will automatically redirect the old URL"
echo ""
read -p "Press Enter after renaming the repository on GitHub..."

echo -e "${GREEN}Updating local git remote...${NC}"
git remote set-url origin git@github.com:GravityKit/GravityMCP.git
echo "New remote:"
git remote -v
echo ""

# Step 2: Verify npm login
echo -e "${YELLOW}Step 2: Verify npm login${NC}"
npm whoami
if [ $? -ne 0 ]; then
    echo -e "${RED}Not logged in to npm. Please run: npm login${NC}"
    exit 1
fi
echo ""

# Step 3: Update version for npm publish
echo -e "${YELLOW}Step 3: Update version for npm publish${NC}"
current_version=$(node -p "require('./package.json').version")
echo "Current version: $current_version"
echo "Bumping patch version..."
npm version patch --no-git-tag-version
new_version=$(node -p "require('./package.json').version")
echo -e "${GREEN}New version: $new_version${NC}"
echo ""

# Step 4: Publish to npm
echo -e "${YELLOW}Step 4: Publish to npm${NC}"
echo "Publishing @gravitykit/gravitymcp to npm..."
echo ""
read -p "Ready to publish? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    npm publish --access public
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}Successfully published @gravitykit/gravitymcp@$new_version${NC}"
    else
        echo -e "${RED}Failed to publish to npm${NC}"
        exit 1
    fi
else
    echo "Skipping npm publish"
fi
echo ""

# Step 5: Create git commit and tag
echo -e "${YELLOW}Step 5: Create git commit and tag${NC}"
git add -A
git commit -m "Rename package from gravity-mcp to GravityMCP v$new_version"
git tag "v$new_version"
echo ""

# Step 6: Push to GitHub
echo -e "${YELLOW}Step 6: Push to GitHub${NC}"
read -p "Push to GitHub? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    git push origin main
    git push origin "v$new_version"
    echo -e "${GREEN}Pushed to GitHub successfully${NC}"
else
    echo "Skipping GitHub push"
fi
echo ""

# Step 7: Deprecate old package (optional)
echo -e "${YELLOW}Step 7: Deprecate old package (optional)${NC}"
echo "To deprecate the old package, run:"
echo "npm deprecate @gravitykit/gravity-mcp@\"*\" \"Package renamed to @gravitykit/gravitymcp\""
echo ""

# Summary
echo -e "${GREEN}✅ Rename Complete!${NC}"
echo ""
echo "Summary:"
echo "- GitHub repository: https://github.com/GravityKit/GravityMCP"
echo "- npm package: @gravitykit/gravitymcp@$new_version"
echo ""
echo "Next steps:"
echo "1. Update any projects using the old package name"
echo "2. Update documentation that references the old URLs"
echo "3. Consider deprecating the old npm package"
echo ""
echo "Installation command for users:"
echo -e "${GREEN}npm install @gravitykit/gravitymcp${NC}"