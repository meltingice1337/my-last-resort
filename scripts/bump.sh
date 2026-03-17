#!/bin/bash
set -euo pipefail

TARGET="${1:-}"
PART="${2:-patch}"

if [[ "$TARGET" != "cli" && "$TARGET" != "web" ]]; then
  echo "Usage: scripts/bump.sh <cli|web> [major|minor|patch]"
  echo "  cli  → bumps crates/vault-cli/Cargo.toml"
  echo "  web  → bumps package.json"
  exit 1
fi

bump_version() {
  local cur="$1" part="$2"
  IFS='.' read -r major minor patch <<< "$cur"
  case "$part" in
    major) echo "$((major + 1)).0.0" ;;
    minor) echo "${major}.$((minor + 1)).0" ;;
    patch) echo "${major}.${minor}.$((patch + 1))" ;;
    *) echo "Invalid part: $part (use major|minor|patch)" >&2; exit 1 ;;
  esac
}

if [[ "$TARGET" == "cli" ]]; then
  FILE="crates/vault-cli/Cargo.toml"
  CURRENT=$(grep '^version' "$FILE" | head -1 | sed 's/[^"]*"\([^"]*\)".*/\1/')
  NEW=$(bump_version "$CURRENT" "$PART")
  sed -i "0,/^version = \"$CURRENT\"/s//version = \"$NEW\"/" "$FILE"
  echo "CLI: $CURRENT → $NEW"
  cargo generate-lockfile --quiet
  git add "$FILE" Cargo.lock
  git commit -m "chore: bump CLI to v$NEW"
else
  CURRENT=$(node -p "require('./package.json').version")
  NEW=$(bump_version "$CURRENT" "$PART")
  npm version "$NEW" --no-git-tag-version --quiet
  echo "Web: $CURRENT → $NEW"
  git add package.json
  git commit -m "chore: bump web to v$NEW"
fi
