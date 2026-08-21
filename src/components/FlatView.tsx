import type { MouseEvent } from "react";
import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { ProcessInfo } from "../lib/types";
import { ProcessRow } from "./ProcessRow";
import type { ColumnKey } from "../lib/useColumnResize";

export type SortColumn = "kind" | "folder" | "pid" | "cpu" | "mem" | "uptime";

const VIRTUALIZE_THRESHOLD = 150;
const ROW_HEIGHT = 62;

interface FlatViewProps {
  rows: ProcessInfo[];
  selected: Set<string>;
  redundant: Set<string>;
  protectedPids: Set<number>;
  now: number;
  sortColumn: SortColumn;
  sortDir: "asc" | "desc";
  allSelected: boolean;
  onToggleAll: () => void;
  onSort: (col: SortColumn) => void;
  onToggleOne: (id: string) => void;
  onOpenDetail: (p: ProcessInfo) => void;
  onOpenLog: (p: ProcessInfo) => void;
  onOpenFolder: (path: string) => void;
  onOpenTerminal: (path: string) => void;
  onKillOne: (p: ProcessInfo) => void;
  onToggleProtected: (p: ProcessInfo) => void;
  onStartResize: (col: ColumnKey, e: MouseEvent) => void;
}

export function FlatView({
  rows,
  selected,
  redundant,
  protectedPids,
  now,
  sortColumn,
  sortDir,
  allSelected,
  onToggleAll,
  onSort,
  onToggleOne,
  onOpenDetail,
  onOpenLog,
  onOpenFolder,
  onOpenTerminal,
  onKillOne,
  onToggleProtected,
  onStartResize,
}: FlatViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const shouldVirtualize = rows.length > VIRTUALIZE_THRESHOLD;

  const virtualizer = useVirtualizer({
    count: shouldVirtualize ? rows.length : 0,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
  });

  function arrow(col: SortColumn) {
    if (sortColumn !== col) return "";
    return sortDir === "asc" ? " ↑" : " ↓";
  }

  function handle(col: ColumnKey) {
    return <div className="col-resize-handle" onMouseDown={(e) => onStartResize(col, e)} />;
  }

  function renderRow(p: ProcessInfo) {
    return (
      <ProcessRow
        key={p.id}
        p={p}
        selected={selected.has(p.id)}
        redundant={redundant.has(p.id)}
        isProtected={p.pid !== null && protectedPids.has(p.pid)}
        now={now}
        onToggle={() => onToggleOne(p.id)}
        onOpenDetail={() => onOpenDetail(p)}
        onOpenLog={() => onOpenLog(p)}
        onOpenFolder={() => p.folder && onOpenFolder(p.folder)}
        onOpenTerminal={() => p.folder && onOpenTerminal(p.folder)}
        onKill={() => onKillOne(p)}
        onToggleProtected={() => onToggleProtected(p)}
      />
    );
  }

  return (
    <div className="flat-view">
      <div className="flat-header">
        <div className="row-check" onClick={onToggleAll}>
          <span className={`checkbox ${allSelected ? "checkbox-checked" : ""}`}>
            {allSelected ? "✓" : ""}
          </span>
        </div>
        <div className="flat-th" onClick={() => onSort("kind")}>
          tipo{arrow("kind")}
          {handle("type")}
        </div>
        <div className="flat-th flat-th-grow" onClick={() => onSort("folder")}>
          projeto / comando{arrow("folder")}
        </div>
        <div className="flat-th" onClick={() => onSort("pid")}>
          pid{arrow("pid")}
          {handle("pid")}
        </div>
        <div className="flat-th flat-th-static">
          portas
          {handle("ports")}
        </div>
        <div className="flat-th" onClick={() => onSort("cpu")}>
          cpu{arrow("cpu")}
          {handle("cpu")}
        </div>
        <div className="flat-th" onClick={() => onSort("mem")}>
          memória{arrow("mem")}
          {handle("mem")}
        </div>
        <div className="flat-th flat-th-static">
          ativo
          {handle("uptime")}
        </div>
        <div className="flat-th flat-th-static flat-th-right">ações</div>
      </div>
      <div className="flat-body" ref={scrollRef}>
        {!shouldVirtualize && rows.map(renderRow)}
        {shouldVirtualize && (
          <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
            {virtualizer.getVirtualItems().map((vRow) => (
              <div
                key={vRow.key}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  transform: `translateY(${vRow.start}px)`,
                }}
              >
                {renderRow(rows[vRow.index])}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
