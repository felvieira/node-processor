use serde::{Deserialize, Serialize};
use std::fs;

pub const HISTORY_PATH: &str = r"D:\claude-memory\node-processor-kill-history.json";
const MAX_ENTRIES: usize = 500;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KillHistoryEntry {
    pub command: String,
    pub folder: Option<String>,
    pub pid: Option<u32>,
    pub memory_freed_bytes: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StoredEntry {
    #[serde(flatten)]
    pub entry: KillHistoryEntry,
    pub timestamp_epoch: u64,
}

fn load() -> Vec<StoredEntry> {
    let raw = match fs::read_to_string(HISTORY_PATH) {
        Ok(s) if !s.trim().is_empty() => s,
        _ => return Vec::new(),
    };
    serde_json::from_str(&raw).unwrap_or_default()
}

fn save(list: &[StoredEntry]) {
    if let Ok(json) = serde_json::to_string_pretty(list) {
        let _ = fs::write(HISTORY_PATH, json);
    }
}

/// Registra um kill bem-sucedido. Falhas de I/O aqui sao silenciosas de
/// proposito -- historico e conveniencia, nunca deve impedir ou atrasar
/// o kill em si.
pub fn append(entry: KillHistoryEntry) {
    let timestamp_epoch = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);

    let mut list = load();
    list.push(StoredEntry { entry, timestamp_epoch });
    if list.len() > MAX_ENTRIES {
        let excess = list.len() - MAX_ENTRIES;
        list.drain(0..excess);
    }
    save(&list);
}

pub fn get_all() -> Vec<StoredEntry> {
    let mut list = load();
    list.reverse();
    list
}
