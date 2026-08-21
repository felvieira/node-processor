import { useEffect, useState } from "react";
import type { KillHistoryEntry } from "../lib/types";
import { getKillHistory } from "../lib/api";
import { formatBytes } from "../lib/format";

interface HistoryPanelProps {
  onClose: () => void;
}

function formatTimestamp(epoch: number): string {
  const d = new Date(epoch * 1000);
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "medium" });
}

export function HistoryPanel({ onClose }: HistoryPanelProps) {
  const [entries, setEntries] = useState<KillHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getKillHistory()
      .then(setEntries)
      .finally(() => setLoading(false));
  }, []);

  const totalFreed = entries.reduce((a, e) => a + (e.memory_freed_bytes ?? 0), 0);

  return (
    <div className="modal-overlay modal-overlay-right" onClick={onClose}>
      <div className="history-panel" onClick={(e) => e.stopPropagation()}>
        <div className="history-header">
          <div>
            <div className="history-title">Histórico de kills</div>
            <div className="mono history-subtitle">
              {entries.length} entradas · {formatBytes(totalFreed)} liberados no total
            </div>
          </div>
          <button className="icon-btn-plain" onClick={onClose}>
            &#10005;
          </button>
        </div>
        <div className="history-body">
          {loading && <div className="history-empty">carregando…</div>}
          {!loading && entries.length === 0 && (
            <div className="history-empty">nenhum processo foi morto ainda nesta sessão</div>
          )}
          {entries.map((e, i) => (
            <div key={i} className="history-entry">
              <div className="history-entry-top">
                <span className="mono history-entry-cmd">{e.command}</span>
                <span className="mono history-entry-time">{formatTimestamp(e.timestamp_epoch)}</span>
              </div>
              <div className="mono history-entry-meta">
                {e.folder ?? "—"} · PID {e.pid ?? "—"} ·{" "}
                {e.memory_freed_bytes !== null ? formatBytes(e.memory_freed_bytes) : "—"}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
