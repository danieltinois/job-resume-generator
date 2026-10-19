#!/bin/sh
# Fails if a commit message carries AI attribution. Shared by the commit-msg
# hook and the guardrails CI workflow. See AGENTS.md, rule 1.1.
#
# Usage: check-commit-message.sh <file-with-message> [label]

file="$1"
label="${2:-commit message}"

ai='claude|anthropic|openai|chatgpt|gpt-[0-9]|copilot|codex|gemini|cursor|devin|\[bot\]'

# Comment lines are stripped by git before the commit is stored.
if grep -v '^#' "$file" | grep -Eiq \
    -e "^co-authored-by:.*($ai)" \
    -e 'noreply@anthropic\.com' \
    -e '^claude-session:' \
    -e "generated (with|by) .*($ai)" \
    -e 'claude\.ai/code'; then
  echo "guardrails: $label contains AI attribution, which this repository forbids (AGENTS.md, rule 1.1)." >&2
  grep -v '^#' "$file" | grep -Ein \
    -e "^co-authored-by:.*($ai)" \
    -e 'noreply@anthropic\.com' \
    -e '^claude-session:' \
    -e "generated (with|by) .*($ai)" \
    -e 'claude\.ai/code' >&2
  exit 1
fi
