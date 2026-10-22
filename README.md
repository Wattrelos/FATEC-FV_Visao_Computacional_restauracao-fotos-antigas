# Projeto final disciplina

## 👨‍🏫 Metadados e Informações Acadêmicas
- **Instituição:** Faculdade de Tecnologia de Ferraz de Vasconcelos (FATEC-FV)
- **Curso:** Análise e Desenvolvimento de Sistemas (ADS)
- **Disciplina:** Visão Computacional / Trabalho de Graduação (TG)
- **Professora Orientadora:** Profa. Dra. Márcia Bissaco
- **Pesquisador / Desenvolvedor:** Josias Sobrinho

# Objetivo Geral

Demonstrar a capacidade de integrar múltiplas técnicas de processamento digital de imagens e vídeo, estruturando em forma de programa em funções modulares acessíveis via menu, desde operações básicas de entrada, visualização, redimensionamento, recorte e gravação, até aplicações avançadas de morfologia e reconhecimento facial, desenvolvendo uma solução funcional, coerente e aplicada.

## Descrição Geral

O projeto final consiste na criação de um software completo de processamento de imagens e vídeo, integrando os códigos e técnicas desenvolvidos ao longo do semestre. O objetivo é demonstrar o domínio das ferramentas e algoritmos estudados, por meio da implementação de um sistema capaz de aplicar diferentes transformações, filtros e análises sobre imagens — utilizando ou não a biblioteca OpenCV.

O programa pode ser implementado em Python (por exemplo, usando VSCode) e estruturado com funções modulares, cada uma responsável por uma operação de processamento de imagem. O sistema deve apresentar um menu simples para interação do usuário, permitindo a escolha das operações a serem aplicadas.

## Requisitos do Projeto

O software deverá contemplar (no mínimo) as seguintes técnicas e funcionalidades, organizadas em funções acessíveis via um menu simples:

### 🔹 Operações de entrada/saída e visualização  

- Abrir/ler imagens de arquivos
- Duplicar ou copiar imagens para processamento independente
- Mostrar simultaneamente a imagem original e a(s) imagem(ns) processada(s)
- Gravar/salvar a(s) imagem(ns) processada(s) em arquivo

### Operações básicas em imagens

- Inversão de cores
- Ajuste de brilho e contraste
- Adição e subtração de imagens
- Conversão para níveis de cinza
- Conversão entre modelos de cor RGB e HSV
- Redimensionamento da imagem
- Recorte de regiões de interesse (ROI)

### 🔹 Filtragem e realce

- Filtro da média
- Filtro da mediana
- Filtro gaussiano
- Filtros de detecção de bordas (Sobel, Canny)

### 🔹 Operações com histograma e transformações de intensidade

- Criação e exibição de histogramas
- Equalização de histograma
- Splitting e análise de canais de cor
- Binarização segundo um limiar (fixo, adaptativo ou método de Otsu)
- Quantização (redução controlada dos níveis de cinza ou cores)

### Segmentação e morfologia
- Crescimento de regiões
- Operações de morfologia matemática: erosão, dilatação, abertura e fechamento

### 🔹 Aplicações avançadas
- Reconhecimento facial, com base no código apresentado por Antonello ou em outras abordagens de visão computaciona


Ran command: `cat src-tauri/tauri.conf.json`
Ran command: `echo $PATH`
Ran command: `grep -i nvm ~/.bashrc`
Ran command: `export PATH="/home/sickla/.nvm/versions/node/v24.22.0/bin:${PATH}"; npm run tauri -- --help`

# Para executar o **RestauraFoto**
O fluxo varia conforme o objetivo (app desktop completo, apenas o motor Python ou build final):

---

### 🖥️ 1. Executar o App Desktop Completo (Recomendado)

O Tauri orquestra o frontend (Vite/TypeScript) e o backend nativo (Rust + Python/PyO3) simultaneamente. 

No diretório **raiz** do projeto (`/var/www/html/Visao/restaura-foto-antiga`):

```bash
npm run tauri dev
```

> **O que esse comando faz nos bastidores:**
> 1. Inicia o servidor Vite para a interface web reativa (`localhost:1420`).
> 2. Compila a casca nativa em Rust (`src-tauri`).
> 3. Conecta o interpretador Python embutido com OpenCV e NumPy via PyO3 a partir do `.venv`.
> 4. Abre a janela desktop nativa do **RestauraFoto** no seu ambiente gráfico.

*(Caso seu terminal informe `npm: comando não encontrado`, certifique-se de que o NVM está carregado: `source ~/.bashrc`)*.

---

### ⚙️ 2. Executar o Binário que Você Acabou de Compilar

Como você já executou com sucesso o `cargo build` dentro da pasta `src-tauri`, o binário compilado já existe em `src-tauri/target/debug/tauri-app`. 

Para executá-lo diretamente:

1. Em um terminal, inicie o servidor web da interface:
   ```bash
   npm run dev
   ```
2. Em outro terminal, lance a janela desktop compilada:
   ```bash
   ./src-tauri/target/debug/tauri-app
   ```

*(Nota: O erro que ocorreu anteriormente com `cargo build` na raiz aconteceu porque o `Cargo.toml` reside na pasta [src-tauri/Cargo.toml](file:///var/www/html/Visao/restaura-foto-antiga/src-tauri/Cargo.toml). Usando `npm run tauri dev` na raiz, o Tauri encontra o caminho automaticamente).*

---

### 🐍 3. Executar Apenas o Motor Python (Modo CLI / Testes da Disciplina)

Se você quiser testar as técnicas de visão computacional da FATEC diretamente sobre as fotos do [acervo-fotografico](file:///var/www/html/Visao/restaura-foto-antiga/acervo-fotografico) sem abrir a janela gráfica:

```bash
.venv/bin/python src-tauri/restaurar.py acervo-fotografico/acv_imgcapa_1434168951.jpg /tmp/resultado.png
```

---

### 🧪 4. Validar a Saúde Geral (Malha Fechada Tripla)

Para testar todas as 3 camadas (Rust, OpenCV e TypeScript) em 4 segundos antes de rodar o app:

```bash
npm test
```