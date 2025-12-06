#!/usr/bin/env bash
set -euo pipefail

# Setup git hooks to enforce pre-deploy checks automatically
# Usage: ./scripts/setup-hooks.sh

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
GIT_HOOKS_DIR="$REPO_ROOT/.git/hooks"

echo "🔧 Setting up git hooks..."

# Ensure hooks directory exists
mkdir -p "$GIT_HOOKS_DIR"

# Install pre-commit hook
if [ -f "$REPO_ROOT/scripts/hooks/pre-commit" ]; then
  cp "$REPO_ROOT/scripts/hooks/pre-commit" "$GIT_HOOKS_DIR/pre-commit"
  chmod +x "$GIT_HOOKS_DIR/pre-commit"
  echo "✅ Pre-commit hook installed"
  echo "   Location: $GIT_HOOKS_DIR/pre-commit"
  echo "   The hook will now run pre-deploy checks on every commit."
  echo "   To bypass (not recommended): git commit --no-verify"
else
  echo "❌ Hook template not found: $REPO_ROOT/scripts/hooks/pre-commit"
  exit 1
fi

# Verify installation
if [ -x "$GIT_HOOKS_DIR/pre-commit" ]; then
  echo ""
  echo "✨ Git hooks setup complete!"
  echo ""
  echo "📋 Installed hooks:"
  echo "   • pre-commit: Validates code before commits"
  echo ""
  echo "🔍 What gets checked:"
  echo "   • Documentation organization (files should be in docs/ subdirectories)"
  echo "   • File structure consistency"
  echo "   • JavaScript syntax and brace matching"
  echo "   • CDN asset references"
  echo ""
  echo "⚠️  If a check fails, your commit will be blocked."
  echo "    Fix issues and commit again."
else
  echo "❌ Failed to install pre-commit hook"
  exit 1
fi
