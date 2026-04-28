#!/usr/bin/env bash
# Open all three Roji dev surfaces in Chrome. Useful for "show me what
# we have" sessions.
set -e

open -na "Google Chrome" --args --new-window \
  "http://localhost:3000/" \
  "http://localhost:3000/protocol" \
  "http://roji.local/shop/" \
  "http://roji.local/?protocol_stack=wolverine" \
  "http://localhost:3001/performance"
