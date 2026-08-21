use serde::{Deserialize, Serialize};
use std::os::windows::process::CommandExt;
use std::process::Command;
use std::time::Duration;

use crate::procutil::run_with_timeout;

const CREATE_NO_WINDOW: u32 = 0x08000000;
const DOCKER_TIMEOUT: Duration = Duration::from_secs(5);

#[derive(Debug, Deserialize)]
struct DockerPsLine {
    #[serde(rename = "ID")]
    id: String,
    #[serde(rename = "Names")]
    names: String,
    #[serde(rename = "Image")]
    image: String,
    #[serde(rename = "Ports")]
    ports: String,
    #[serde(rename = "Status")]
    status: String,
    #[serde(rename = "Command")]
    command: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct DockerContainer {
    pub id: String,
    pub name: String,
    pub image: String,
    pub ports: Vec<u16>,
    pub status: String,
    pub command: String,
}

pub fn list_containers() -> Vec<DockerContainer> {
    let output = run_with_timeout(
        Command::new("docker")
            .args(["ps", "--format", "{{json .}}"])
            .creation_flags(CREATE_NO_WINDOW),
        DOCKER_TIMEOUT,
    );

    let output = match output {
        Ok(o) if o.status.success() => o,
        _ => return Vec::new(),
    };

    let text = String::from_utf8_lossy(&output.stdout);
    text.lines()
        .filter_map(|line| serde_json::from_str::<DockerPsLine>(line).ok())
        .map(|l| DockerContainer {
            id: l.id,
            name: l.names,
            image: l.image,
            ports: parse_ports(&l.ports),
            status: l.status,
            command: l.command,
        })
        .collect()
}

fn parse_ports(raw: &str) -> Vec<u16> {
    // Ex: "0.0.0.0:5432->5432/tcp, :::5432->5432/tcp"
    let mut ports = Vec::new();
    for part in raw.split(',') {
        if let Some(host_part) = part.trim().split("->").next() {
            if let Some(port_str) = host_part.rsplit(':').next() {
                if let Ok(p) = port_str.parse::<u16>() {
                    if !ports.contains(&p) {
                        ports.push(p);
                    }
                }
            }
        }
    }
    ports
}

pub fn stop_container(id: &str) -> Result<(), String> {
    let output = run_with_timeout(
        Command::new("docker")
            .args(["stop", id])
            .creation_flags(CREATE_NO_WINDOW),
        DOCKER_TIMEOUT,
    )?;

    if output.status.success() {
        Ok(())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}
