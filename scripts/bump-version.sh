#!/usr/bin/env bash
# Sets the desktop release version in the four files that carry it. Run in the release PR, then tag vX.Y.Z after merge.
#   scripts/bump-version.sh 1.0.16
set -euo pipefail
v="${1:?usage: scripts/bump-version.sh X.Y.Z}"
cd "$(dirname "$0")/.."
for f in package.json apps/desktop/package.json apps/desktop/src-tauri/tauri.conf.json; do
  jq --arg v "$v" '.version = $v' "$f" > "$f.tmp" && mv "$f.tmp" "$f"
done
sed -i.bak "s/^version = \".*\"/version = \"$v\"/" apps/desktop/src-tauri/Cargo.toml && rm -f apps/desktop/src-tauri/Cargo.toml.bak
git diff --stat -- package.json apps/desktop/package.json apps/desktop/src-tauri/tauri.conf.json apps/desktop/src-tauri/Cargo.toml
