import { useState } from "react";
import type { AiSettings, AiVerdict, AiVerdictItem, ProcessInfo } from "../lib/types";
import { formatBytes } from "../lib/format";
import { runLocalHeuristic } from "../lib/heuristic";
import { runAiAnalysis } from "../lib/api";
import { PROVIDERS } from "./SettingsModal";

const VERDICT_META: Record<AiVerdict, { title: string; color: string; border: string; bg: string; label: string }> = {
  safe: { title: "pode matar", color: "#86d95c", border: "#254016", bg: "#111d0c", label: "seguro" },
  careful: { title: "cuidado", color: "#f2b13c", border: "#4a3a14", bg: "#1a1408", label: "cuidado" },
  keep: { title: "não matar", color: "#ff8079", border: "#4a2225", bg: "#170e10", label: "manter" },
};

interface AiPanelProps {
  settings: AiSettings;
  processes: ProcessInfo[];
  onClose: () => void;
  onOpenSettings: () => void;
  onKillByPids: (pids: number[]) => void;
}

type Status = "idle" | "running" | "done" | "error";

export function AiPanel({ settings, processes, onClose, onOpenSettings, onKillByPids }: AiPanelProps) {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<AiVerdictItem[] | null>(null);
  const [picked, setPicked] = useState<Set<number>>(new Set());

  const live = settings.provider !== "demo" && settings.apiKey.trim().length > 0;
  const byPid = new Map(processes.filter((p) => p.pid !== null).map((p) => [p.pid as number, p]));

  async function run() {
    setStatus("running");
    setError(null);
    try {
      let res: AiVerdictItem[];
      if (live) {
        const snapshot = processes
          .filter((p) => p.pid !== null)
          .map((p) => ({
            pid: p.pid as number,
            tipo: p.kind,
            pasta: p.folder ?? p.name,
            comando: p.command,
            portas: p.ports,
            cpu: p.cpu_percent ?? 0,
            memoria_mb: Math.round((p.memory_bytes ?? 0) / (1024 * 1024)),
            ativo: p.started_label ?? "",
            rastreado: p.origin === "registered",
          }));
        res = await runAiAnalysis(settings.provider, settings.apiKey, settings.model, snapshot);
      } else {
        await new Promise((r) => setTimeout(r, 700));
        res = runLocalHeuristic(processes);
      }
      setResults(res);
      setPicked(new Set(res.filter((r) => r.verdict === "safe").map((r) => r.pid)));
      setStatus("done");
    } catch (e) {
      setError(String(e));
      setStatus("error");
    }
  }

  function togglePick(pid: number) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(pid)) next.delete(pid);
      else next.add(pid);
      return next;
    });
  }

  const sections: { verdict: AiVerdict; items: { item: AiVerdictItem; p: ProcessInfo }[] }[] = (
    ["safe", "careful", "keep"] as AiVerdict[]
  )
    .map((verdict) => ({
      verdict,
      items: (results ?? [])
        .filter((r) => r.verdict === verdict && byPid.has(r.pid))
        .map((item) => ({ item, p: byPid.get(item.pid)! })),
    }))
    .filter((s) => s.items.length > 0);

  const pickedMem = Array.from(picked).reduce((a, pid) => a + (byPid.get(pid)?.memory_bytes ?? 0), 0);

  return (
    <div className="modal-overlay modal-overlay-right" onClick={onClose}>
      <div className="ai-panel" onClick={(e) => e.stopPropagation()}>
        <div className="ai-header">
          <div className="ai-header-top">
            <div>
              <div className="ai-title">Consultor de limpeza</div>
              <div className="mono ai-model-line" style={{ color: live ? "#3ddbb0" : "#f2b13c" }}>
                {live
                  ? `${PROVIDERS[settings.provider].name} · ${settings.model || PROVIDERS[settings.provider].models[0]}`
                  : "modo local · heurística embutida (sem chave configurada)"}
              </div>
            </div>
            <div className="ai-header-actions">
              <button className="icon-btn-plain" onClick={onOpenSettings}>
                &#9881;
              </button>
              <button className="icon-btn-plain" onClick={onClose}>
                &#10005;
              </button>
            </div>
          </div>
          <div className="ai-intro">
            {live
              ? "Manda o inventário de processos (pasta, comando, portas, CPU, memória, tempo ativo) e recebe de volta o que é seguro encerrar."
              : "Sem chave de API, a análise roda por heurística local: duplicados, órfãos sem porta, containers com estado e agentes em execução."}
          </div>
          <div className="ai-run-row">
            <button className="btn-primary" onClick={run}>
              {results ? "analisar de novo" : `analisar ${processes.length} processos`}
            </button>
            {!live && (
              <button className="btn-warn" onClick={onOpenSettings}>
                configurar chave de API
              </button>
            )}
          </div>
        </div>

        {status === "running" && (
          <div className="ai-loading">
            <div className="ai-spinner" />
            <div className="ai-loading-text">
              {live ? `consultando ${settings.model}…` : "cruzando duplicados, portas e tempo ativo…"}
            </div>
          </div>
        )}

        {status === "error" && error && <div className="ai-error mono">{error}</div>}

        {status === "done" && sections.length > 0 && (
          <>
            <div className="ai-results">
              <div className="ai-tally">
                {(["safe", "careful", "keep"] as AiVerdict[]).map((v) => (
                  <div
                    key={v}
                    className="ai-tally-card"
                    style={{ borderColor: VERDICT_META[v].border, background: VERDICT_META[v].bg }}
                  >
                    <span className="mono ai-tally-n" style={{ color: VERDICT_META[v].color }}>
                      {results?.filter((r) => r.verdict === v).length ?? 0}
                    </span>
                    <span className="ai-tally-label" style={{ color: VERDICT_META[v].color }}>
                      {VERDICT_META[v].label}
                    </span>
                  </div>
                ))}
              </div>

              {sections.map((sec) => (
                <div key={sec.verdict} className="ai-section">
                  <div className="ai-section-head">
                    <span className="type-dot" style={{ background: VERDICT_META[sec.verdict].color }} />
                    <span className="ai-section-title" style={{ color: VERDICT_META[sec.verdict].color }}>
                      {VERDICT_META[sec.verdict].title}
                    </span>
                    <span className="mono ai-section-meta">{sec.items.length}</span>
                  </div>
                  {sec.items.map(({ item, p }) => {
                    const isPicked = picked.has(item.pid);
                    return (
                      <div key={item.pid} className="ai-item">
                        <div
                          className="row-check"
                          style={{ paddingTop: 3 }}
                          onClick={() => togglePick(item.pid)}
                        >
                          <span className={`checkbox ${isPicked ? "checkbox-checked" : ""}`}>
                            {isPicked ? "✓" : ""}
                          </span>
                        </div>
                        <div className="ai-item-body">
                          <div className="ai-item-cmd-line">
                            <span className="mono ai-item-cmd">{p.command}</span>
                            <span className="mono ai-item-pid">PID {item.pid}</span>
                          </div>
                          <div className="ai-item-reason">{item.reason}</div>
                          <div className="mono ai-item-meta">
                            {p.folder ?? p.name} · {formatBytes(p.memory_bytes)} ·{" "}
                            {(p.cpu_percent ?? 0).toFixed(1)}%
                            {p.ports.length > 0 ? ` · :${p.ports.join(" :")}` : ""}
                          </div>
                        </div>
                        <button className="btn-danger-sm" onClick={() => onKillByPids([item.pid])}>
                          matar
                        </button>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            <div className="ai-cta-footer">
              <div>
                <div className="ai-cta-title">
                  {picked.size} {picked.size === 1 ? "processo marcado" : "processos marcados"}
                </div>
                <div className="mono ai-cta-meta">libera {formatBytes(pickedMem)}</div>
              </div>
              <div style={{ flex: 1 }} />
              <button
                className="btn-danger"
                onClick={() => onKillByPids(Array.from(picked))}
                disabled={picked.size === 0}
              >
                matar marcados
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
