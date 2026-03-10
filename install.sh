#!/bin/bash
# macOS/Linux: Apply Mechanicus patches over original OpenClaw
set -e

OPENCLAW_DIR=${1:-openclaw}  # Local original OpenClaw repo path
FRESH_BASE=${2:-false}       # Reset to official/main first?

PATCH_DIR=patches
OFFICIAL_REMOTE=https://github.com/openclaw/openclaw.git

if [ ! -d "$OPENCLAW_DIR" ]; then
    echo "Cloning original OpenClaw to $OPENCLAW_DIR..."
    git clone $OFFICIAL_REMOTE $OPENCLAW_DIR
fi

cd "$OPENCLAW_DIR"

if [ "$FRESH_BASE" = "true" ]; then
    echo "Resetting to official/main (overwrites local changes)..."
    git remote add official $OFFICIAL_REMOTE 2>/dev/null || true
    git fetch official
    git checkout main
    git reset --hard official/main
fi

echo "Applying Mechanicus patches..."
git am "../$PATCH_DIR"/*.patch

echo "Installing deps..."
pnpm install

echo "Done! Mechanicus ready. Run: pnpm openclaw"
cd ..
read -p "Press Enter..."