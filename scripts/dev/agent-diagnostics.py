#!/usr/bin/env python3
"""
==============================================================================
RestauraFoto - Runner Diagnóstico de Malha Fechada & Auto-Cura (TACL Triplo)
Projetado para Agentes de IA (Google Antigravity / Gemini) e Engenheiros.
==============================================================================
Valida as 3 camadas do ADR 0001:
1. 🦀 Casca Nativa Rust (Tauri v2 + PyO3) via `cargo check --message-format=json`
2. 🐍 Motor de Visão Computacional (OpenCV/NumPy) via `unittest` em `tests/`
3. 📘 Frontend Web Reativo via `tsc --noEmit` (TypeScript)

Gera relatório unificado estruturado em `test-results/diagnostic.md` para auto-cura.
"""

import json
import os
import shutil
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
RESULTS_DIR = ROOT_DIR / "test-results"
OUTPUT_MD = RESULTS_DIR / "diagnostic.md"

RESULTS_DIR.mkdir(parents=True, exist_ok=True)

# Garante PATH com Node/NPM/NPX se estiver rodando em ambiente nvm
NODE_PATHS = [
    "/home/sickla/.nvm/versions/node/v24.22.0/bin",
    str(Path.home() / ".nvm/versions/node/v24.22.0/bin"),
]
env = os.environ.copy()
for np in NODE_PATHS:
    if os.path.isdir(np) and np not in env.get("PATH", ""):
        env["PATH"] = f"{np}:{env.get('PATH', '')}"

VENV_PYTHON = ROOT_DIR / ".venv" / "bin" / "python"
if not VENV_PYTHON.exists():
    VENV_PYTHON = Path(sys.executable)

print("🖼️  [RestauraFoto Diagnostics] Iniciando validação de malha fechada (TACL)...")

# ----------------------------------------------------------------------------
# 1. Checagem da Casca Nativa Rust (Tauri + PyO3)
# ----------------------------------------------------------------------------
print("🦀 [1/3] Inspecionando Casca Rust & PyO3 (cargo check)...")
rust_start = time.perf_counter()
cargo_proc = subprocess.run(
    ["cargo", "check", "--manifest-path", str(ROOT_DIR / "src-tauri" / "Cargo.toml"), "--message-format=json"],
    cwd=ROOT_DIR,
    capture_output=True,
    text=True,
    env=env,
)
rust_duration = time.perf_counter() - rust_start

compiler_errors = []
compiler_warnings = []

if cargo_proc.stdout:
    for line in cargo_proc.stdout.splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            msg = json.loads(line)
            if msg.get("reason") == "compiler-message" and "message" in msg:
                item = msg["message"]
                spans = []
                for s in item.get("spans", []):
                    spans.append({
                        "file": s.get("file_name"),
                        "lineStart": s.get("line_start"),
                        "lineEnd": s.get("line_end"),
                        "colStart": s.get("column_start"),
                        "colEnd": s.get("column_end"),
                        "suggested": s.get("suggested_replacement"),
                    })

                entry = {
                    "level": item.get("level"),
                    "code": item.get("code", {}).get("code") if item.get("code") else None,
                    "message": item.get("message"),
                    "rendered": item.get("rendered"),
                    "spans": spans,
                }

                if item.get("level") == "error":
                    compiler_errors.append(entry)
                elif item.get("level") == "warning":
                    compiler_warnings.append(entry)
        except Exception:
            pass

if cargo_proc.returncode != 0 and not compiler_errors and cargo_proc.stderr:
    compiler_errors.append({
        "level": "error",
        "code": "CargoFatal",
        "message": "Falha na compilação do Cargo",
        "rendered": cargo_proc.stderr,
        "spans": [],
    })

# ----------------------------------------------------------------------------
# 2. Checagem do Motor de Visão Computacional (Python + OpenCV)
# ----------------------------------------------------------------------------
print("🐍 [2/3] Executando suíte do Motor Python OpenCV (unittest)...")
py_start = time.perf_counter()
py_proc = subprocess.run(
    [str(VENV_PYTHON), "-m", "unittest", "discover", "-s", "tests", "-p", "test_*.py", "-v"],
    cwd=ROOT_DIR,
    capture_output=True,
    text=True,
    env=env,
)
py_duration = time.perf_counter() - py_start

python_passed = 0
python_failed = 0
python_failure_details = []

output_test = (py_proc.stderr or "") + "\n" + (py_proc.stdout or "")
for line in output_test.splitlines():
    if " ... ok" in line:
        python_passed += 1
    elif " ... FAIL" in line or " ... ERROR" in line:
        python_failed += 1

if py_proc.returncode != 0 and python_failed == 0:
    python_failed = 1
    python_failure_details.append(output_test.strip())
elif py_proc.returncode != 0:
    python_failure_details.append(output_test.strip())

# ----------------------------------------------------------------------------
# 3. Checagem Estática de Tipos do Frontend (TypeScript / Vite)
# ----------------------------------------------------------------------------
print("📘 [3/3] Checando tipagem estática do Frontend (tsc --noEmit)...")
ts_start = time.perf_counter()
npx_bin = shutil.which("npx", path=env.get("PATH")) or "npx"
ts_proc = subprocess.run(
    [npx_bin, "tsc", "--noEmit"],
    cwd=ROOT_DIR,
    capture_output=True,
    text=True,
    env=env,
)
ts_duration = time.perf_counter() - ts_start

ts_errors = []
if ts_proc.returncode != 0:
    for line in (ts_proc.stdout + ts_proc.stderr).splitlines():
        line = line.strip()
        if line and ("error TS" in line or "error:" in line):
            ts_errors.append(line)
    if not ts_errors and (ts_proc.stdout or ts_proc.stderr):
        ts_errors.append((ts_proc.stdout + ts_proc.stderr).strip())

# ----------------------------------------------------------------------------
# 4. Síntese do Relatório Markdown para Auto-Cura de IA
# ----------------------------------------------------------------------------
is_healthy = (len(compiler_errors) == 0 and python_failed == 0 and len(ts_errors) == 0)
status_badge = "🟢 SAUDÁVEL / APROVADO" if is_healthy else "🔴 FALHA DETECTADA (Requer Auto-Cura)"

lines = [
    "# 🖼️ RestauraFoto — Relatório Diagnóstico & Auto-Cura (TACL)\n",
    f"**Status Geral:** {status_badge}",
    f"**Timestamp:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
    f"**Tempo de Execução:** Rust {rust_duration:.2f}s | Python {py_duration:.2f}s | TypeScript {ts_duration:.2f}s\n",
    "---\n",
    "## 📊 Painel das Três Camadas (ADR 0001)\n",
    "| Camada | Tecnologia | Testes / Lints | Status |",
    "| :--- | :--- | :--- | :--- |",
    f"| **Casca Nativa** | Rust (Tauri v2 + PyO3) | {len(compiler_errors)} Erros, {len(compiler_warnings)} Avisos | {'🟢 OK' if len(compiler_errors) == 0 else '🔴 FALHA'} |",
    f"| **Motor CV** | Python (OpenCV + NumPy) | {python_passed} Aprovados, {python_failed} Falhas | {'🟢 OK' if python_failed == 0 else '🔴 FALHA'} |",
    f"| **Frontend** | TypeScript (Vite + Webview) | {len(ts_errors)} Erros de Tipagem | {'🟢 OK' if len(ts_errors) == 0 else '🔴 FALHA'} |",
    "\n---\n",
]

if compiler_errors:
    lines.append(f"## 🚨 [Rust] Erros de Compilação & PyO3 ({len(compiler_errors)})\n")
    for idx, err in enumerate(compiler_errors):
        code_str = err.get("code") or "Rust Error"
        lines.append(f"### Erro Rust #{idx + 1}: `{code_str}` — {err.get('message')}\n")
        if err.get("spans"):
            for s in err["spans"]:
                lines.append(f"* **Local:** `{s['file']}:{s['lineStart']}:{s['colStart']}`")
                if s.get("suggested"):
                    lines.append(f"* **Sugestão do Compilador:** `{s['suggested']}`")
        if err.get("rendered"):
            lines.append(f"\n```text\n{err['rendered'].strip()}\n```\n")

if python_failed > 0:
    lines.append(f"## 🚨 [Python] Falhas nos Testes de Visão Computacional ({python_failed})\n")
    for detail in python_failure_details:
        lines.append(f"```text\n{detail}\n```\n")

if ts_errors:
    lines.append(f"## 🚨 [TypeScript] Erros de Tipagem Frontend ({len(ts_errors)})\n")
    lines.append("```text")
    for err in ts_errors:
        lines.append(err)
    lines.append("```\n")

if is_healthy:
    lines.append("## ✅ Todas as Camadas Estão em Plena Harmonia\n")
    lines.append(
        "- **Casca Rust:** Binário e ponte PyO3 compilam estritamente sem erros.\n"
        f"- **Motor Python:** {python_passed} testes de algoritmos morfológicos, inpaint, filtros e equalização passaram.\n"
        "- **Frontend TS:** Tipagem 100% válida e livre de inconsistências no Vite.\n"
    )

report_content = "\n".join(lines)
OUTPUT_MD.write_text(report_content, encoding="utf-8")

rel_path = OUTPUT_MD.relative_to(ROOT_DIR)
print("\n" + "=" * 60)
print("🖼️  Placar de Saúde do RestauraFoto:")
print(f"   - 🦀 Rust (Tauri / PyO3):  {'🟢 0 Erros' if len(compiler_errors) == 0 else f'🔴 {len(compiler_errors)} Erros'}")
print(f"   - 🐍 Python (OpenCV CV):   {'🟢 ' + str(python_passed) + ' Aprovados' if python_failed == 0 else f'🔴 {python_failed} Falhas'}")
print(f"   - 📘 Frontend (TypeScript): {'🟢 0 Erros' if len(ts_errors) == 0 else f'🔴 {len(ts_errors)} Erros'}")
print(f"📄 Relatório Diagnóstico para IA: {rel_path}")
print("=" * 60 + "\n")

sys.exit(0 if is_healthy else 1)
