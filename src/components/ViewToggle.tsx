export type GroupSort = "weight" | "cpu" | "count" | "name";

interface ViewToggleProps {
  grouped: boolean;
  onSetGrouped: (v: boolean) => void;
  groupSort: GroupSort;
  onSetGroupSort: (v: GroupSort) => void;
  onCollapseAll: () => void;
  onExpandAll: () => void;
  hasSelection: boolean;
  allSelected: boolean;
  selectedCount: number;
  selectedMem: string;
  onToggleSelectAll: () => void;
  onClearSelection: () => void;
  onKillSelected: () => void;
  onKillFiltered: () => void;
  killLabel: string;
}

export function ViewToggle({
  grouped,
  onSetGrouped,
  groupSort,
  onSetGroupSort,
  onCollapseAll,
  onExpandAll,
  hasSelection,
  allSelected,
  selectedCount,
  selectedMem,
  onToggleSelectAll,
  onClearSelection,
  onKillSelected,
  onKillFiltered,
  killLabel,
}: ViewToggleProps) {
  return (
    <div className="view-toggle-row">
      <div className="segmented">
        <button
          className={`segmented-btn ${grouped ? "segmented-btn-active" : ""}`}
          onClick={() => onSetGrouped(true)}
        >
          por pasta
        </button>
        <button
          className={`segmented-btn ${!grouped ? "segmented-btn-active" : ""}`}
          onClick={() => onSetGrouped(false)}
        >
          lista plana
        </button>
      </div>

      {grouped && (
        <>
          <div className="v-divider" />
          <span className="group-sort-label">ordenar grupos</span>
          <div className="segmented">
            {(["weight", "cpu", "count", "name"] as GroupSort[]).map((s) => (
              <button
                key={s}
                className={`segmented-btn ${groupSort === s ? "segmented-btn-active" : ""}`}
                onClick={() => onSetGroupSort(s)}
              >
                {s === "weight"
                  ? "memória"
                  : s === "cpu"
                    ? "cpu"
                    : s === "count"
                      ? "mais processos"
                      : "nome"}
              </button>
            ))}
          </div>
          <button className="btn-outline" onClick={onCollapseAll}>
            minimizar todos
          </button>
          <button className="btn-outline" onClick={onExpandAll}>
            maximizar todos
          </button>
        </>
      )}

      <div style={{ flex: 1 }} />

      <button className="btn-outline" onClick={onToggleSelectAll}>
        {allSelected ? "deselecionar todos" : "selecionar todos"}
      </button>

      {hasSelection && (
        <div className="selection-pill">
          <span className="selection-pill-text">
            {selectedCount} selecionados · {selectedMem}
          </span>
          <button className="selection-kill-btn" onClick={onKillSelected}>
            matar
          </button>
          <button className="selection-clear-btn" onClick={onClearSelection}>
            &#10005;
          </button>
        </div>
      )}
      <button className="btn-kill-filtered" onClick={onKillFiltered}>
        matar {killLabel}
      </button>
    </div>
  );
}
