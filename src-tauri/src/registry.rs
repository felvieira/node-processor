use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;

pub const REGISTRY_PATH: &str = r"D:\claude-memory\dev-registry.json";

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct RegistryEntry {
    pub pid: u32,
    #[serde(default)]
    pub port: Option<u16>,
    pub cmd: String,
    #[serde(default)]
    pub log: Option<String>,
    #[serde(rename = "startedAt")]
    pub started_at: String,
}

pub type Registry = HashMap<String, RegistryEntry>;

pub fn load_registry() -> Registry {
    let raw = match fs::read_to_string(REGISTRY_PATH) {
        Ok(s) if !s.trim().is_empty() => s,
        _ => return Registry::new(),
    };
    // PowerShell (dev-registry.ps1) escreve o JSON com BOM UTF-8; serde_json
    // nao ignora o BOM sozinho e falha silenciosamente o parse inteiro se
    // ele nao for removido primeiro.
    let raw = raw.strip_prefix('\u{feff}').unwrap_or(&raw);
    match serde_json::from_str(raw) {
        Ok(registry) => registry,
        Err(e) => {
            eprintln!("falha ao parsear dev-registry.json: {e}");
            Registry::new()
        }
    }
}

pub fn save_registry(registry: &Registry) -> std::io::Result<()> {
    let json = serde_json::to_string_pretty(registry)?;
    fs::write(REGISTRY_PATH, json)
}

pub fn remove_entry(key: &str) -> std::io::Result<()> {
    let mut registry = load_registry();
    registry.remove(key);
    save_registry(&registry)
}
