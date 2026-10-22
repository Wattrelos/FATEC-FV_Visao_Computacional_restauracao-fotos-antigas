#!/usr/bin/env bash
# ==============================================================================
# RestauraFoto - Script de Feedback e Diagnóstico de Malha Fechada (TACL)
# Executa compilação Rust, testes Python OpenCV e verificação TypeScript
# ==============================================================================
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# Assegura Node no PATH para ambientes NVM
if [ -d "/home/sickla/.nvm/versions/node/v24.22.0/bin" ]; then
    export PATH="/home/sickla/.nvm/versions/node/v24.22.0/bin:${PATH}"
fi

python3 "${REPO_ROOT}/scripts/dev/agent-diagnostics.py" "$@"
