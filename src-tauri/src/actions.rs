use serde::{Deserialize, Serialize};
use std::fs;
use std::os::windows::process::CommandExt;
use std::process::Command;
use std::time::Duration;
use sysinfo::{Pid, ProcessRefreshKind, ProcessesToUpdate, System};

use crate::docker;
use crate::history;
use crate::procutil::run_with_timeout;
use crate::processes::Kind;
use crate::protected;
use crate::registry;

const CREATE_NO_WINDOW: u32 = 0x08000000;
const DETACHED_PROCESS: u32 = 0x00000008;
const KILL_TIMEOUT: Duration = Duration::from_secs(10);

#[derive(Debug, Deserialize)]
pub struct KillTarget {
    pub kind: Kind,
    pub pid: Option<u32>,
    pub container_id: Option<String>,
    pub registry_key: Option<String>,
    pub folder: Option<String>,
    pub name: String,
    pub memory_bytes: Option<u64>,
}

#[derive(Debug, Serialize)]
pub struct KillResult {
    pub name: String,
    pub ok: bool,
    pub error: Option<String>,
}

/// PID do proprio app + todos os seus ancestrais (shell/terminal que o
/// lancou). Matar qualquer um desses trava ou derruba o proprio
/// node-processor -- foi assim que um "matar todos (filtrados)" no
/// filtro "Agente IA" travou a janela (um claude.exe da arvore acima
/// do dev server foi incluido no alvo).
fn protected_pids() -> Vec<u32> {
    let mut sys = System::new();
    sys.refresh_processes_specifics(ProcessesToUpdate::All, true, ProcessRefreshKind::everything());

    let mut protected = Vec::new();
    let mut current = Some(Pid::from_u32(std::process::id()));

    while let Some(pid) = current {
        protected.push(pid.as_u32());
        current = sys.process(pid).and_then(|p| p.parent());
        if protected.len() > 64 {
            break; // guarda contra ciclo improvavel
        }
    }

    protected
}

pub async fn kill_targets(targets: Vec<KillTarget>) -> Vec<KillResult> {
    let protected = protected_pids();
    let protected_list = protected::load();

    let mut handles = Vec::with_capacity(targets.len());
    for target in targets {
        let protected = protected.clone();
        let protected_list = protected_list.clone();
        handles.push(tauri::async_runtime::spawn_blocking(move || {
            kill_one(target, &protected, &protected_list)
        }));
    }

    let mut results = Vec::with_capacity(handles.len());
    for handle in handles {
        match handle.await {
            Ok(result) => results.push(result),
            Err(e) => results.push(KillResult {
                name: "desconhecido".to_string(),
                ok: false,
                error: Some(format!("tarefa de kill falhou: {e}")),
            }),
        }
    }
    results
}

fn kill_one(target: KillTarget, protected: &[u32], protected_list: &protected::ProtectedList) -> KillResult {
    if let Some(pid) = target.pid {
        if protected.contains(&pid) {
            return KillResult {
                name: target.name,
                ok: false,
                error: Some(
                    "recusado: esse PID e o proprio node-processor (ou um processo pai dele)"
                        .to_string(),
                ),
            };
        }
    }

    if protected::is_protected(protected_list, target.folder.as_deref(), target.pid) {
        return KillResult {
            name: target.name,
            ok: false,
            error: Some("recusado: processo ou pasta marcados como protegidos".to_string()),
        };
    }

    let result = match target.kind {
        Kind::Docker => target
            .container_id
            .as_deref()
            .ok_or_else(|| "container_id ausente".to_string())
            .and_then(docker::stop_container),
        Kind::Node | Kind::Python | Kind::AiAgent => target
            .pid
            .ok_or_else(|| "pid ausente".to_string())
            .and_then(kill_process_tree),
    };

    if result.is_ok() {
        if let Some(key) = &target.registry_key {
            let _ = registry::remove_entry(key);
        }
        history::append(history::KillHistoryEntry {
            command: target.name.clone(),
            folder: target.folder.clone(),
            pid: target.pid,
            memory_freed_bytes: target.memory_bytes,
        });
    }

    match result {
        Ok(()) => KillResult {
            name: target.name,
            ok: true,
            error: None,
        },
        Err(e) => KillResult {
            name: target.name,
            ok: false,
            error: Some(e),
        },
    }
}

fn kill_process_tree(pid: u32) -> Result<(), String> {
    let output = run_with_timeout(
        Command::new("taskkill")
            .args(["/PID", &pid.to_string(), "/T", "/F"])
            .creation_flags(CREATE_NO_WINDOW),
        KILL_TIMEOUT,
    )?;

    if output.status.success() {
        Ok(())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

pub fn open_folder(path: &str) -> Result<(), String> {
    Command::new("explorer.exe")
        .arg(path)
        .creation_flags(CREATE_NO_WINDOW)
        .spawn()
        .map(|_| ())
        .map_err(|e| e.to_string())
}

pub fn open_terminal(path: &str) -> Result<(), String> {
    let wt = Command::new("wt.exe")
        .args(["-d", path])
        .creation_flags(DETACHED_PROCESS)
        .spawn();

    if wt.is_ok() {
        return Ok(());
    }

    Command::new("cmd.exe")
        .args(["/K", "cd", "/d", path])
        .creation_flags(DETACHED_PROCESS)
        .spawn()
        .map(|_| ())
        .map_err(|e| e.to_string())
}

const TAIL_MAX_BYTES: u64 = 512 * 1024;

/// Le apenas os ultimos `TAIL_MAX_BYTES` do arquivo (via seek), nunca o
/// arquivo inteiro -- logs de sessoes de horas (ex: agentes de IA) podem
/// chegar a gigabytes, e `read_to_string` no arquivo inteiro trava a
/// thread do command por muito tempo.
pub fn tail_log(path: &str, lines: usize) -> Result<String, String> {
    use std::io::{Read, Seek, SeekFrom};

    let mut file = fs::File::open(path).map_err(|e| e.to_string())?;
    let file_len = file.metadata().map_err(|e| e.to_string())?.len();
    let start_offset = file_len.saturating_sub(TAIL_MAX_BYTES);

    if start_offset > 0 {
        file.seek(SeekFrom::Start(start_offset))
            .map_err(|e| e.to_string())?;
    }

    let mut buf = Vec::with_capacity((file_len - start_offset) as usize);
    file.read_to_end(&mut buf).map_err(|e| e.to_string())?;
    let content = String::from_utf8_lossy(&buf);

    let all_lines: Vec<&str> = content.lines().collect();
    let start = all_lines.len().saturating_sub(lines);
    Ok(all_lines[start..].join("\n"))
}
