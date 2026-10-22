# ADR 0001 — Arquitetura desktop com Tauri (Rust) + motor de processamento em Python

- **Status:** Aceito
- **Data:** 2026-10-22
- **Decisores:** Josias Sobrinho (desenvolvedor)
- **Consultados:** Profa. Dra. Márcia Bissaco (orientadora)
- **Projeto:** RestauraFoto — recuperação de fotos antigas de família
- **Origem:** [estudo-viabilidade-plataformas.md](../../estudo-viabilidade-plataformas.md)

---

## 1. Contexto

O RestauraFoto é um software para restaurar fotos escaneadas (amareladas, riscadas e desbotadas). O fluxo principal é:

```
carregar imagem → processar (filtros / visão computacional) → exibir antes/depois → salvar cópia
```

Requisitos que influenciam a arquitetura (ver [README.md](../../README.md) e [restaura-foto-antiga.md](../../restaura-foto-antiga.md)):

- Processamento baseado em **OpenCV** (mediana, gaussiano, equalização, HSV, binarização, morfologia, `cv2.inpaint`, crescimento de regiões, reconhecimento facial). O ecossistema dessas bibliotecas é, na prática, **Python**.
- Funções modulares acessíveis por **menu**.
- Exibir **simultaneamente** a imagem original e a processada (o "antes/depois" é o diferencial do projeto).
- Abrir e **salvar arquivos locais** com segurança.
- Público-alvo usa computador pessoal (Windows/Linux/macOS); o produto é um **software instalável**, não um serviço web.

A questão a decidir **não** é a linguagem do processamento (Python é obrigatório), e sim **qual tecnologia gerencia a interface, o carregamento e o salvamento de arquivos**.

## 2. Fatores de decisão

| # | Fator | Peso |
|---|-------|------|
| F1 | Reaproveitar o código Python/OpenCV da disciplina sem reescrita | Alto |
| F2 | Interface moderna e visual (antes/depois, slider, histograma) | Alto |
| F3 | Distribuição como app desktop instalável, sem exigir runtimes do usuário | Médio |
| F4 | Consumo de memória e tamanho do instalador | Médio |
| F5 | Segurança no acesso ao sistema de arquivos | Médio |
| F6 | Curva de aprendizado / prazo acadêmico | Médio |

## 3. Opções consideradas

1. **Tauri (Rust) + Python** — Rust gerencia janela e arquivos; UI em HTML/CSS/JS; Python como motor de processamento.
2. **Python puro (Tkinter / PyQt / PySide)** — interface e processamento na mesma linguagem.

> [!NOTE]
> **Fora de escopo:** Java (JavaFX) e PHP foram descartados já no estudo de viabilidade — PHP exige servidor e upload das fotos (não é software instalável) e Java adiciona uma JVM sem ganho sobre o Rust.

## 4. Decisão

**Adotar Tauri (v2) com núcleo em Rust e o motor de processamento em Python embutido via PyO3.**

```
┌──────────────────────────────┐       Chamadas PyO3 / GIL       ┌──────────────────────────┐
│  Tauri (Rust)                │ ──────────────────────────────▶ │  Módulo Python Embutido  │
│  • Janela e permissões       │                                 │  • restaurar.py          │
│  • Diálogos nativos          │ ◀────────────────────────────── │  • OpenCV / NumPy (.venv)│
│  • UI web moderna            │   JSON (dados base64/histograma)│  • Filtros, CLAHE, Inpaint│
└──────────────────────────────┘                                 └──────────────────────────┘
        "casca"  (rápida e segura)                                     "cérebro" (visão comp.)
```

### 4.1 Detalhes da integração

- **Mecanismo:** o Python é executado no mesmo processo via crate `pyo3` (`auto-initialize`), eliminando a necessidade de gerenciar processos filhos e empacotamento com PyInstaller durante o desenvolvimento.
- **Isolamento de threads:** as chamadas ao Python rodam em `tauri::async_runtime::spawn_blocking`, mantendo a interface web 100% responsiva mesmo em filtros pesados.
- **Dependências:** o Rust localiza e injeta dinamicamente o `site-packages` do `.venv` local no `sys.path` antes de importar o OpenCV/NumPy.
- **Protocolo de dados:** troca de strings JSON estruturadas entre Rust e Python contendo parâmetros dos filtros, histogramas de cores e prévias para renderização imediata.
- **Gravação em resolução total:** a foto original é preservada intacta; o processamento em resolução máxima é executado somente ao solicitar o salvamento da nova cópia restaurada.

## 5. Justificativa

| Fator | Tauri + Python | Python puro |
|-------|:-:|:-:|
| F1 Reuso do código Python | ✅ | ✅ |
| F2 UI moderna | ✅ (web) | ⚠️ (Qt razoável, Tk limitado) |
| F3 App instalável | ✅ | ✅ |
| F4 Leveza da "casca" | ✅ | ✅ |
| F5 Segurança de arquivos | ✅ (permissões explícitas) | ⚠️ |
| F6 Curva de aprendizado | ⚠️ (Rust + JS + Python) | ✅ |

- **Python puro:** rejeitado como arquitetura principal por limitar a qualidade da interface e não separar claramente interface e motor. **Permanece como plano de contingência** (ver §7).
- **Tauri + Python:** escolhido pela UI web moderna, casca leve em Rust, modelo de permissões seguro e separação limpa entre interface e motor, o que também facilita testar o motor Python isoladamente (via CLI) para a avaliação acadêmica.

## 6. Consequências

### Positivas
- Separação clara **Frontend/Estrutura × Backend/Motor**; o motor Python pode ser testado e demonstrado sozinho.
- Casca do app leve e com baixo consumo de RAM (WebView nativo, sem Chromium embutido).
- Acesso a arquivos controlado pelo Rust, com permissões declarativas do Tauri.
- UI em HTML/CSS/JS permite slider antes/depois, histogramas e animações com facilidade.

### Negativas / riscos
- **Tamanho do instalador:** a casca Tauri tem ~10–20 MB, mas o **sidecar Python com OpenCV + NumPy (+ dlib/face_recognition, se usados) adiciona tipicamente 100–300 MB** ao instalador final.
- **Três linguagens** (Rust, JavaScript, Python) aumentam a complexidade e a curva de aprendizado.
- **Build multiplataforma:** o sidecar precisa ser gerado em cada SO alvo (PyInstaller não faz cross-compile), com nome sufixado pelo *target triple* exigido pelo Tauri.
- Antivírus podem sinalizar executáveis do PyInstaller (falsos positivos), especialmente no Windows.
- Tempo de inicialização do sidecar (import de OpenCV/modelos) — mitigado mantendo o processo vivo.

## 7. Plano de contingência

Se o empacotamento do sidecar ou o prazo se tornarem impeditivos, o motor Python (já isolado e com interface CLI/JSON) poderá ser usado diretamente com uma interface **PySide6/PyQt**, sem reescrita do processamento.

## 8. Decisões relacionadas / pendentes

- [ ] ADR 0002 — Ferramenta de empacotamento do Python (PyInstaller × Nuitka × python-build-standalone).
- [ ] ADR 0003 — Framework de UI do frontend (JS puro × Svelte × React).
- [ ] ADR 0004 — Biblioteca de reconhecimento facial (Haar/LBPH do OpenCV × face_recognition/dlib × DNN do OpenCV).

## 9. Referências

- Tauri v2 — Embedding external binaries (sidecar): <https://v2.tauri.app/develop/sidecar/>
- Tauri v2 — Security / Permissions: <https://v2.tauri.app/security/>
- PyInstaller: <https://pyinstaller.org/>
- MADR — Markdown Architectural Decision Records: <https://adr.github.io/madr/>
