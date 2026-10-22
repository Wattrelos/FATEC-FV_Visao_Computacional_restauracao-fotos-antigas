import { invoke } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";

// ----------------------------------------------------------------------------
// Tipos de dados
// ----------------------------------------------------------------------------
interface OpcoesRiscos {
  ativo: boolean;
  limiar: number;
  kernel: number;
  dilatacao: number;
  raio: number;
  tipo: "claros" | "escuros" | "ambos";
}

interface OpcoesGranulacao {
  ativo: boolean;
  mediana: number;
  gaussiano: number;
}

interface OpcoesAmarelado {
  ativo: boolean;
  intensidade: number;
  saturacao: number;
}

interface OpcoesDesbotado {
  ativo: boolean;
  clahe: number;
  brilho: number;
  contraste: number;
}

interface OpcoesPipeline {
  riscos: OpcoesRiscos;
  granulacao: OpcoesGranulacao;
  amarelado: OpcoesAmarelado;
  desbotado: OpcoesDesbotado;
}

interface CanaisHistograma {
  r: number[];
  g: number[];
  b: number[];
}

interface RespostaAbrir {
  nome: string;
  largura: number;
  altura: number;
  original: string;
  histograma: CanaisHistograma;
  opcoes: OpcoesPipeline;
}

interface RespostaProcessar {
  restaurada: string;
  diferenca: string;
  mascara: string | null;
  pixels_mascara: number;
  histograma: CanaisHistograma;
  tempo_ms: number;
}

interface RespostaSalvar {
  caminho: string;
  largura: number;
  altura: number;
  tempo_ms: number;
}

// ----------------------------------------------------------------------------
// Estado global da aplicação
// ----------------------------------------------------------------------------
const OPCOES_INICIAIS: OpcoesPipeline = {
  riscos: { ativo: true, limiar: 40, kernel: 9, dilatacao: 1, raio: 3, tipo: "ambos" },
  granulacao: { ativo: true, mediana: 3, gaussiano: 3 },
  amarelado: { ativo: true, intensidade: 80, saturacao: 90 },
  desbotado: { ativo: true, clahe: 2.0, brilho: 0, contraste: 1.05 },
};

let opcoesAtuais: OpcoesPipeline = JSON.parse(JSON.stringify(OPCOES_INICIAIS));
let fotoCarregada = false;
let caminhoAtual = "";
let histOriginal: CanaisHistograma | null = null;
let histRestaurada: CanaisHistograma | null = null;
let debounceTimeout: number | undefined;

// Elementos da UI
let btnAbrir: HTMLButtonElement;
let btnSalvar: HTMLButtonElement;
let btnReset: HTMLButtonElement;
let dropzone: HTMLButtonElement;
let fileChip: HTMLElement;
let fileName: HTMLElement;
let fileDims: HTMLElement;
let statusMsg: HTMLElement;
let statusExtra: HTMLElement;
let loader: HTMLElement;
let loaderText: HTMLElement;
let compareBox: HTMLElement;
let handle: HTMLElement;
let cmpOriginal: HTMLImageElement;
let cmpRestaurada: HTMLImageElement;
let ladoOriginal: HTMLImageElement;
let ladoRestaurada: HTMLImageElement;
let imgDiferenca: HTMLImageElement;
let imgMascara: HTMLImageElement;
let capMascara: HTMLElement;
let tabIndicator: HTMLElement;
let canvasHist: HTMLCanvasElement;
let toastEl: HTMLElement;
let toastTimeout: number | undefined;

// ----------------------------------------------------------------------------
// Definição dos Controles do Painel Lateral
// ----------------------------------------------------------------------------
interface DefinicaoCampo {
  chave: string;
  label: string;
  min?: number;
  max?: number;
  step?: number;
  sufixo?: string;
  tipo?: "slider" | "seg";
  opcoesSeg?: Array<{ valor: string; rotulo: string }>;
}

interface DefinicaoEtapa {
  id: keyof OpcoesPipeline;
  titulo: string;
  subtitulo: string;
  icone: string;
  campos: DefinicaoCampo[];
}

const ETAPAS: DefinicaoEtapa[] = [
  {
    id: "riscos",
    titulo: "Remover Riscos",
    subtitulo: "Top-hat / Black-hat + Inpaint",
    icone: `<svg viewBox="0 0 24 24"><path d="m18 15-6-6-6 6"/><path d="m14 19-2-2-2 2"/><path d="M4 4h16v16H4z"/></svg>`,
    campos: [
      {
        chave: "tipo",
        label: "Riscos a detectar",
        tipo: "seg",
        opcoesSeg: [
          { valor: "claros", rotulo: "Claros" },
          { valor: "escuros", rotulo: "Escuros" },
          { valor: "ambos", rotulo: "Ambos" },
        ],
      },
      { chave: "limiar", label: "Sensibilidade (limiar)", min: 10, max: 100, step: 2 },
      { chave: "kernel", label: "Espessura máx. do risco", min: 3, max: 25, step: 2, sufixo: "px" },
      { chave: "dilatacao", label: "Margem de segurança", min: 0, max: 4, step: 1, sufixo: "px" },
      { chave: "raio", label: "Raio do inpaint", min: 1, max: 8, step: 1, sufixo: "px" },
    ],
  },
  {
    id: "granulacao",
    titulo: "Suavizar Granulação",
    subtitulo: "Filtro da mediana + Gaussiano",
    icone: `<svg viewBox="0 0 24 24"><circle cx="6" cy="6" r="1.5"/><circle cx="12" cy="7" r="1.2"/><circle cx="18" cy="6" r="1"/><circle cx="7" cy="12" r="1"/><circle cx="12" cy="12" r="1.5"/><circle cx="17" cy="13" r="1.2"/><circle cx="6" cy="18" r="1.2"/><circle cx="12" cy="17" r="1"/><circle cx="18" cy="18" r="1.5"/></svg>`,
    campos: [
      { chave: "mediana", label: "Filtro mediana (ruído de sal)", min: 1, max: 7, step: 2, sufixo: "px" },
      { chave: "gaussiano", label: "Desfoque gaussiano", min: 1, max: 9, step: 2, sufixo: "px" },
    ],
  },
  {
    id: "amarelado",
    titulo: "Corrigir Amarelado",
    subtitulo: "Balanço Gray-World + Saturação HSV",
    icone: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72 1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>`,
    campos: [
      { chave: "intensidade", label: "Força da correção", min: 0, max: 100, step: 5, sufixo: "%" },
      { chave: "saturacao", label: "Saturação de cores", min: 0, max: 150, step: 5, sufixo: "%" },
    ],
  },
  {
    id: "desbotado",
    titulo: "Recuperar Contraste",
    subtitulo: "Equalização adaptativa (CLAHE)",
    icone: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 1 0 20z" fill="currentColor"/></svg>`,
    campos: [
      { chave: "clahe", label: "Equalização CLAHE", min: 0, max: 6, step: 0.2 },
      { chave: "contraste", label: "Contraste linear", min: 0.7, max: 1.8, step: 0.05, sufixo: "x" },
      { chave: "brilho", label: "Ajuste de brilho", min: -50, max: 50, step: 2 },
    ],
  },
];

// ----------------------------------------------------------------------------
// Inicialização
// ----------------------------------------------------------------------------
window.addEventListener("DOMContentLoaded", () => {
  vincularElementos();
  construirPainelEtapas();
  configurarEventosGerais();
  configurarSliderComparacao();
  configurarAbas();
  atualizarIndicadorAba();
  redesenharHistograma();
});

function vincularElementos() {
  btnAbrir = document.querySelector("#btn-abrir")!;
  btnSalvar = document.querySelector("#btn-salvar")!;
  btnReset = document.querySelector("#btn-reset")!;
  dropzone = document.querySelector("#dropzone")!;
  fileChip = document.querySelector("#file-chip")!;
  fileName = document.querySelector("#file-name")!;
  fileDims = document.querySelector("#file-dims")!;
  statusMsg = document.querySelector("#status")!;
  statusExtra = document.querySelector("#status-extra")!;
  loader = document.querySelector("#loader")!;
  loaderText = document.querySelector("#loader-text")!;
  compareBox = document.querySelector("#compare")!;
  handle = document.querySelector("#handle")!;
  cmpOriginal = document.querySelector("#cmp-original")!;
  cmpRestaurada = document.querySelector("#cmp-restaurada")!;
  ladoOriginal = document.querySelector("#lado-original")!;
  ladoRestaurada = document.querySelector("#lado-restaurada")!;
  imgDiferenca = document.querySelector("#img-diferenca")!;
  imgMascara = document.querySelector("#img-mascara")!;
  capMascara = document.querySelector("#cap-mascara")!;
  tabIndicator = document.querySelector("#tab-indicator")!;
  canvasHist = document.querySelector("#hist")!;
  toastEl = document.querySelector("#toast")!;
}

// ----------------------------------------------------------------------------
// Construção e Atualização dos Controles
// ----------------------------------------------------------------------------
function construirPainelEtapas() {
  const container = document.querySelector("#etapas");
  if (!container) return;
  container.innerHTML = "";

  ETAPAS.forEach((etapa) => {
    const estadoEtapa = opcoesAtuais[etapa.id];
    const card = document.createElement("section");
    card.className = `card ${estadoEtapa.ativo ? "on" : ""}`;
    card.id = `card-${etapa.id}`;

    const head = document.createElement("div");
    head.className = "card-head";

    const icon = document.createElement("div");
    icon.className = "card-icon";
    icon.innerHTML = etapa.icone;

    const grow = document.createElement("div");
    grow.className = "grow";
    grow.innerHTML = `<h3>${etapa.titulo}</h3><span class="sub">${etapa.subtitulo}</span>`;

    const switchLabel = document.createElement("label");
    switchLabel.className = "switch";
    switchLabel.title = `Ativar/Desativar ${etapa.titulo}`;

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = estadoEtapa.ativo;
    checkbox.id = `chk-${etapa.id}`;
    checkbox.addEventListener("change", () => {
      opcoesAtuais[etapa.id].ativo = checkbox.checked;
      card.classList.toggle("on", checkbox.checked);
      agendarReprocessamento();
    });

    const track = document.createElement("span");
    track.className = "track";

    switchLabel.appendChild(checkbox);
    switchLabel.appendChild(track);

    head.appendChild(icon);
    head.appendChild(grow);
    head.appendChild(switchLabel);
    card.appendChild(head);

    // Corpo colapsável com sliders
    const body = document.createElement("div");
    body.className = "card-body";

    const wrap = document.createElement("div");
    const controls = document.createElement("div");
    controls.className = "controls";

    etapa.campos.forEach((campo) => {
      if (campo.tipo === "seg") {
        const ctlDiv = document.createElement("div");
        ctlDiv.className = "ctl";
        ctlDiv.innerHTML = `<label><span>${campo.label}</span></label>`;

        const seg = document.createElement("div");
        seg.className = "seg";
        campo.opcoesSeg?.forEach((op) => {
          const btn = document.createElement("button");
          btn.type = "button";
          // @ts-expect-error campo indexavel
          const valorAtual = opcoesAtuais[etapa.id][campo.chave];
          if (valorAtual === op.valor) btn.classList.add("active");
          btn.textContent = op.rotulo;
          btn.addEventListener("click", () => {
            seg.querySelectorAll("button").forEach((b) => b.classList.remove("active"));
            btn.classList.add("active");
            // @ts-expect-error campo indexavel
            opcoesAtuais[etapa.id][campo.chave] = op.valor;
            agendarReprocessamento();
          });
          seg.appendChild(btn);
        });
        ctlDiv.appendChild(seg);
        controls.appendChild(ctlDiv);
      } else {
        const ctlDiv = document.createElement("div");
        ctlDiv.className = "ctl";

        // @ts-expect-error campo indexavel
        const valAtual = opcoesAtuais[etapa.id][campo.chave];
        const valFormatado = formatarValor(valAtual, campo.sufixo);

        const lbl = document.createElement("label");
        lbl.innerHTML = `<span>${campo.label}</span><output id="out-${etapa.id}-${campo.chave}">${valFormatado}</output>`;

        const slider = document.createElement("input");
        slider.type = "range";
        slider.min = String(campo.min ?? 0);
        slider.max = String(campo.max ?? 100);
        slider.step = String(campo.step ?? 1);
        slider.value = String(valAtual);
        slider.id = `range-${etapa.id}-${campo.chave}`;

        atualizarPreenchimentoSlider(slider);

        slider.addEventListener("input", () => {
          const num = Number(slider.value);
          // @ts-expect-error campo indexavel
          opcoesAtuais[etapa.id][campo.chave] = num;
          const out = document.querySelector(`#out-${etapa.id}-${campo.chave}`);
          if (out) out.textContent = formatarValor(num, campo.sufixo);
          atualizarPreenchimentoSlider(slider);
          agendarReprocessamento();
        });

        ctlDiv.appendChild(lbl);
        ctlDiv.appendChild(slider);
        controls.appendChild(ctlDiv);
      }
    });

    wrap.appendChild(controls);
    body.appendChild(wrap);
    card.appendChild(body);
    container.appendChild(card);
  });
}

function formatarValor(val: number | string, sufixo?: string): string {
  const num = typeof val === "number" ? val : parseFloat(val);
  const texto = Number.isInteger(num) ? String(num) : num.toFixed(2);
  return sufixo ? `${texto}${sufixo}` : texto;
}

function atualizarPreenchimentoSlider(input: HTMLInputElement) {
  const min = Number(input.min) || 0;
  const max = Number(input.max) || 100;
  const val = Number(input.value);
  const percent = ((val - min) / (max - min)) * 100;
  input.style.setProperty("--fill", `${percent}%`);
}

function sincronizarControlesComEstado() {
  ETAPAS.forEach((etapa) => {
    const estado = opcoesAtuais[etapa.id];
    const chk = document.querySelector<HTMLInputElement>(`#chk-${etapa.id}`);
    const card = document.querySelector(`#card-${etapa.id}`);
    if (chk) chk.checked = estado.ativo;
    if (card) card.classList.toggle("on", estado.ativo);

    etapa.campos.forEach((campo) => {
      if (campo.tipo !== "seg") {
        const slider = document.querySelector<HTMLInputElement>(`#range-${etapa.id}-${campo.chave}`);
        const out = document.querySelector(`#out-${etapa.id}-${campo.chave}`);
        // @ts-expect-error campo indexavel
        const val = estado[campo.chave];
        if (slider) {
          slider.value = String(val);
          atualizarPreenchimentoSlider(slider);
        }
        if (out) out.textContent = formatarValor(val, campo.sufixo);
      }
    });
  });
}

// ----------------------------------------------------------------------------
// Ações de Carregar, Processar e Salvar
// ----------------------------------------------------------------------------
async function escolherEAbrirFoto() {
  try {
    const selecionado = await open({
      multiple: false,
      filters: [
        {
          name: "Imagens Antigas",
          extensions: ["jpg", "jpeg", "png", "tif", "tiff", "bmp", "webp"],
        },
      ],
    });

    if (selecionado && typeof selecionado === "string") {
      await carregarFoto(selecionado);
    }
  } catch (err) {
    mostrarToast(`Erro ao abrir diálogo: ${String(err)}`, "err");
  }
}

async function carregarFoto(caminho: string) {
  mostrarLoader(true, "Carregando foto e preparando o motor…");
  try {
    const resp = await invoke<RespostaAbrir>("abrir_foto", { caminho });

    caminhoAtual = caminho;
    fotoCarregada = true;

    // Atualiza cabeçalho com dados do arquivo
    fileChip.hidden = false;
    fileName.textContent = resp.nome;
    fileDims.textContent = `· ${resp.largura} × ${resp.altura} px`;

    // Atualiza imagens da UI
    cmpOriginal.src = resp.original;
    ladoOriginal.src = resp.original;
    histOriginal = resp.histograma;

    // Esconde dropzone e mostra visualizador
    dropzone.hidden = true;
    alternarModoVisualizacao("comparar");

    // Habilita ações
    btnSalvar.disabled = false;
    btnReset.disabled = false;

    statusMsg.textContent = `${resp.nome} (${resp.largura}×${resp.altura})`;
    statusExtra.textContent = "Aplicando restaurações…";

    mostrarToast(`Foto aberta com sucesso!`, "ok");

    // Executa a primeira restauração com as opções padrão
    await dispararProcessamento(false);
  } catch (err) {
    console.error("Erro ao abrir foto:", err);
    mostrarToast(String(err), "err");
    statusMsg.textContent = "Falha ao abrir arquivo.";
  } finally {
    mostrarLoader(false);
  }
}

function agendarReprocessamento() {
  if (!fotoCarregada) return;
  window.clearTimeout(debounceTimeout);
  debounceTimeout = window.setTimeout(() => {
    dispararProcessamento(true);
  }, 180);
}

async function dispararProcessamento(suave = true) {
  if (!fotoCarregada) return;

  mostrarLoader(true, suave ? "" : "Processando filtros…", suave);
  try {
    const inicio = performance.now();
    const resp = await invoke<RespostaProcessar>("processar", { opcoes: opcoesAtuais });
    const tempoTotal = Math.round(performance.now() - inicio);

    cmpRestaurada.src = resp.restaurada;
    ladoRestaurada.src = resp.restaurada;
    imgDiferenca.src = resp.diferenca;

    if (resp.mascara) {
      imgMascara.src = resp.mascara;
      capMascara.textContent = `Máscara gerada: ${resp.pixels_mascara.toLocaleString("pt-BR")} px de riscos reparados com inpaint`;
    } else {
      capMascara.textContent = "Etapa de riscos desativada.";
    }

    histRestaurada = resp.histograma;
    redesenharHistograma();

    statusExtra.textContent = `Processado em ${resp.tempo_ms} ms (Py/OpenCV) · total ${tempoTotal} ms`;
  } catch (err) {
    console.error("Erro no processamento:", err);
    mostrarToast(`Erro ao restaurar: ${String(err)}`, "err");
  } finally {
    mostrarLoader(false);
  }
}

async function salvarCopiaRestaurada() {
  if (!fotoCarregada) return;

  const extensaoOriginal = caminhoAtual.split(".").pop() || "png";
  const nomePadrao = caminhoAtual.replace(/(\.[^.]+)$/, "_restaurada.$1");

  try {
    const caminhoDestino = await save({
      defaultPath: nomePadrao,
      filters: [
        {
          name: "Imagem Restaurada",
          extensions: [extensaoOriginal, "png", "jpg"],
        },
      ],
    });

    if (!caminhoDestino) return;

    mostrarLoader(true, "Reaplicando filtros em resolução total e salvando…");
    const resp = await invoke<RespostaSalvar>("salvar_foto", { caminho: caminhoDestino });

    mostrarToast(`Cópia salva com sucesso em ${resp.tempo_ms} ms!`, "ok");
    statusExtra.textContent = `Salvo: ${resp.largura}×${resp.altura} px em ${resp.caminho}`;
  } catch (err) {
    console.error("Erro ao salvar:", err);
    mostrarToast(String(err), "err");
  } finally {
    mostrarLoader(false);
  }
}

// ----------------------------------------------------------------------------
// Comparador Antes/Depois (Divisor Arrastável)
// ----------------------------------------------------------------------------
function configurarSliderComparacao() {
  let arrastando = false;

  const atualizarPosicao = (clientX: number) => {
    const rect = compareBox.getBoundingClientRect();
    if (rect.width <= 0) return;
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percent = ((x / rect.width) * 100).toFixed(2);
    compareBox.style.setProperty("--pos", `${percent}%`);
    handle.setAttribute("aria-valuenow", String(Math.round(Number(percent))));
  };

  const iniciarArrasto = (e: MouseEvent | TouchEvent) => {
    arrastando = true;
    const x = "touches" in e ? e.touches[0].clientX : e.clientX;
    atualizarPosicao(x);
  };

  const moverArrasto = (e: MouseEvent | TouchEvent) => {
    if (!arrastando) return;
    const x = "touches" in e ? e.touches[0].clientX : e.clientX;
    atualizarPosicao(x);
  };

  const pararArrasto = () => {
    arrastando = false;
  };

  compareBox.addEventListener("mousedown", iniciarArrasto);
  window.addEventListener("mousemove", moverArrasto);
  window.addEventListener("mouseup", pararArrasto);

  compareBox.addEventListener("touchstart", iniciarArrasto, { passive: true });
  window.addEventListener("touchmove", moverArrasto, { passive: true });
  window.addEventListener("touchend", pararArrasto);

  // Acessibilidade via teclado
  handle.addEventListener("keydown", (e) => {
    const atual = Number(handle.getAttribute("aria-valuenow")) || 50;
    let novo = atual;
    if (e.key === "ArrowLeft" || e.key === "ArrowDown") novo = Math.max(0, atual - 5);
    else if (e.key === "ArrowRight" || e.key === "ArrowUp") novo = Math.min(100, atual + 5);
    else return;
    compareBox.style.setProperty("--pos", `${novo}%`);
    handle.setAttribute("aria-valuenow", String(novo));
  });
}

// ----------------------------------------------------------------------------
// Abas e Visualizações
// ----------------------------------------------------------------------------
function configurarAbas() {
  const botoesAba = document.querySelectorAll<HTMLButtonElement>(".tab");
  botoesAba.forEach((btn) => {
    btn.addEventListener("click", () => {
      botoesAba.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const modo = btn.dataset.modo || "comparar";
      alternarModoVisualizacao(modo);
      atualizarIndicadorAba();
    });
  });
}

function alternarModoVisualizacao(modo: string) {
  const visoes = ["comparar", "lado", "diferenca", "mascara"];
  visoes.forEach((m) => {
    const el = document.querySelector(`#view-${m}`) as HTMLElement;
    if (el) el.hidden = m !== modo || !fotoCarregada;
  });
  if (!fotoCarregada) {
    dropzone.hidden = false;
  }
}

function atualizarIndicadorAba() {
  const abaAtiva = document.querySelector<HTMLButtonElement>(".tab.active");
  if (!abaAtiva || !tabIndicator) return;
  tabIndicator.style.left = `${abaAtiva.offsetLeft}px`;
  tabIndicator.style.width = `${abaAtiva.offsetWidth}px`;
}

// ----------------------------------------------------------------------------
// Gráfico do Histograma (Canvas)
// ----------------------------------------------------------------------------
function redesenharHistograma() {
  if (!canvasHist) return;
  const ctx = canvasHist.getContext("2d");
  if (!ctx) return;

  const w = canvasHist.width;
  const h = canvasHist.height;
  ctx.clearRect(0, 0, w, h);

  // Grade sutil
  ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
  ctx.lineWidth = 1;
  for (let i = 1; i <= 3; i++) {
    const y = (h / 4) * i;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  if (!histOriginal && !histRestaurada) {
    ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
    ctx.font = "12px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Histograma será exibido ao carregar uma foto", w / 2, h / 2 + 4);
    return;
  }

  const cores = [
    { canal: "r", cor: "rgb(239, 68, 68)", transl: "rgba(239, 68, 68, 0.15)" },
    { canal: "g", cor: "rgb(34, 197, 94)", transl: "rgba(34, 197, 94, 0.15)" },
    { canal: "b", cor: "rgb(59, 130, 246)", transl: "rgba(59, 130, 246, 0.15)" },
  ] as const;

  // 1. Curvas tracejadas: Original
  if (histOriginal) {
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1.2;
    cores.forEach(({ canal, cor }) => {
      const dados = histOriginal![canal];
      desenharLinhaHistograma(ctx, dados, w, h, cor, 0.45);
    });
    ctx.setLineDash([]);
  }

  // 2. Curvas sólidas: Restaurada
  if (histRestaurada) {
    ctx.lineWidth = 2;
    cores.forEach(({ canal, cor }) => {
      const dados = histRestaurada![canal];
      desenharLinhaHistograma(ctx, dados, w, h, cor, 0.95);
    });
  }
}

function desenharLinhaHistograma(
  ctx: CanvasRenderingContext2D,
  dados: number[],
  w: number,
  h: number,
  cor: string,
  alpha: number
) {
  if (!dados || dados.length === 0) return;
  const n = dados.length;
  const passoX = w / (n - 1);
  const margemY = 8;
  const hUtil = h - margemY * 2;

  ctx.strokeStyle = cor;
  ctx.globalAlpha = alpha;
  ctx.beginPath();

  dados.forEach((val, i) => {
    const x = i * passoX;
    const y = h - margemY - val * hUtil;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });

  ctx.stroke();
  ctx.globalAlpha = 1.0;
}

// ----------------------------------------------------------------------------
// Eventos Gerais (Atalhos, Dropzone, Reset)
// ----------------------------------------------------------------------------
function configurarEventosGerais() {
  btnAbrir.addEventListener("click", escolherEAbrirFoto);
  dropzone.addEventListener("click", escolherEAbrirFoto);
  btnSalvar.addEventListener("click", salvarCopiaRestaurada);

  btnReset.addEventListener("click", () => {
    opcoesAtuais = JSON.parse(JSON.stringify(OPCOES_INICIAIS));
    sincronizarControlesComEstado();
    mostrarToast("Configurações redefinidas para o padrão.", "ok");
    dispararProcessamento(false);
  });

  // Atalhos de teclado
  window.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "o") {
      e.preventDefault();
      escolherEAbrirFoto();
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
      e.preventDefault();
      if (!btnSalvar.disabled) salvarCopiaRestaurada();
    }
  });

  // Arrastar sobre o visualizador (indicação visual)
  const viewer = document.querySelector("#viewer")!;
  window.addEventListener("dragover", (e) => {
    e.preventDefault();
    viewer.classList.add("dragging");
  });
  window.addEventListener("dragleave", () => {
    viewer.classList.remove("dragging");
  });
  window.addEventListener("drop", (e) => {
    e.preventDefault();
    viewer.classList.remove("dragging");
  });

  window.addEventListener("resize", () => {
    atualizarIndicadorAba();
  });
}

function mostrarLoader(visivel: boolean, texto = "", suave = false) {
  if (!loader) return;
  loader.hidden = !visivel;
  loader.classList.toggle("soft", suave);
  if (loaderText) loaderText.textContent = texto;
}

function mostrarToast(mensagem: string, tipo: "ok" | "err" = "ok") {
  if (!toastEl) return;
  window.clearTimeout(toastTimeout);

  toastEl.className = `toast show ${tipo}`;
  toastEl.innerHTML = `<span class="t-icon"></span><span>${mensagem}</span>`;

  toastTimeout = window.setTimeout(() => {
    toastEl.classList.remove("show");
  }, 4500);
}
