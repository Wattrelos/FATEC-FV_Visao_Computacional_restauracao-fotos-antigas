"""
Suíte de testes de integridade e regressão para o motor de visão computacional (restaurar.py).
Parte do ecossistema de auto-cura e malha fechada do RestauraFoto.
"""

import json
import os
import shutil
import sys
import tempfile
import unittest
from pathlib import Path

import numpy as np

# Injeta src-tauri no sys.path
ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR / "src-tauri"))

import cv2
import restaurar


class TestMotorVisaoComputacional(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.mkdtemp()
        # Imagem sintética simulando foto antiga amarelada com riscos
        self.img_teste = np.full((300, 300, 3), (120, 180, 210), dtype=np.uint8)
        # Adiciona risco escuro e risco claro
        cv2.line(self.img_teste, (20, 20), (280, 280), (10, 10, 10), 2)
        cv2.line(self.img_teste, (20, 280), (280, 20), (250, 250, 250), 2)

        self.caminho_teste = os.path.join(self.temp_dir, "foto_teste.png")
        cv2.imwrite(self.caminho_teste, self.img_teste)

    def tearDown(self):
        shutil.rmtree(self.temp_dir, ignore_errors=True)

    def test_01_mascara_riscos_detecta_linhas(self):
        """Testa geração de máscara morfológica top-hat e black-hat."""
        mascara = restaurar.mascara_riscos(self.img_teste, limiar=30, kernel=7)
        self.assertIsNotNone(mascara)
        self.assertEqual(mascara.shape, (300, 300))
        pixels_detectados = cv2.countNonZero(mascara)
        self.assertGreater(pixels_detectados, 0, "Deveria ter detectado pixels de riscos")

    def test_02_remover_riscos_inpaint(self):
        """Testa inpainting sobre a máscara de riscos."""
        mascara = restaurar.mascara_riscos(self.img_teste, limiar=30, kernel=7)
        restaurada = restaurar.remover_riscos(self.img_teste, mascara, raio=3)
        self.assertEqual(restaurada.shape, self.img_teste.shape)
        self.assertEqual(restaurada.dtype, np.uint8)

    def test_03_reduzir_granulacao_filtros(self):
        """Testa aplicação dos filtros de mediana e gaussiano."""
        suavizada = restaurar.reduzir_granulacao(self.img_teste, mediana=3, gaussiano=3)
        self.assertEqual(suavizada.shape, self.img_teste.shape)
        self.assertEqual(suavizada.dtype, np.uint8)

    def test_04_corrigir_amarelado(self):
        """Testa balanço de branco Gray-World e dessaturação HSV."""
        corrigida = restaurar.corrigir_amarelado(self.img_teste, intensidade=80, saturacao=90)
        self.assertEqual(corrigida.shape, self.img_teste.shape)

    def test_05_recuperar_desbotado_clahe(self):
        """Testa equalização adaptativa no canal L do espaço LAB."""
        recuperada = restaurar.recuperar_desbotado(self.img_teste, clahe=2.0, brilho=5, contraste=1.1)
        self.assertEqual(recuperada.shape, self.img_teste.shape)

    def test_06_ciclo_completo_carregar_processar_salvar(self):
        """Testa a interface de comunicação JSON consumida pela ponte PyO3/Rust."""
        # 1. Carregar
        res_carregar_json = restaurar.carregar(self.caminho_teste)
        res_carregar = json.loads(res_carregar_json)
        self.assertEqual(res_carregar["largura"], 300)
        self.assertEqual(res_carregar["altura"], 300)
        self.assertIn("histograma", res_carregar)
        self.assertEqual(len(res_carregar["histograma"]["r"]), 64)

        # 2. Processar
        opcoes = json.dumps(restaurar.OPCOES_PADRAO)
        res_proc_json = restaurar.processar(opcoes)
        res_proc = json.loads(res_proc_json)
        self.assertIn("restaurada", res_proc)
        self.assertIn("diferenca", res_proc)
        self.assertIn("histograma", res_proc)

        # 3. Salvar
        caminho_saida = os.path.join(self.temp_dir, "foto_restaurada.png")
        res_salvar_json = restaurar.salvar(caminho_saida)
        res_salvar = json.loads(res_salvar_json)
        self.assertTrue(os.path.isfile(caminho_saida))
        self.assertEqual(res_salvar["largura"], 300)

    def test_07_trava_arquitetural_nao_sobrescrever_original(self):
        """Garante que tentar salvar por cima da foto original levanta ValueError."""
        restaurar.carregar(self.caminho_teste)
        with self.assertRaises(ValueError):
            restaurar.salvar(self.caminho_teste)


if __name__ == "__main__":
    unittest.main()
