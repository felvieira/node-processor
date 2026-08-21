import type { MouseEvent } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import type { ProcessInfo } from "../lib/types";
import { TYPE_META, cpuBarWidth, cpuColor, folderLabel, formatCommand } from "../lib/viewmodel";
import { formatBytes, formatCpu, formatUptime } from "../lib/format";

interface ProcessRowProps {
  p: ProcessInfo;
  selected: boolean;
  redundant: boolean;
  now: number;
  compact?: boolean;
  depth?: number;
  childCount?: number;
  isProtected?: boolean;
  onToggle: () => void;
  onOpenDetail: () => void;
  onOpenLog: () => void;
  onOpenFolder: () => void;
  onOpenTerminal: () => void;
  onKill: () => void;
  onToggleProtected?: () => void;
}

export function ProcessRow({
  p,
  selected,
  redundant,
  now,
  compact,
  depth = 0,
  childCount = 0,
  isProtected = false,
  onToggle,
  onOpenDetail,
  onOpenLog,
  onOpenFolder,
  onOpenTerminal,
  onKill,
  onToggleProtected,
}: ProcessRowProps) {
  const meta = TYPE_META[p.kind];
  const rowClass = `process-row ${compact ? "process-row-compact" : ""} ${
    selected ? "process-row-selected" : redundant ? "process-row-redundant" : ""
  } ${isProtected ? "process-row-protected" : ""}`;
  const cmd = formatCommand(p.command);

  function stop(e: MouseEvent) {
    e.stopPropagation();
  }

  return (
    <div className={rowClass} onClick={onOpenDetail}>
      <div className="row-check" onClick={(e) => { stop(e); onToggle(); }}>
        <span className={`checkbox ${selected ? "checkbox-checked" : ""}`}>
          {selected ? "✓" : ""}
        </span>
      </div>
      {depth > 0 && (
        <span className="tree-indent mono" style={{ width: depth * 16 }}>
          {"└".padStart(2, " ")}
        </span>
      )}
      <div className="row-type">
        <span className="type-dot" style={{ background: meta.color }} />
        <span style={{ color: meta.color }}>{meta.label}</span>
        {childCount > 0 && <span className="tree-child-count mono">+{childCount}</span>}
        {onToggleProtected && (
          <button
            className={`lock-btn ${isProtected ? "lock-btn-active" : ""}`}
            title={isProtected ? "remover proteção" : "proteger (nunca matar)"}
            onClick={(e) => { stop(e); onToggleProtected(); }}
          >
            {isProtected ? "\u{1F512}" : "\u{1F513}"}
          </button>
        )}
      </div>
      {!compact && (
        <div className="row-project-cmd">
          <div className="row-project-line">
            <span className="row-project">{folderLabel(p)}</span>
            {redundant && <span className="tag tag-dup">duplicado</span>}
            {p.origin === "untracked" && <span className="tag tag-untracked">não rastreado</span>}
          </div>
          <div className="row-cmd-line">
            <span className="mono row-cmd" title={cmd.full}>
              {cmd.short}
            </span>
          </div>
        </div>
      )}
      {compact && (
        <div className="row-cmd-compact">
          <span className="mono row-cmd" title={cmd.full}>
            {cmd.short}
          </span>
          {redundant && <span className="tag tag-dup">duplicado</span>}
          {p.origin === "untracked" && <span className="tag tag-untracked">não rastreado</span>}
        </div>
      )}
      <div className="row-pid mono">{p.pid ?? p.container_id?.slice(0, 12) ?? "—"}</div>
      <div className="row-ports">
        {p.ports.length === 0 && <span className="mono row-noports">—</span>}
        {p.ports.map((port) => (
          <span
            key={port}
            className="port-chip mono"
            onClick={(e) => {
              stop(e);
              openUrl(`http://localhost:${port}`);
            }}
          >
            {port}
          </span>
        ))}
      </div>
      <div className="row-cpu">
        <span className="mono" style={{ color: cpuColor(p.cpu_percent) }}>
          {formatCpu(p.cpu_percent)}
        </span>
        <div className="cpu-bar-track">
          <div
            className="cpu-bar-fill"
            style={{ width: cpuBarWidth(p.cpu_percent), background: cpuColor(p.cpu_percent) }}
          />
        </div>
      </div>
      <div className="row-mem mono">{formatBytes(p.memory_bytes)}</div>
      <div className="row-uptime mono">
        {p.kind === "docker" ? p.started_label ?? "—" : formatUptime(p.started_at_epoch, now)}
      </div>
      <div className="row-actions">
        {p.folder && (
          <button className="icon-btn" title="terminal" onClick={(e) => { stop(e); onOpenTerminal(); }}>
            &gt;_
          </button>
        )}
        {p.folder && (
          <button className="icon-btn" title="abrir pasta" onClick={(e) => { stop(e); onOpenFolder(); }}>
            &#9713;
          </button>
        )}
        {p.log_path && (
          <button className="icon-btn" title="ver log" onClick={(e) => { stop(e); onOpenLog(); }}>
            &#9776;
          </button>
        )}
        <button
          className="icon-btn icon-btn-danger"
          title={isProtected ? "protegido — remova a proteção para matar" : "matar"}
          disabled={isProtected}
          onClick={(e) => { stop(e); onKill(); }}
        >
          &#10005;
        </button>
      </div>
    </div>
  );
}
