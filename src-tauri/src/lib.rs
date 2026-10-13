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
use tauri::{Manager, menu::{Menu, MenuItem}, tray::TrayIconBuilder};

fn show_main(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}

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
        .plugin(tauri_plugin_single_instance::init(|app, _, _| show_main(app)))
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let open = MenuItem::with_id(app, "open", "Abrir node-processor", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "Sair", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&open, &quit])?;
            TrayIconBuilder::new()
                .icon(app.default_window_icon().expect("bundled app icon").clone())
                .tooltip("node-processor · processos de desenvolvimento")
                .menu(&menu)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "open" => show_main(app),
                    "quit" => app.exit(0),
                    _ => {}
                })
                .build(app)?;
            if !std::env::args().any(|arg| arg == "--background") {
                show_main(app.handle());
            }
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                if window.hide().is_ok() {
                    api.prevent_close();
                }
            }
        })
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
