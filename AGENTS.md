# 🧠 Diretrizes de Continuidade, Governança e Sanidade Operacional — RestauraFoto

---

## 🌅 1. Protocolo Obrigatório de Abertura de Sessão (Cold Start / Retomada)

> [!IMPORTANT]
> **Regra de Ouro nº 1 (Sincronização de Memória):** Na **primeira mensagem** de qualquer nova sessão ou conversa, antes de propor planos ou alterações de código, o agente DEVE ler o arquivo de checkpoint canônico:
> 👉 [`docs/PROJECT_STATUS.md`](/docs/PROJECT_STATUS.md)

### Procedimento de Boas-Vindas e Alinhamento:
1. **Verificar Estado Vigente:** Identificar no [`docs/PROJECT_STATUS.md`](/docs/PROJECT_STATUS.md) o status atual da engenharia, quais técnicas de visão computacional da FATEC já foram implementadas e as tarefas em aberto.
2. **Saudação e Briefing Executivo:** Apresentar uma síntese concisa ao desenvolvedor:
   * *"Saúde dos Testes: Casca Rust (0 erros) | Motor Python (7 testes OK) | Frontend TS (0 erros)."*
   * *"Status da Grade FATEC: 17 de 21 técnicas implementadas."*
   * *"Última atividade registrada e pendências imediatas."*
   * *"Pergunta de confirmação: Deseja retomar a partir de [Próxima Tarefa] ou focar em um novo objetivo hoje?"*

---

## 🛡️ 2. Diretrizes de Sanidade e Travas de Integridade (Anti-Regression Guard)

### Postura de Revisão Crítica:
* **Não seja um executor cego:** O assistente atua como Engenheiro de Software Sênior e Par de Programação (Pair Programming). Se uma instrução violar as diretrizes de arquitetura do **ADR 0001** ou comprometer a integridade das imagens do usuário, **interrompa a execução**, explique o risco e ofereça a alternativa adequada.

### Travas Arquiteturais Inegociáveis (ADR 0001):
1. **Preservação Sagrada da Foto Original:**
   * **Nunca** sobrescreva o arquivo original escaneado. O método `salvar()` em [`src-tauri/restaurar.py`](/src-tauri/restaurar.py) rejeita ativamente gravar com o mesmo caminho do arquivo de entrada.
2. **Isolamento de Camadas (Tauri + PyO3 + Frontend):**
   * **Casca Nativa em Rust ([`src-tauri`](/src-tauri)):** Gerencia janelas nativas, diálogos do sistema operacional e orquestra o interpretador Python na memória via crate `pyo3`. Chamadas computacionalmente pesadas devem **obrigatoriamente** rodar em `tauri::async_runtime::spawn_blocking` para manter a UI com 60 FPS.
   * **Motor de Visão Computacional ([`src-tauri/restaurar.py`](/src-tauri/restaurar.py)):** Processamento digital puro com OpenCV e NumPy. **Zero dependências de interface gráfica** (Tkinter, Qt) — usar sempre `opencv-python-headless`.
   * **Frontend Web ([`src`](/src)):** Sliders antes/depois, canvas de histograma e controles reativos. **Zero acesso direto ao sistema de arquivos local** (sempre via comandos do Tauri).
3. **Estratégia de Resolução Dupla (Preview vs. Full-Res):**
   * A interface trabalha interativamente sobre uma pré-visualização reduzida (`LADO_PREVIEW = 1400`) para renderização instantânea dos sliders em milissegundos.
   * O pipeline em resolução máxima nativa é acionado apenas no salvamento do arquivo final.

---

## 🧪 3. Pirâmide Tripla de Qualidade Contínua (TACL)

Qualquer alteração relevante no código deve ser submetida e validada na malha fechada antes da conclusão:

1. **Execução Diagnóstica Unificada:** `bash scripts/dev/agent-diagnostics.sh`
   * Casca Rust: `cargo check` em JSON via AST do compilador.
   * Motor Python: Suíte de testes unitários `tests/test_motor_cv.py`.
   * Frontend: Validação de tipos `npx tsc --noEmit`.
2. **Relatório Estruturado para Auto-Cura:** Consultar [`test-results/diagnostic.md`](/test-results/diagnostic.md) caso alguma camada apresente erro.

---

## 🌙 4. Protocolo Obrigatório de Fechamento do Dia (Handover de Encerramento)

> [!IMPORTANT]
> **Regra de Ouro nº 2 (Preservação de Contexto):** Quando o usuário indicar o término do expediente (ex: *"vamos parar por hoje"*, *"encerrar o dia"*, *"gerar handover"* ou fechamento de ciclo), o agente DEVE acionar a rotina da skill [`project-handover`](/.agents/skills/project-handover/SKILL.md):

1. **Executar Verificação de Saúde:** Rodar `bash scripts/dev/agent-diagnostics.sh` e checar `git status`.
2. **Atualizar o Tacógrafo Vivo:** Registrar no arquivo [`docs/PROJECT_STATUS.md`](/docs/PROJECT_STATUS.md):
   * Timestamp e data do fechamento.
   * Resumo executivo do que foi concluído na sessão.
   * Status das 3 camadas e contagem de testes.
   * Atualização na Matriz de Requisitos da FATEC.
   * Lista de tarefas em andamento (*Work in Progress - WIP*).
   * **Próximos passos imediatos** para guiar a próxima sessão.
   * Novas lições aprendidas ou armadilhas técnicas conhecidas.
3. **Emitir o Cartão de Fechamento:** Apresentar uma mensagem resumida de encerramento ao usuário para que o dia seja finalizado com total previsibilidade e rastreabilidade.
