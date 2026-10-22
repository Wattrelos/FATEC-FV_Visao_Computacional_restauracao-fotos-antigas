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