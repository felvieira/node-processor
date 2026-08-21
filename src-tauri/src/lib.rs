mod actions;
mod ai;
mod docker;
mod history;
mod ports;
mod procutil;
mod processes;
mod protected;
mod registry;

use actions::{KillResult, KillTarget};
use ai::{AiVerdictItem, ProcessSnapshot};
use history::StoredEntry;
use processes::ProcessInfo;
use protected::ProtectedList;

#[tauri::command]
async fn list_processes() -> Result<Vec<ProcessInfo>, String> {
    tauri::async_runtime::spawn_blocking(processes::list_all)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn kill_processes(targets: Vec<KillTarget>) -> Vec<KillResult> {
    actions::kill_targets(targets).await
}

#[tauri::command]
fn open_folder(path: String) -> Result<(), String> {
    actions::open_folder(&path)
}

#[tauri::command]
fn open_terminal(path: String) -> Result<(), String> {
    actions::open_terminal(&path)
}

#[tauri::command]
async fn tail_log(path: String, lines: usize) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || actions::tail_log(&path, lines))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn run_ai_analysis(
    provider: String,
    api_key: String,
    model: String,
    snapshot: Vec<ProcessSnapshot>,
) -> Result<Vec<AiVerdictItem>, String> {
    ai::run_analysis(provider, api_key, model, snapshot).await
}

#[tauri::command]
fn get_protected() -> ProtectedList {
    protected::load()
}

#[tauri::command]
fn toggle_protected(folder: Option<String>, pid: Option<u32>) -> Result<ProtectedList, String> {
    protected::toggle(folder, pid)
}

#[tauri::command]
fn get_kill_history() -> Vec<StoredEntry> {
    history::get_all()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            list_processes,
            kill_processes,
            open_folder,
            open_terminal,
            tail_log,
            run_ai_analysis,
            get_protected,
            toggle_protected,
            get_kill_history
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
