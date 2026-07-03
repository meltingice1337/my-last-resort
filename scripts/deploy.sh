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
  # gh-pages commits inside an isolated clone that only sees *global* git config.
  # This repo's identity and SSH signing key live in local config, so forward them
  # via GIT_CONFIG_* so the deploy commit is signed with your current local key.
  NAME=$(git config --get user.name || true)
  EMAIL=$(git config --get user.email || true)
  SIGNKEY=$(git config --get user.signingkey || true)
  FORMAT=$(git config --get gpg.format || true)
  GIT_CONFIG_COUNT=5 \
    GIT_CONFIG_KEY_0=user.name       GIT_CONFIG_VALUE_0="$NAME" \
    GIT_CONFIG_KEY_1=user.email      GIT_CONFIG_VALUE_1="$EMAIL" \
    GIT_CONFIG_KEY_2=user.signingkey GIT_CONFIG_VALUE_2="$SIGNKEY" \
    GIT_CONFIG_KEY_3=gpg.format      GIT_CONFIG_VALUE_3="$FORMAT" \
    GIT_CONFIG_KEY_4=commit.gpgsign  GIT_CONFIG_VALUE_4=true \
    npx gh-pages -d dist -m "deploy: v$VERSION ($(git rev-parse --short HEAD))"
  rm -rf dist
  echo "Deployed v$VERSION"
else
  echo "Aborted."
fi
