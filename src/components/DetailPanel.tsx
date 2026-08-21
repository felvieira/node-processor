import { openUrl } from "@tauri-apps/plugin-opener";
import type { ProcessInfo } from "../lib/types";
import { TYPE_META, folderLabel } from "../lib/viewmodel";
import { formatBytes, formatCpu, formatUptime } from "../lib/format";
import { newestOf, siblingsOf } from "../lib/duplicates";

interface DetailPanelProps {
  process: ProcessInfo;
  allProcesses: ProcessInfo[];
  redundant: boolean;
  now: number;
  onClose: () => void;
  onOpenFolder: (path: string) => void;
  onOpenTerminal: (path: string) => void;
  onOpenLog: (p: ProcessInfo) => void;
  onKill: (p: ProcessInfo) => void;
  onKeepNewest: (ids: string[], project: string) => void;
}

export function DetailPanel({
  process: p,
  allProcesses,
  redundant,
  now,
  onClose,
  onOpenFolder,
  onOpenTerminal,
  onOpenLog,
  onKill,
  onKeepNewest,
}: DetailPanelProps) {
  const meta = TYPE_META[p.kind];
  const siblings = siblingsOf(p, allProcesses);
  const newest = siblings.length > 1 ? newestOf(siblings) : null;

  return (
    <div className="modal-overlay modal-overlay-right" onClick={onClose}>
      <div className="detail-panel" onClick={(e) => e.stopPropagation()}>
        <div className="detail-header">
          <div className="detail-header-top">
            <div className="detail-type">
              <span className="type-dot-glow" style={{ background: meta.color, boxShadow: `0 0 10px ${meta.glow}` }} />
              <span style={{ color: meta.color, fontWeight: 600 }}>{meta.label}</span>
              <span style={{ color: p.origin === "registered" ? "#4e8f7c" : "#f2b13c", fontSize: 12 }}>
                {p.origin === "registered" ? "· registrado no dev-registry" : "· não rastreado"}
              </span>
            </div>
            <button className="icon-btn-plain" onClick={onClose}>
              &#10005;
            </button>
          </div>
          <div className="detail-project">{folderLabel(p)}</div>
          <div className="mono detail-folder">{p.folder ?? "—"}</div>
        </div>

        {redundant && newest && (
          <div className="detail-dup-warning">
            <div className="detail-dup-title">
              &#9888; {siblings.length}ª instância do mesmo comando nesta pasta
            </div>
            <div className="detail-dup-body">
              Há {siblings.length} processos rodando "{p.command}" em {folderLabel(p)}. A mais
              recente é o PID {newest.pid} na porta {newest.ports[0] ?? "—"}.
            </div>
            <button
              className="btn-warn-full"
              onClick={() =>
                onKeepNewest(
                  siblings.filter((s) => s.id !== newest.id).map((s) => s.id),
                  folderLabel(p)
                )
              }
            >
              manter só a mais recente
            </button>
          </div>
        )}

        <div className="detail-section">
          <div className="detail-label">comando</div>
          <div className="mono detail-cmd-box">{p.command}</div>
        </div>

        <div className="detail-facts">
          <div className="detail-fact">
            <div className="detail-label">pid</div>
            <div className="mono detail-fact-value">{p.pid ?? p.container_id ?? "—"}</div>
          </div>
          <div className="detail-fact">
            <div className="detail-label">cpu</div>
            <div className="mono detail-fact-value" style={{ color: (p.cpu_percent ?? 0) > 25 ? "#ff8079" : undefined }}>
              {formatCpu(p.cpu_percent)}
            </div>
          </div>
          <div className="detail-fact">
            <div className="detail-label">memória</div>
            <div className="mono detail-fact-value">{formatBytes(p.memory_bytes)}</div>
          </div>
          <div className="detail-fact">
            <div className="detail-label">ativo há</div>
            <div className="mono detail-fact-value">
              {p.kind === "docker" ? p.started_label ?? "—" : formatUptime(p.started_at_epoch, now)}
            </div>
          </div>
          <div className="detail-fact">
            <div className="detail-label">log</div>
            <div className="mono detail-fact-value" style={{ color: p.log_path ? "#3ddbb0" : "#545d6b" }}>
              {p.log_path ? ".dev-registry.log" : "sem log"}
            </div>
          </div>
        </div>

        <div className="detail-section">
          <div className="detail-label">portas escutando</div>
          {p.ports.length === 0 && <div className="detail-noports">nenhuma porta em escuta</div>}
          {p.ports.map((port) => (
            <div key={port} className="detail-port-row" onClick={() => openUrl(`http://localhost:${port}`)}>
              <span className="mono">http://localhost:{port}</span>
              <span className="detail-port-open">abrir &#8599;</span>
            </div>
          ))}
        </div>

        <div className="detail-footer">
          {p.log_path && (
            <button className="btn-outline-full" onClick={() => onOpenLog(p)}>
              ver log ao vivo
            </button>
          )}
          <div className="detail-footer-row">
            {p.folder && (
              <button className="btn-outline-half" onClick={() => onOpenFolder(p.folder!)}>
                abrir pasta
              </button>
            )}
            {p.folder && (
              <button className="btn-outline-half" onClick={() => onOpenTerminal(p.folder!)}>
                terminal aqui
              </button>
            )}
          </div>
          <button className="btn-danger-full" onClick={() => onKill(p)}>
            matar processo {p.pid ?? p.container_id}
          </button>
        </div>
      </div>
    </div>
  );
}
