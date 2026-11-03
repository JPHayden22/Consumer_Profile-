#!/bin/zsh
cd "${0:A:h}"
ORBIT_NODE=$(command -v node)
if [[ -z "$ORBIT_NODE" ]]; then
  ORBIT_NODE="$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node"
fi
if [[ ! -x "$ORBIT_NODE" || ! -f node_modules/vite/bin/vite.js ]]; then
  echo "Orbit needs Node.js and installed project dependencies. Open this folder in Codex for setup."
  read -k 1
  exit 1
fi
open "http://127.0.0.1:5173/Consumer_Profile-/"
exec "$ORBIT_NODE" node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5173 --strictPort
