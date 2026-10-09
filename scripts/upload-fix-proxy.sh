#!/bin/bash
# Run on your Mac (not in Hetzner console). Uploads fix-coolify-proxy.sh and runs it.
set -euo pipefail
HOST="${1:-root@116.203.69.21}"
DIR="$(cd "$(dirname "$0")" && pwd)"
scp "$DIR/fix-coolify-proxy.sh" "$HOST:/data/coolify/proxy/fix-coolify-proxy.sh"
ssh "$HOST" 'cd /data/coolify/proxy && chmod +x fix-coolify-proxy.sh && bash fix-coolify-proxy.sh'
