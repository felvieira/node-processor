use std::process::{Command, Output, Stdio};
use std::sync::mpsc;
use std::thread;
use std::time::Duration;

/// Executa o comando em thread separada e desiste apos `timeout`, para
/// que um processo externo travado (docker daemon parado, taskkill preso
/// numa arvore zumbi, etc.) nunca segure a chamada indefinidamente.
///
/// `spawn()` sem stdio explicito herda os handles de console do processo
/// pai no Windows (ao contrario de `Command::output()`, que configura
/// pipes sozinho) -- sem isso, o stdout do processo filho (ex: `docker
/// ps`) vaza direto pro console do app em vez de ser capturado.
pub fn run_with_timeout(cmd: &mut Command, timeout: Duration) -> Result<Output, String> {
    let child = cmd
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| e.to_string())?;
    let (tx, rx) = mpsc::channel();

    thread::spawn(move || {
        let output = child.wait_with_output();
        let _ = tx.send(output);
    });

    match rx.recv_timeout(timeout) {
        Ok(Ok(output)) => Ok(output),
        Ok(Err(e)) => Err(e.to_string()),
        Err(_) => Err(format!("timeout apos {}s esperando o comando", timeout.as_secs())),
    }
}
