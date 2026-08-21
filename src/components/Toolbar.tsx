import type { RefObject } from "react";
import type { Kind } from "../lib/types";
import { KIND_ORDER, TYPE_META } from "../lib/viewmodel";

interface Chip {
  kind: Kind;
  count: number;
  active: boolean;
}

interface ToolbarProps {
  query: string;
  onQueryChange: (v: string) => void;
  searchInputRef?: RefObject<HTMLInputElement | null>;
  chips: Chip[];
  onToggleChip: (kind: Kind) => void;
  auto: boolean;
  onToggleAuto: () => void;
  onOpenAi: () => void;
  onOpenSettings: () => void;
  onOpenHistory: () => void;
}

export function Toolbar({
  query,
  onQueryChange,
  searchInputRef,
  chips,
  onToggleChip,
  auto,
  onToggleAuto,
  onOpenAi,
  onOpenSettings,
  onOpenHistory,
}: ToolbarProps) {
  return (
    <div className="toolbar-row">
      <div className="search-box">
        <span className="search-slash mono">/</span>
        <input
          ref={searchInputRef}
          className="search-input mono"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="pasta, comando, porta ou PID"
        />
      </div>

      {KIND_ORDER.map((k) => {
        const chip = chips.find((c) => c.kind === k);
        if (!chip) return null;
        const meta = TYPE_META[k];
        return (
          <button
            key={k}
            className={`type-chip ${chip.active ? "type-chip-active" : ""}`}
            style={
              chip.active
                ? { borderColor: meta.color, background: meta.bg, color: meta.color }
                : undefined
            }
            onClick={() => onToggleChip(k)}
          >
            <span className="type-dot" style={{ background: meta.color }} />
            {meta.label}
            <span className="mono type-chip-count">{chip.count}</span>
          </button>
        );
      })}

      <div style={{ flex: 1 }} />

      <button className="btn-ai" onClick={onOpenAi}>
        <span className="ai-btn-dot" />
        analisar com IA
      </button>
      <button className="icon-btn" title="histórico de kills" onClick={onOpenHistory}>
        &#128337;
      </button>
      <button className="icon-btn" title="configurar IA" onClick={onOpenSettings}>
        &#9881;
      </button>
      <button className="auto-toggle" onClick={onToggleAuto}>
        <span className={`auto-dot ${auto ? "auto-dot-on" : ""}`} />
        auto 4s
      </button>
    </div>
  );
}
