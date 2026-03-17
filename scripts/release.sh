#!/bin/bash
set -euo pipefail

CURRENT=$(grep '^version' crates/vault-cli/Cargo.toml | head -1 | sed 's/[^"]*"\([^"]*\)".*/\1/')
echo "Current CLI version: v$CURRENT"
echo ""
echo "Bump type:"
echo "  1) patch"
echo "  2) minor"
echo "  3) major"
echo "  4) skip (tag current version as-is)"
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
  scripts/bump.sh cli "$PART"
  VERSION=$(grep '^version' crates/vault-cli/Cargo.toml | head -1 | sed 's/[^"]*"\([^"]*\)".*/\1/')
else
  VERSION="$CURRENT"
fi

# Build changelog from commits since last tag
LAST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "")
if [[ -n "$LAST_TAG" ]]; then
  CHANGELOG=$(git log "$LAST_TAG"..HEAD --pretty=format:"- %s" --no-merges)
else
  CHANGELOG=$(git log --pretty=format:"- %s" --no-merges)
fi

echo ""
echo "Changelog:"
echo "$CHANGELOG"
echo ""
read -rp "Tag and push v$VERSION? [Y/n] " confirm
if [[ "${confirm:-Y}" =~ ^[Yy]$ ]]; then
  git push origin HEAD
  git tag -a "v$VERSION" -m "$(printf "v$VERSION\n\n$CHANGELOG")"
  git push origin "v$VERSION"
  echo "Released v$VERSION"
else
  echo "Aborted."
fi
