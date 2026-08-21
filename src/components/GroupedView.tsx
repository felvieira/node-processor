import type { MouseEvent } from "react";
import type { ProcessInfo } from "../lib/types";
import { TYPE_META, folderLabel } from "../lib/viewmodel";
import { formatBytes } from "../lib/format";
import { buildProcessTree } from "../lib/tree";
import { ProcessRow } from "./ProcessRow";
import type { SortColumn } from "./FlatView";
import type { ColumnKey } from "../lib/useColumnResize";

export interface ProcessGroup {
  key: string;
  folder: string;
  items: ProcessInfo[];
}

interface GroupedViewProps {
  groups: ProcessGroup[];
  collapsed: Set<string>;
  selected: Set<string>;
  redundant: Set<string>;
  protectedPids: Set<number>;
  protectedFolders: Set<string>;
  now: number;
  sortColumn: SortColumn;
  sortDir: "asc" | "desc";
  onSort: (col: SortColumn) => void;
  onStartResize: (col: ColumnKey, e: MouseEvent) => void;
  onToggleCollapse: (key: string) => void;
  onToggleGroupSelect: (ids: string[]) => void;
  onToggleOne: (id: string) => void;
  onOpenDetail: (p: ProcessInfo) => void;
  onOpenLog: (p: ProcessInfo) => void;
  onOpenFolder: (path: string) => void;
  onOpenTerminal: (path: string) => void;
  onKillOne: (p: ProcessInfo) => void;
  onKillGroup: (ids: string[], project: string) => void;
  onKillGroupDups: (ids: string[], project: string) => void;
  onSelectGroupDups: (ids: string[], project: string) => void;
  onToggleProtected: (p: ProcessInfo) => void;
  onToggleProtectedFolder: (folder: string) => void;
}

export function GroupedView({
  groups,
  collapsed,
  selected,
  redundant,
  protectedPids,
  protectedFolders,
  now,
  sortColumn,
  sortDir,
  onSort,
  onStartResize,
  onToggleCollapse,
  onToggleGroupSelect,
  onToggleOne,
  onOpenDetail,
  onOpenLog,
  onOpenFolder,
  onOpenTerminal,
  onKillOne,
  onKillGroup,
  onKillGroupDups,
  onSelectGroupDups,
  onToggleProtected,
  onToggleProtectedFolder,
}: GroupedViewProps) {
  function arrow(col: SortColumn) {
    if (sortColumn !== col) return "";
    return sortDir === "asc" ? " ↑" : " ↓";
  }

  function handle(col: ColumnKey) {
    return <div className="col-resize-handle" onMouseDown={(e) => onStartResize(col, e)} />;
  }

  return (
    <div className="grouped-view">
      {groups.map((g) => {
        const isOpen = !collapsed.has(g.key);
        const ids = g.items.map((p) => p.id);
        const dupIds = ids.filter((id) => redundant.has(id));
        const allSelected = ids.length > 0 && ids.every((id) => selected.has(id));
        const someSelected = ids.some((id) => selected.has(id));
        const kinds = Array.from(new Set(g.items.map((p) => p.kind)));
        const mem = g.items.reduce((a, p) => a + (p.memory_bytes ?? 0), 0);
        const cpu = g.items.reduce((a, p) => a + (p.cpu_percent ?? 0), 0);
        const folderProtected = protectedFolders.has(g.folder.trim().replace(/[\\/]+$/, "").toLowerCase());
        const tree = buildProcessTree(g.items);

        return (
          <div key={g.key} className={`group-card ${dupIds.length ? "group-card-dup" : ""}`}>
            <div className="group-head" onClick={() => onToggleCollapse(g.key)}>
              <div
                className="row-check"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleGroupSelect(ids);
                }}
              >
                <span
                  className={`checkbox ${allSelected ? "checkbox-checked" : someSelected ? "checkbox-partial" : ""}`}
                >
                  {allSelected ? "✓" : someSelected ? "–" : ""}
                </span>
              </div>
              <span className="group-caret mono">{isOpen ? "▼" : "▶"}</span>
              <div className="group-title-block">
                <div className="group-title-line">
                  <span className="group-project">{g.folder.split(/[\\/]/).pop() || g.folder}</span>
                  <span className="mono group-folder">{g.folder}</span>
                </div>
                <div className="group-badges">
                  {kinds.map((k) => (
                    <span
                      key={k}
                      className="type-badge"
                      style={{ color: TYPE_META[k].color, background: TYPE_META[k].bg }}
                    >
                      {g.items.filter((p) => p.kind === k).length}× {TYPE_META[k].label}
                    </span>
                  ))}
                  {dupIds.length > 0 && (
                    <span
                      className="dup-badge"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectGroupDups(dupIds, g.folder);
                      }}
                    >
                      &#9888; {dupIds.length} duplicada(s)
                    </span>
                  )}
                </div>
              </div>
              <div className="group-stats">
                <span className="mono group-mem">{formatBytes(mem)}</span>
                <span className="mono group-substats">
                  {cpu.toFixed(1)}% cpu · {ids.length} proc
                </span>
              </div>
              <div className="group-divider" />
              {dupIds.length > 0 && (
                <button
                  className="chip-btn chip-btn-warn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onKillGroupDups(dupIds, g.folder);
                  }}
                >
                  manter só a mais recente
                </button>
              )}
              <button
                className="chip-btn chip-btn-danger"
                onClick={(e) => {
                  e.stopPropagation();
                  onKillGroup(ids, g.folder);
                }}
              >
                matar {ids.length} da pasta
              </button>
              <button
                className="icon-btn"
                title="abrir pasta"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenFolder(g.folder);
                }}
              >
                &#9713;
              </button>
              <button
                className="icon-btn"
                title="terminal na pasta"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenTerminal(g.folder);
                }}
              >
                &gt;_
              </button>
              <button
                className={`icon-btn lock-btn-group ${folderProtected ? "lock-btn-active" : ""}`}
                title={folderProtected ? "remover proteção da pasta" : "proteger pasta (nunca matar)"}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleProtectedFolder(g.folder);
                }}
              >
                {folderProtected ? "\u{1F512}" : "\u{1F513}"}
              </button>
            </div>

            {isOpen && (
              <div className="group-body">
                <div className="group-columns-head mono">
                  <div className="row-check" />
                  <div className="row-type sortable" onClick={() => onSort("kind")}>
                    tipo{arrow("kind")}
                    {handle("type")}
                  </div>
                  <div className="row-cmd-compact sortable" onClick={() => onSort("folder")}>
                    comando{arrow("folder")}
                  </div>
                  <div className="row-pid sortable" onClick={() => onSort("pid")}>
                    pid{arrow("pid")}
                    {handle("pid")}
                  </div>
                  <div className="row-ports">
                    portas
                    {handle("ports")}
                  </div>
                  <div className="row-cpu sortable" onClick={() => onSort("cpu")}>
                    cpu{arrow("cpu")}
                    {handle("cpu")}
                  </div>
                  <div className="row-mem sortable" onClick={() => onSort("mem")}>
                    memória{arrow("mem")}
                    {handle("mem")}
                  </div>
                  <div className="row-uptime sortable" onClick={() => onSort("uptime")}>
                    ativo{arrow("uptime")}
                    {handle("uptime")}
                  </div>
                  <div className="row-actions">ações</div>
                </div>
                {tree.map(({ process: p, depth, childCount }) => (
                  <ProcessRow
                    key={p.id}
                    p={p}
                    compact
                    depth={depth}
                    childCount={childCount}
                    selected={selected.has(p.id)}
                    redundant={redundant.has(p.id)}
                    isProtected={folderProtected || (p.pid !== null && protectedPids.has(p.pid))}
                    now={now}
                    onToggle={() => onToggleOne(p.id)}
                    onOpenDetail={() => onOpenDetail(p)}
                    onOpenLog={() => onOpenLog(p)}
                    onOpenFolder={() => p.folder && onOpenFolder(p.folder)}
                    onOpenTerminal={() => p.folder && onOpenTerminal(p.folder)}
                    onKill={() => onKillOne(p)}
                    onToggleProtected={() => onToggleProtected(p)}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function buildGroups(list: ProcessInfo[]): ProcessGroup[] {
  const map = new Map<string, ProcessGroup>();
  for (const p of list) {
    const key = folderLabel(p);
    if (!map.has(key)) map.set(key, { key, folder: key, items: [] });
    map.get(key)!.items.push(p);
  }
  return Array.from(map.values());
}
