# src-tauri/restaurar.py
"""
Motor de restauração do RestauraFoto (OpenCV).

Este módulo é embutido no binário Rust via PyO3 (ver src-tauri/src/motor.rs),
mas também pode ser usado sozinho pela linha de comando:

    python src-tauri/restaurar.py entrada.jpg saida.png

Pipeline (cada etapa pode ser ligada/desligada pela interface):
    1. Riscos      -> top-hat/black-hat + binarização + dilatação = máscara -> cv2.inpaint
    2. Granulação  -> filtro da mediana + filtro gaussiano
    3. Amarelado   -> splitting de canais (gray-world) + ajuste de saturação em HSV
    4. Desbotado   -> equalização adaptativa (CLAHE) no canal L + brilho/contraste
"""
import base64
import json
import os
import time

import cv2
import numpy as np

# Lado máximo (px) da versão reduzida usada para pré-visualização interativa.
LADO_PREVIEW = 1400

OPCOES_PADRAO = {
    "riscos": {"ativo": True, "limiar": 40, "kernel": 9, "dilatacao": 1, "raio": 3, "tipo": "ambos"},
    "granulacao": {"ativo": True, "mediana": 3, "gaussiano": 3},
    "amarelado": {"ativo": True, "intensidade": 80, "saturacao": 90},
    "desbotado": {"ativo": True, "clahe": 2.0, "brilho": 0, "contraste": 1.05},
}

# Estado do motor (mantido vivo entre chamadas, pois o módulo é carregado uma única vez).
_estado = {
    "caminho": None,
    "original": None,  # imagem em resolução total (BGR, uint8)
    "preview": None,   # versão reduzida para interação
    "escala": 1.0,     # fator original/preview
    "opcoes": None,
}


# ----------------------------------------------------------------------------
# Utilitários de E/S (np.fromfile/tofile suportam caminhos com acentos)
# ----------------------------------------------------------------------------
def _ler_imagem(caminho):
    if not os.path.isfile(caminho):
        raise FileNotFoundError(f"Arquivo não encontrado: {caminho}")
    dados = np.fromfile(caminho, dtype=np.uint8)
    img = cv2.imdecode(dados, cv2.IMREAD_UNCHANGED)
    if img is None:
        raise ValueError(f"Formato de imagem não suportado: {caminho}")
    # Normaliza para BGR 8 bits (TIFFs de scanner costumam vir em 16 bits ou tons de cinza)
    if img.dtype != np.uint8:
        img = cv2.normalize(img, None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)
    if img.ndim == 2:
        img = cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)
    elif img.shape[2] == 4:
        img = cv2.cvtColor(img, cv2.COLOR_BGRA2BGR)
    return img


def _gravar_imagem(caminho, img):
    ext = os.path.splitext(caminho)[1].lower() or ".png"
    params = [cv2.IMWRITE_JPEG_QUALITY, 95] if ext in (".jpg", ".jpeg") else []
    ok, buf = cv2.imencode(ext, img, params)
    if not ok:
        raise ValueError(f"Não foi possível codificar a imagem como {ext}")
    buf.tofile(caminho)


def _reduzir(img, lado_max):
    h, w = img.shape[:2]
    fator = lado_max / max(h, w)
    if fator >= 1:
        return img, 1.0
    nova = cv2.resize(img, (int(w * fator), int(h * fator)), interpolation=cv2.INTER_AREA)
    return nova, 1 / fator


def _b64(img, ext=".jpg"):
    params = [cv2.IMWRITE_JPEG_QUALITY, 88] if ext == ".jpg" else []
    _, buf = cv2.imencode(ext, img, params)
    mime = "image/jpeg" if ext == ".jpg" else "image/png"
    return f"data:{mime};base64," + base64.b64encode(buf).decode("ascii")


def _impar(valor, escala=1.0, minimo=1):
    """Ajusta tamanhos de kernel à resolução e garante que sejam ímpares."""
    v = max(minimo, int(round(valor * escala)))
    return v if v % 2 == 1 else v + 1


def _histograma(img):
    """Histograma por canal (R, G, B), normalizado em 0..1, com 64 bins."""
    canais = {}
    for nome, idx in (("r", 2), ("g", 1), ("b", 0)):
        h = cv2.calcHist([img], [idx], None, [64], [0, 256]).flatten()
        canais[nome] = (h / (h.max() or 1)).round(4).tolist()
    return canais


def _mesclar_opcoes(opcoes):
    final = json.loads(json.dumps(OPCOES_PADRAO))
    for etapa, valores in (opcoes or {}).items():
        if etapa in final and isinstance(valores, dict):
            final[etapa].update(valores)
    return final


# ----------------------------------------------------------------------------
# Etapas de restauração
# ----------------------------------------------------------------------------
def mascara_riscos(img, limiar=40, kernel=9, dilatacao=1, tipo="ambos", escala=1.0):
    """Binarização + morfologia para localizar riscos finos (claros e/ou escuros)."""
    cinza = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    k = cv2.getStructuringElement(cv2.MORPH_RECT, (_impar(kernel, escala, 3),) * 2)
    destaque = np.zeros_like(cinza)
    if tipo in ("claros", "ambos"):
        destaque = cv2.max(destaque, cv2.morphologyEx(cinza, cv2.MORPH_TOPHAT, k))
    if tipo in ("escuros", "ambos"):
        destaque = cv2.max(destaque, cv2.morphologyEx(cinza, cv2.MORPH_BLACKHAT, k))
    _, mascara = cv2.threshold(destaque, limiar, 255, cv2.THRESH_BINARY)
    # Abertura remove pontos isolados; dilatação engrossa a máscara para cobrir as bordas do risco
    mascara = cv2.morphologyEx(mascara, cv2.MORPH_OPEN, np.ones((2, 2), np.uint8))
    if dilatacao > 0:
        mascara = cv2.dilate(mascara, np.ones((3, 3), np.uint8), iterations=max(1, int(round(dilatacao * escala))))
    return mascara


def remover_riscos(img, mascara, raio=3, escala=1.0):
    return cv2.inpaint(img, mascara, max(1, int(round(raio * escala))), cv2.INPAINT_TELEA)


def reduzir_granulacao(img, mediana=3, gaussiano=3, escala=1.0):
    if mediana > 1:
        img = cv2.medianBlur(img, _impar(mediana, escala, 3))
    if gaussiano > 1:
        k = _impar(gaussiano, escala, 3)
        img = cv2.GaussianBlur(img, (k, k), 0)
    return img


def corrigir_amarelado(img, intensidade=80, saturacao=90):
    # Splitting de canais: equilibra as médias de B, G e R (hipótese "gray-world")
    b, g, r = cv2.split(img.astype(np.float32))
    media = (b.mean() + g.mean() + r.mean()) / 3
    balanceada = cv2.merge([c * (media / (c.mean() or 1)) for c in (b, g, r)])
    balanceada = np.clip(balanceada, 0, 255).astype(np.uint8)
    t = intensidade / 100
    img = cv2.addWeighted(balanceada, t, img, 1 - t, 0)
    # HSV: ajusta a saturação residual (valores < 100 reduzem o tom sépia)
    if saturacao != 100:
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV).astype(np.float32)
        hsv[..., 1] = np.clip(hsv[..., 1] * (saturacao / 100), 0, 255)
        img = cv2.cvtColor(hsv.astype(np.uint8), cv2.COLOR_HSV2BGR)
    return img


def recuperar_desbotado(img, clahe=2.0, brilho=0, contraste=1.0):
    if clahe > 0:
        lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
        l, a, b = cv2.split(lab)
        l = cv2.createCLAHE(clipLimit=float(clahe), tileGridSize=(8, 8)).apply(l)
        img = cv2.cvtColor(cv2.merge([l, a, b]), cv2.COLOR_LAB2BGR)
    if brilho != 0 or contraste != 1.0:
        img = cv2.convertScaleAbs(img, alpha=float(contraste), beta=float(brilho))
    return img


def pipeline(img, opcoes, escala=1.0):
    """Aplica as etapas ativas sobre uma CÓPIA da imagem. Retorna (resultado, máscara)."""
    o = _mesclar_opcoes(opcoes)
    saida = img.copy()
    mascara = None
    if o["riscos"]["ativo"]:
        r = o["riscos"]
        mascara = mascara_riscos(saida, r["limiar"], r["kernel"], r["dilatacao"], r["tipo"], escala)
        saida = remover_riscos(saida, mascara, r["raio"], escala)
    if o["granulacao"]["ativo"]:
        g = o["granulacao"]
        saida = reduzir_granulacao(saida, g["mediana"], g["gaussiano"], escala)
    if o["amarelado"]["ativo"]:
        a = o["amarelado"]
        saida = corrigir_amarelado(saida, a["intensidade"], a["saturacao"])
    if o["desbotado"]["ativo"]:
        d = o["desbotado"]
        saida = recuperar_desbotado(saida, d["clahe"], d["brilho"], d["contraste"])
    return saida, mascara


# ----------------------------------------------------------------------------
# API chamada pelo Rust (entradas/saídas em JSON)
# ----------------------------------------------------------------------------
def carregar(caminho):
    img = _ler_imagem(caminho)
    preview, escala = _reduzir(img, LADO_PREVIEW)
    _estado.update(caminho=caminho, original=img, preview=preview, escala=escala, opcoes=None)
    h, w = img.shape[:2]
    return json.dumps({
        "nome": os.path.basename(caminho),
        "largura": w,
        "altura": h,
        "original": _b64(preview),
        "histograma": _histograma(preview),
        "opcoes": OPCOES_PADRAO,
    })


def processar(opcoes_json):
    if _estado["preview"] is None:
        raise RuntimeError("Nenhuma foto carregada.")
    opcoes = json.loads(opcoes_json) if opcoes_json else {}
    inicio = time.perf_counter()
    base = _estado["preview"]
    resultado, mascara = pipeline(base, opcoes)
    _estado["opcoes"] = opcoes
    # Subtração: evidencia o que foi alterado (amplificada para ficar visível)
    diferenca = cv2.convertScaleAbs(cv2.absdiff(base, resultado), alpha=3)
    return json.dumps({
        "restaurada": _b64(resultado),
        "diferenca": _b64(diferenca),
        "mascara": _b64(mascara, ".png") if mascara is not None else None,
        "pixels_mascara": int(cv2.countNonZero(mascara)) if mascara is not None else 0,
        "histograma": _histograma(resultado),
        "tempo_ms": round((time.perf_counter() - inicio) * 1000),
    })


def salvar(caminho_saida):
    """Reaplica o pipeline em resolução total e grava a cópia restaurada."""
    if _estado["original"] is None:
        raise RuntimeError("Nenhuma foto carregada.")
    if os.path.abspath(caminho_saida) == os.path.abspath(_estado["caminho"]):
        raise ValueError("Escolha outro arquivo: a foto original não deve ser sobrescrita.")
    inicio = time.perf_counter()
    resultado, _ = pipeline(_estado["original"], _estado["opcoes"], _estado["escala"])
    _gravar_imagem(caminho_saida, resultado)
    h, w = resultado.shape[:2]
    return json.dumps({
        "caminho": caminho_saida,
        "largura": w,
        "altura": h,
        "tempo_ms": round((time.perf_counter() - inicio) * 1000),
    })


def restaurar_foto(caminho_entrada, caminho_saida):
    """Atalho: restaura com as opções padrão e grava a cópia (sem estado)."""
    try:
        img = _ler_imagem(caminho_entrada)
        resultado, _ = pipeline(img, OPCOES_PADRAO)
        _gravar_imagem(caminho_saida, resultado)
        return "Sucesso"
    except Exception as e:
        return f"Erro no processamento Python: {e}"


if __name__ == "__main__":
    import sys

    if len(sys.argv) != 3:
        print("Uso: python restaurar.py <entrada> <saida>")
        sys.exit(1)
    print(restaurar_foto(sys.argv[1], sys.argv[2]))
