use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::fs;

pub const PROTECTED_PATH: &str = r"D:\claude-memory\node-processor-protected.json";

#[derive(Debug, Clone, Default, Deserialize, Serialize)]
pub struct ProtectedList {
    #[serde(default)]
    pub folders: HashSet<String>,
    #[serde(default)]
    pub pids: HashSet<u32>,
}

pub fn load() -> ProtectedList {
    let raw = match fs::read_to_string(PROTECTED_PATH) {
        Ok(s) if !s.trim().is_empty() => s,
        _ => return ProtectedList::default(),
    };
    serde_json::from_str(&raw).unwrap_or_default()
}

fn save(list: &ProtectedList) -> Result<(), String> {
    let json = serde_json::to_string_pretty(list).map_err(|e| e.to_string())?;
    fs::write(PROTECTED_PATH, json).map_err(|e| e.to_string())
}

fn normalize_folder(folder: &str) -> String {
    folder.trim_end_matches(['\\', '/']).to_lowercase()
}

pub fn is_protected(list: &ProtectedList, folder: Option<&str>, pid: Option<u32>) -> bool {
    if let Some(pid) = pid {
        if list.pids.contains(&pid) {
            return true;
        }
    }
    if let Some(folder) = folder {
        let norm = normalize_folder(folder);
        return list.folders.iter().any(|f| normalize_folder(f) == norm);
    }
    false
}

/// Alterna (liga/desliga) a protecao de uma pasta e/ou PID. Retorna a lista
/// atualizada apos salvar.
pub fn toggle(folder: Option<String>, pid: Option<u32>) -> Result<ProtectedList, String> {
    let mut list = load();

    if let Some(folder) = folder {
        let norm = normalize_folder(&folder);
        let existing = list.folders.iter().find(|f| normalize_folder(f) == norm).cloned();
        match existing {
            Some(f) => {
                list.folders.remove(&f);
            }
            None => {
                list.folders.insert(folder);
            }
        }
    }

    if let Some(pid) = pid {
        if !list.pids.remove(&pid) {
            list.pids.insert(pid);
        }
    }

    save(&list)?;
    Ok(list)
}
