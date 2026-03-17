#!/bin/bash
set -euo pipefail

CURRENT=$(node -p "require('./package.json').version")
echo "Current web version: v$CURRENT"
echo ""
echo "Bump type:"
echo "  1) patch"
echo "  2) minor"
echo "  3) major"
echo "  4) skip (deploy current version as-is)"
echo ""
read -rp "Choice [1]: " choice

case "${choice:-1}" in
  1) PART=patch ;;
  2) PART=minor ;;
  3) PART=major ;;
  4) PART="" ;;
  *) echo "Invalid choice"; exit 1 ;;
esac

if [[ -n "$PART" ]]; then
  scripts/bump.sh web "$PART"
  VERSION=$(node -p "require('./package.json').version")
else
  VERSION="$CURRENT"
fi

echo ""
read -rp "Build and deploy v$VERSION? [Y/n] " confirm
if [[ "${confirm:-Y}" =~ ^[Yy]$ ]]; then
  git push origin HEAD
  pnpm build
  npx gh-pages -d dist -m "deploy: v$VERSION ($(git rev-parse --short HEAD))"
  rm -rf dist
  echo "Deployed v$VERSION"
else
  echo "Aborted."
fi
