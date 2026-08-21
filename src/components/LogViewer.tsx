import { useEffect, useState } from "react";
import { tailLog } from "../lib/api";

interface LogViewerProps {
  path: string;
  title: string;
  pid: number | string;
  onClose: () => void;
}

interface LogLine {
  n: number;
  text: string;
}

export function LogViewer({ path, title, pid, onClose }: LogViewerProps) {
  const [lines, setLines] = useState<LogLine[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const text = await tailLog(path, 300);
      const rawLines = text.split("\n").filter((l) => l.length > 0);
      setLines(rawLines.map((text, i) => ({ n: i + 1, text })));
      setError(null);
    } catch (e) {
      setError(String(e));
    }
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 3000);
    return () => clearInterval(id);
  }, [path]);

  return (
    <div className="modal-overlay">
      <div className="log-terminal">
        <div className="log-terminal-header">
          <span className="log-terminal-dot" />
          <span className="log-terminal-title">{title}</span>
          <span className="mono log-terminal-path">{path}</span>
          <div style={{ flex: 1 }} />
          <span className="mono log-terminal-tail">tail -f · seguindo</span>
          <button className="icon-btn-plain" onClick={onClose}>
            &#10005;
          </button>
        </div>
        <div className="log-terminal-body">
          {error && <div className="log-terminal-error">Erro ao ler log: {error}</div>}
          {!error && lines.length === 0 && <div className="log-terminal-empty">(log vazio)</div>}
          {lines.map((l) => (
            <div key={l.n} className="log-terminal-line">
              <span className="log-terminal-n">{l.n}</span>
              <span className="mono log-terminal-text">{l.text}</span>
            </div>
          ))}
        </div>
        <div className="log-terminal-footer">
          <span className="mono">
            {lines.length} linhas · PID {pid}
          </span>
          <div style={{ flex: 1 }} />
          <span className="mono log-terminal-waiting">esperando novas linhas…</span>
        </div>
      </div>
    </div>
  );
}
