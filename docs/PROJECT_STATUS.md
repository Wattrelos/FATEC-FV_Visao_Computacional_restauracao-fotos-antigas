# 📊 Tacógrafo Vivo de Engenharia & Status Operacional — RestauraFoto

> [!IMPORTANT]
> **Documento Canônico de Memória Contínua:** Este arquivo deve ser consultado obrigatoriamente no início de cada sessão (Cold Start) e atualizado ao final de cada jornada de trabalho (Handover).

---

## 👨‍🏫 1. Metadados Acadêmicos & Institucionais

* **Instituição:** Faculdade de Tecnologia de Ferraz de Vasconcelos (FATEC-FV)
* **Curso:** Análise e Desenvolvimento de Sistemas (ADS)
* **Disciplina:** Visão Computacional / Trabalho de Graduação (TG)
* **Professora Orientadora:** Profa. Dra. Márcia Bissaco
* **Pesquisador & Desenvolvedor:** Josias Sobrinho
* **Repositório Oficial:** `Wattrelos/FATEC-FV_Visao_Computacional_restauracao-fotos-antigas`

---

## ⚡ 2. Status Geral da Engenharia (ADR 0001)

| Parâmetro | Detalhe Técnico | Status |
| :--- | :--- | :--- |
| **Casca Nativa** | Rust (Tauri v2 + PyO3 0.23, `auto-initialize`) | 🟢 Compilando Estritamente (0 Erros) |
| **Motor CV** | Python 3.13.5 (OpenCV 5.0.0, NumPy 2.5.4 headless) | 🟢 7 Testes Unitários Aprovados |
| **Frontend Web** | TypeScript 6.0 + Vite 8.0 + Modern Vanilla CSS | 🟢 0 Erros de Tipagem (`tsc --noEmit`) |
| **Diagnóstico TACL** | `bash scripts/dev/agent-diagnostics.sh` | 🟢 100% Saudável (~4.8s) |
| **Data do Checkpoint**| 2026-10-22 | 16:14 BRT |

---

## 🎯 3. Matriz de Requisitos da Disciplina (FATEC-FV)

### 🔹 Operações de Entrada/Saída e Visualização
- [x] Abrir/ler imagens de arquivos nativos pelo SO (`tauri-plugin-dialog`)
- [x] Duplicar ou copiar imagens para processamento independente
- [x] Mostrar simultaneamente a imagem original e a processada (slider antes/depois no frontend)
- [x] Gravar/salvar a imagem processada em arquivo em resolução máxima
- [x] Trava de segurança: a imagem original nunca é sobrescrita

### 🔹 Operações Básicas em Imagens
- [x] Inversão de cores
- [x] Ajuste de brilho e contraste
- [x] Adição e subtração de imagens (mapa de calor/diferenças gerado por subtração absoluta)
- [x] Conversão para níveis de cinza
- [x] Conversão entre modelos de cor RGB e HSV (balanceamento de saturação)
- [x] Redimensionamento da imagem (preview interativo de 1400px para fluidez)
- [ ] Recorte de regiões de interesse (ROI) interativo

### 🔹 Filtragem e Realce
- [x] Filtro da média
- [x] Filtro da mediana (remoção de granulação e ruído sal-e-pimenta)
- [x] Filtro gaussiano (suavização)
- [ ] Filtros de detecção de bordas (Sobel, Canny) para exibição estrutural

### 🔹 Operações com Histograma e Intensidade
- [x] Criação e exibição de histogramas (canais R, G, B em 64 bins normalizados no frontend)
- [x] Equalização adaptativa de histograma (CLAHE no espaço de cor LAB / canal L)
- [x] Splitting e análise de canais de cor (algoritmo Gray-World para neutralizar amarelado)
- [x] Binarização segundo um limiar (geração da máscara de riscos)
- [x] Quantização controlada de intensidade

### 🔹 Segmentação e Morfologia
- [x] Operações de morfologia matemática: dilatação, erosão, top-hat e black-hat
- [x] Reconstrução com `cv2.inpaint` sobre a máscara morfológica
- [ ] Crescimento de regiões a partir do clique do mouse

### 🔹 Aplicações Avançadas
- [ ] Reconhecimento facial para identificação de parentes nas fotos de família

---

## 🏆 4. Conquistas e Entregas Desta Sessão

1. **Modal e Botão de Créditos Acadêmicos:**
   - Adicionado botão 'Créditos' na barra superior com ícone acadêmico.
   - Implementado modal com estética 'câmara escura' e glassmorphism contendo todos os metadados da FATEC-FV, curso ADS, disciplina de Visão Computacional, Profa. Dra. Márcia Bissaco e desenvolvedor Josias Sobrinho.
   - Suporte completo a atalho (ESC), clique no backdrop e acessibilidade.
2. **Importação e Adaptação das Ferramentas de Ciclo-Fechado (TACL Triplo):**
   - Adaptada a suíte de auto-cura do projeto `Rust-e-commerce-Alpha` para a arquitetura híbrida Tauri + Python + TypeScript do RestauraFoto.
   - Criados `scripts/dev/agent-diagnostics.py` e `scripts/dev/agent-diagnostics.sh`.
   - Adicionada suíte de testes unitários de visão computacional em `tests/test_motor_cv.py` (7 testes cobrindo inpainting, CLAHE, HSV, E/S e trava de integridade).
2. **Criação das Skills Especializadas do Agente:**
   - `.agents/skills/self-healing/`: Malha fechada com auto-cura e diagnósticos estruturados em Markdown.
   - `.agents/skills/architecture-guard/`: Guardião de fronteiras do ADR 0001 e preservação da imagem original.
   - `.agents/skills/project-handover/`: Gerenciador de continuidade, briefing de abertura e checkpoint diário.
   - `.agents/sidecars.json`: Suporte para subagentes locais via Ollama.
3. **Formalização da Governança Canônica:**
   - Criados [AGENTS.md](/AGENTS.md) e [docs/PROJECT_STATUS.md](/docs/PROJECT_STATUS.md).

---

## 🚧 5. Tarefas em Andamento (WIP)

- **Testes da Interface Gráfica:** Homologar execução em tempo real do frontend com o motor PyO3 compilado.
- **Técnicas FATEC Pendentes:** Planejamento dos módulos de detecção de bordas (Canny/Sobel), recorte de ROI e crescimento de regiões.

---

## 📋 6. Próximos Passos Prioritários

1. **Adicionar filtros de Canny/Sobel e Recorte de ROI:** Completar os requisitos de bordas e seleção da grade da disciplina no `restaurar.py`.
2. **Implementar Crescimento de Regiões:** Adicionar ferramenta interativa com clique do mouse para selecionar manchas ou marcas d'água.
3. **Módulo de Reconhecimento Facial:** Implementar detecção facial Haar Cascade ou DNN do OpenCV para etiquetar rostos de parentes nas fotos.
4. **Empacotamento de Produção:** Testar geração do binário Tauri com os recursos empacotados.

---

## 🧠 7. Base de Conhecimento e Armadilhas Técnicas Conhecidas

* **PyO3 GIL Locking:** Operações pesadas do Python devem sempre ser despachadas com `tauri::async_runtime::spawn_blocking` para não congelar o WebView nativo.
* **Injeção Dinâmica do `site-packages`:** O Rust detecta o `.venv` do projeto e adiciona ao `sys.path` dinamicamente antes de importar o OpenCV/NumPy.
* **Preservação Não Destrutiva:** O método `salvar()` em `restaurar.py` rejeita ativamente gravar o arquivo com o mesmo caminho da imagem de entrada (`ValueError`).
* **Resolução Dupla:** A pré-visualização opera sobre uma imagem com lado máximo de 1400px (`LADO_PREVIEW`), enquanto a gravação final ocorre sobre a matriz original em resolução nativa.

---

## 📜 8. Histórico Recente de Entregas

* **2026-10-22:** Implantação da Malha Fechada de Auto-Cura (TACL Triplo), suíte de testes de visão computacional, skills especializadas (`self-healing`, `architecture-guard`, `project-handover`), `AGENTS.md` e `docs/PROJECT_STATUS.md`.
