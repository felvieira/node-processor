use serde::{Deserialize, Serialize};
use std::thread;
use sysinfo::{ProcessRefreshKind, ProcessesToUpdate, System, MINIMUM_CPU_UPDATE_INTERVAL};

use crate::docker::{self, DockerContainer};
use crate::ports;
use crate::registry::{self, Registry};

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum Kind {
    Node,
    Python,
    Docker,
    #[serde(rename = "ai_agent")]
    AiAgent,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum Origin {
    Registered,
    Untracked,
}

#[derive(Debug, Clone, Serialize)]
pub struct ProcessInfo {
    pub id: String,
    pub kind: Kind,
    pub origin: Origin,
    pub pid: Option<u32>,
    pub container_id: Option<String>,
    pub name: String,
    pub folder: Option<String>,
    pub command: String,
    pub ports: Vec<u16>,
    /// Unix epoch (segundos) de quando o processo/container comecou. `None`
    /// quando o SO nao expoe essa info (ex: alguns containers Docker).
    pub started_at_epoch: Option<u64>,
    pub started_label: Option<String>,
    pub log_path: Option<String>,
    pub registry_key: Option<String>,
    pub cpu_percent: Option<f32>,
    pub memory_bytes: Option<u64>,
    pub parent_pid: Option<u32>,
}

const NODE_NAMES: [&str; 2] = ["node.exe", "node"];
const PYTHON_NAMES: [&str; 4] = ["python.exe", "python3.exe", "python", "python3"];
const AI_AGENT_NAMES: [&str; 10] = [
    "claude.exe",
    "claude",
    "codex.exe",
    "codex",
    "opencode.exe",
    "opencode",
    "cursor.exe",
    "aider.exe",
    "aider",
    "gemini.exe",
];

pub fn list_all() -> Vec<ProcessInfo> {
    let registry = registry::load_registry();
    let port_map = ports::listening_ports();

    let mut sys = System::new();
    // cpu_usage() exige duas leituras espacadas no tempo para calcular a
    // taxa; sem o segundo refresh todo processo reportaria 0%.
    sys.refresh_processes_specifics(
        ProcessesToUpdate::All,
        true,
        ProcessRefreshKind::everything(),
    );
    thread::sleep(MINIMUM_CPU_UPDATE_INTERVAL);
    sys.refresh_processes_specifics(
        ProcessesToUpdate::All,
        true,
        ProcessRefreshKind::everything(),
    );

    let mut result = Vec::new();

    for (pid, proc_) in sys.processes() {
        let exe_name = proc_.name().to_string_lossy().to_string();
        let kind = if NODE_NAMES.iter().any(|n| exe_name.eq_ignore_ascii_case(n)) {
            Kind::Node
        } else if PYTHON_NAMES.iter().any(|n| exe_name.eq_ignore_ascii_case(n)) {
            Kind::Python
        } else if AI_AGENT_NAMES.iter().any(|n| exe_name.eq_ignore_ascii_case(n)) {
            Kind::AiAgent
        } else {
            continue;
        };

        let pid_u32 = pid.as_u32();
        let cwd = proc_.cwd().map(|p| p.to_string_lossy().to_string());
        let cmd: Vec<String> = proc_
            .cmd()
            .iter()
            .map(|s| s.to_string_lossy().to_string())
            .collect();
        let cmd_line = cmd.join(" ");

        let registry_match =
            find_registry_match(&registry, pid_u32, cwd.as_deref(), &cmd_line);

        let (origin, folder, command, started_label, log_path, registry_key) = match registry_match
        {
            Some((key, entry)) => (
                Origin::Registered,
                cwd.clone().or_else(|| Some(key.clone())),
                entry.cmd.clone(),
                Some(entry.started_at.clone()),
                entry.log.clone(),
                Some(key),
            ),
            None => (
                Origin::Untracked,
                cwd.clone(),
                if cmd_line.is_empty() { exe_name.clone() } else { cmd_line },
                None,
                None,
                None,
            ),
        };

        let proc_ports = port_map.get(&pid_u32).cloned().unwrap_or_default();

        result.push(ProcessInfo {
            id: format!("proc-{}", pid_u32),
            kind,
            origin,
            pid: Some(pid_u32),
            container_id: None,
            name: exe_name,
            folder,
            command,
            ports: proc_ports,
            started_at_epoch: Some(proc_.start_time()),
            started_label,
            log_path,
            registry_key,
            cpu_percent: Some(proc_.cpu_usage()),
            memory_bytes: Some(proc_.memory()),
            parent_pid: proc_.parent().map(|p| p.as_u32()),
        });
    }

    for container in docker::list_containers() {
        result.push(container_to_info(container));
    }

    result
}

fn normalize_path(p: &str) -> String {
    p.trim_end_matches(['\\', '/']).to_lowercase()
}

/// PIDs no Windows sao reciclados: o PID salvo no registry no momento do
/// `start` pode ja pertencer a outro processo quando o app escaneia depois.
/// Por isso o match por PID e so a primeira tentativa (mais preciso quando
/// ainda valido). O fallback por `cwd` exige prefixo (nao igualdade exata,
/// ja que processos filhos reais tem `cwd` dentro da pasta raiz registrada)
/// -- mas na pratica `sysinfo::Process::cwd()` retorna `None` com bastante
/// frequencia no Windows (falha silenciosa de `RtlUserProcessParameters`
/// pra processos que o app nao consegue abrir com acesso total). Por isso
/// ha um terceiro fallback: procurar a chave do registry como substring
/// dentro da linha de comando completa, que normalmente contem o caminho
/// do projeto mesmo quando `cwd` falha. Quando mais de uma chave bate,
/// usa a mais longa (mais especifica) para evitar colisao entre pastas
/// irmãs como `D:\Repos\foo` e `D:\Repos\foo-bar`.
fn find_registry_match<'a>(
    registry: &'a Registry,
    pid: u32,
    cwd: Option<&str>,
    cmd_line: &str,
) -> Option<(String, &'a registry::RegistryEntry)> {
    for (key, entry) in registry.iter() {
        if entry.pid == pid {
            return Some((key.clone(), entry));
        }
    }

    if let Some(cwd) = cwd {
        let cwd_norm = normalize_path(cwd);
        let by_cwd = registry
            .iter()
            .filter(|(key, _)| {
                let key_norm = normalize_path(key);
                cwd_norm == key_norm || cwd_norm.starts_with(&format!("{key_norm}\\"))
            })
            .max_by_key(|(key, _)| key.len());
        if by_cwd.is_some() {
            return by_cwd.map(|(key, entry)| (key.clone(), entry));
        }
    }

    let cmd_norm = normalize_path(cmd_line);
    registry
        .iter()
        .filter(|(key, _)| {
            let key_norm = normalize_path(key);
            !key_norm.is_empty() && cmd_norm.contains(&key_norm)
        })
        .max_by_key(|(key, _)| key.len())
        .map(|(key, entry)| (key.clone(), entry))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::registry::RegistryEntry;

    fn make_registry() -> Registry {
        let mut r = Registry::new();
        r.insert(
            r"D:\Repos\personal-styslist-ai".to_string(),
            RegistryEntry {
                pid: 159320,
                port: Some(3076),
                cmd: "pnpm dev".to_string(),
                log: None,
                started_at: "2026-08-21T00:11:14".to_string(),
            },
        );
        r
    }

    #[test]
    fn matches_by_cmdline_when_cwd_is_none() {
        let registry = make_registry();
        let cmd_line = r"node   D:\Repos\personal-styslist-ai\node_modules\.bin\..\next\dist\bin\next dev -p 3076";
        let result = find_registry_match(&registry, 999999, None, cmd_line);
        assert!(result.is_some(), "esperava match via cmdline, nao encontrou nenhum");
        assert_eq!(result.unwrap().0, r"D:\Repos\personal-styslist-ai");
    }

    #[test]
    fn matches_by_cmdline_lowercase_drive_letter() {
        let registry = make_registry();
        let cmd_line = r"C:\nvm4w\nodejs\node.exe d:\Repos\personal-styslist-ai\node_modules\next\dist\server\lib\start-server.js";
        let result = find_registry_match(&registry, 999999, None, cmd_line);
        assert!(
            result.is_some(),
            "esperava match via cmdline com drive letter minusculo, nao encontrou nenhum"
        );
    }

    #[test]
    fn matches_by_cwd_prefix() {
        let registry = make_registry();
        let cwd = r"D:\Repos\personal-styslist-ai\apps\web";
        let result = find_registry_match(&registry, 999999, Some(cwd), "");
        assert!(result.is_some(), "esperava match via prefixo de cwd");
    }

    #[test]
    fn no_match_for_unrelated_process() {
        let registry = make_registry();
        let cmd_line = r"C:\nvm4w\nodejs\node.exe C:\Users\Administrador\.serena\language_servers\static\foo.js";
        let result = find_registry_match(&registry, 999999, None, cmd_line);
        assert!(result.is_none(), "nao deveria casar processo nao relacionado");
    }
}

fn container_to_info(c: DockerContainer) -> ProcessInfo {
    ProcessInfo {
        id: format!("docker-{}", c.id),
        kind: Kind::Docker,
        origin: Origin::Untracked,
        pid: None,
        container_id: Some(c.id),
        name: c.name,
        folder: None,
        command: if c.command.is_empty() {
            c.image
        } else {
            c.command
        },
        ports: c.ports,
        started_at_epoch: None,
        started_label: Some(c.status),
        log_path: None,
        registry_key: None,
        cpu_percent: None,
        memory_bytes: None,
        parent_pid: None,
    }
}
