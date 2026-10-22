//! Ponte Rust ↔ Python (PyO3).
//!
//! O módulo `restaurar.py` é embutido no binário em tempo de compilação e
//! carregado uma única vez; o estado do motor (foto aberta, opções) vive no
//! interpretador Python entre as chamadas.

use pyo3::ffi::c_str;
use pyo3::prelude::*;
use pyo3::sync::GILOnceCell;
use pyo3::types::PyModule;
use serde_json::Value;

static MODULO: GILOnceCell<Py<PyModule>> = GILOnceCell::new();

/// Diretório do ambiente virtual com OpenCV/NumPy.
/// Ordem: $RESTAURAFOTO_VENV → $VIRTUAL_ENV → <projeto>/.venv
fn diretorio_venv() -> String {
    std::env::var("RESTAURAFOTO_VENV")
        .or_else(|_| std::env::var("VIRTUAL_ENV"))
        .unwrap_or_else(|_| concat!(env!("CARGO_MANIFEST_DIR"), "/../.venv").to_string())
}

fn modulo(py: Python<'_>) -> PyResult<&Bound<'_, PyModule>> {
    MODULO
        .get_or_try_init(py, || {
            // Torna visíveis os pacotes instalados no venv (cv2, numpy).
            let site = PyModule::import(py, "site")?;
            let glob = PyModule::import(py, "glob")?;
            for padrao in [
                format!("{}/lib/python*/site-packages", diretorio_venv()),
                format!("{}/Lib/site-packages", diretorio_venv()), // Windows
            ] {
                for dir in glob.call_method1("glob", (padrao,))?.try_iter()? {
                    site.call_method1("addsitedir", (dir?,))?;
                }
            }
            let m = PyModule::from_code(
                py,
                c_str!(include_str!("../restaurar.py")),
                c_str!("restaurar.py"),
                c_str!("restaurar"),
            )?;
            Ok(m.unbind())
        })
        .map(|m| m.bind(py))
}

/// Chama `restaurar.<funcao>(arg)`; a função Python devolve uma string JSON.
fn chamar(funcao: &str, arg: String) -> Result<Value, String> {
    Python::with_gil(|py| -> PyResult<String> {
        modulo(py)?.getattr(funcao)?.call1((arg,))?.extract()
    })
    .map_err(|e| Python::with_gil(|py| formatar_erro(py, e)))
    .and_then(|s| serde_json::from_str(&s).map_err(|e| format!("Resposta inválida do motor: {e}")))
}

fn formatar_erro(py: Python<'_>, e: PyErr) -> String {
    let tipo = e
        .get_type(py)
        .name()
        .map(|n| n.to_string())
        .unwrap_or_else(|_| "Erro".into());
    let msg = e.value(py).to_string();
    if tipo == "ModuleNotFoundError" {
        format!(
            "{msg}. Instale as dependências: python3 -m venv .venv && .venv/bin/pip install -r requirements.txt (venv procurado em {})",
            diretorio_venv()
        )
    } else {
        format!("{tipo}: {msg}")
    }
}

/// Executa a chamada fora da thread da UI (o processamento pode levar segundos).
async fn em_segundo_plano(funcao: &'static str, arg: String) -> Result<Value, String> {
    tauri::async_runtime::spawn_blocking(move || chamar(funcao, arg))
        .await
        .map_err(|e| format!("Falha na tarefa: {e}"))?
}

fn validar_extensao(caminho: &str, permitidas: &[&str]) -> Result<(), String> {
    let ext = std::path::Path::new(caminho)
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| e.to_lowercase())
        .unwrap_or_default();
    if permitidas.contains(&ext.as_str()) {
        Ok(())
    } else {
        Err(format!("Extensão não suportada: .{ext} (use {})", permitidas.join(", ")))
    }
}

const ENTRADA: &[&str] = &["jpg", "jpeg", "png", "tif", "tiff", "bmp", "webp"];
const SAIDA: &[&str] = &["jpg", "jpeg", "png", "tif", "tiff", "bmp", "webp"];

#[tauri::command]
pub async fn abrir_foto(caminho: String) -> Result<Value, String> {
    validar_extensao(&caminho, ENTRADA)?;
    if !std::path::Path::new(&caminho).is_file() {
        return Err(format!("Arquivo não encontrado: {caminho}"));
    }
    em_segundo_plano("carregar", caminho).await
}

#[tauri::command]
pub async fn processar(opcoes: Value) -> Result<Value, String> {
    em_segundo_plano("processar", opcoes.to_string()).await
}

#[tauri::command]
pub async fn salvar_foto(caminho: String) -> Result<Value, String> {
    validar_extensao(&caminho, SAIDA)?;
    em_segundo_plano("salvar", caminho).await
}
