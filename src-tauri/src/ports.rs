use std::collections::HashMap;
use std::os::windows::process::CommandExt;
use std::process::Command;
use std::time::Duration;

use crate::procutil::run_with_timeout;

const CREATE_NO_WINDOW: u32 = 0x08000000;
const NETSTAT_TIMEOUT: Duration = Duration::from_secs(5);

/// Roda `netstat -ano` e retorna PID -> lista de portas em LISTENING.
pub fn listening_ports() -> HashMap<u32, Vec<u16>> {
    let mut map: HashMap<u32, Vec<u16>> = HashMap::new();

    let output = run_with_timeout(
        Command::new("netstat")
            .args(["-ano", "-p", "TCP"])
            .creation_flags(CREATE_NO_WINDOW),
        NETSTAT_TIMEOUT,
    );

    let output = match output {
        Ok(o) => o,
        Err(_) => return map,
    };

    let text = String::from_utf8_lossy(&output.stdout);
    for line in text.lines() {
        let cols: Vec<&str> = line.split_whitespace().collect();
        // Formato: Proto  Local Address  Foreign Address  State  PID
        if cols.len() < 5 || cols[0] != "TCP" {
            continue;
        }
        if cols[3] != "LISTENING" {
            continue;
        }
        let local_addr = cols[1];
        let pid: u32 = match cols[4].parse() {
            Ok(p) => p,
            Err(_) => continue,
        };
        let port = match local_addr.rsplit(':').next().and_then(|p| p.parse::<u16>().ok()) {
            Some(p) => p,
            None => continue,
        };
        let entry = map.entry(pid).or_default();
        if !entry.contains(&port) {
            entry.push(port);
        }
    }

    map
}
