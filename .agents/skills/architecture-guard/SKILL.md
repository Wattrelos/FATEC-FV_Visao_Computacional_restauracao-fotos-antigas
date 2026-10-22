---
name: architecture-guard
description: Valida a aderência do código às fronteiras do ADR 0001 (Tauri Rust + Python PyO3 + Frontend Vite), preservação não destrutiva da imagem e segurança operacional no RestauraFoto.
---

# 🛡️ Skill: architecture-guard (RestauraFoto)

Esta skill atua como um guardião arquitetural automatizado, inspecionando e prevenindo que quebras de fronteiras ou violações das diretrizes do **ADR 0001** ocorram durante a adição de novos códigos e algoritmos.

---

## 🏛️ 1. Fronteiras e Responsabilidades das Camadas (ADR 0001)

```
┌─────────────────────────────────────────────────────────────┐
│             Interface Web (src/main.ts, HTML/CSS)           │
│   • UI moderna, sliders antes/depois, canvas de histograma  │
│   • Zero acesso direto ao sistema de arquivos do SO         │
└──────────────────────────────┬──────────────────────────────┘
                               │ invoca comandos IPC
                               ▼
┌─────────────────────────────────────────────────────────────┐
│          Casca Nativa em Rust (src-tauri/src/)              │
│   • Janela nativa, diálogos de arquivo do SO, permissões    │
│   • Orquestração do PyO3 em threads assíncronas dedicadas   │
│   • Conversão e transporte seguro de DTOs JSON              │
└──────────────────────────────┬──────────────────────────────┘
                               │ executa via PyO3 (com GIL)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│       Motor de Visão Computacional (src-tauri/restaurar.py) │
│   • OpenCV, NumPy, algoritmos de restauração, morfologia    │
│   • Processamento modular e não-destrutivo                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 🛑 2. O Que NUNCA Fazer (Gatilhos de Bloqueio)

1. **Nunca violar a Não-Destrutividade da Imagem Original:**
   * A foto original escaneada do usuário é sagrada. O software **nunca** deve sobrescrever o arquivo original diretamente.
   * `caminho_saida` deve obrigatoriamente ser diferente de `caminho_entrada` (`os.path.abspath(caminho_saida) != os.path.abspath(_estado["caminho"])`).
2. **Nunca executar chamadas pesadas de OpenCV na UI Thread do Tauri:**
   * Filtros morfológicos, inpainting e CLAHE em imagens de alta resolução (2K/4K) bloqueiam o interpretador.
   * Toda operação do PyO3 deve ser disparada em `tauri::async_runtime::spawn_blocking` para manter a interface web com 60 FPS e responsividade perfeita.
3. **Nunca tentar carregar bibliotecas gráficas pesadas (Tkinter / Qt) dentro do motor Python:**
   * A interface do usuário pertence 100% à casca Tauri/Web. O módulo Python deve permanecer sem dependências de GUI (usar `opencv-python-headless`).
4. **Resolução de Preview vs. Resolução Total:**
   * Sliders interativos operam sobre a imagem reduzida (`LADO_PREVIEW = 1400`) para renderização instantânea em milissegundos.
   * O pipeline em resolução máxima é invocado unicamente no momento de salvar a cópia final.

---

## 🧪 3. Checklist de Validação Pré-Conclusão

Antes de concluir qualquer tarefa de código, execute:
```bash
bash scripts/dev/agent-diagnostics.sh
```
Se qualquer camada quebrar, corrija imediatamente guiando-se pelo relatório `test-results/diagnostic.md`.
