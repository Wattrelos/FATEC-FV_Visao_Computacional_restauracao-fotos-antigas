# Estudo de Viabilidade de Plataformas

> [!NOTE]
> Rascunho que originou o [ADR 0001](docs/adr/0001-arquitetura-desktop-tauri-rust-python.md). A decisão formal e seus detalhes estão no ADR.

## Escopo

Software desktop (Windows/Linux/macOS) com o fluxo **carregar imagem → processar → salvar cópia**, dividido em duas partes:

- **Casca (Rust, via Tauri):** janela, interface (HTML/CSS/JS), abrir e salvar arquivos com segurança.
- **Motor (Python):** processamento das imagens com OpenCV.

Java e PHP ficam **fora do escopo** (software instalável, sem servidor, sem JVM).

## Arquitetura

```
[ Interface e Arquivos ] ──(caminho da foto)──> [ Motor de processamento ]
      Tauri (Rust)                                     Python (OpenCV)
  (Carrega/Salva no PC)                             (Restaura a imagem)
```

- O Rust abre a foto escolhida pelo usuário e repassa o **caminho** ao Python.
- O Python processa e grava o resultado; o Rust exibe o antes/depois e salva onde o usuário escolher.

## Pontos de atenção

- A casca Tauri tem ~10–20 MB, mas o Python empacotado com OpenCV eleva o instalador para a casa de **100–300 MB**.
- São três linguagens (Rust, JS, Python); se o prazo apertar, o motor Python pode ganhar uma interface PySide6 sem reescrita.
