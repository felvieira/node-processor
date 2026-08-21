import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getProtected,
  killProcesses,
  listProcesses,
  openFolder,
  openTerminal,
  toggleProtected,
} from "./lib/api";
import type { AiSettings, CleanupProfile, Kind, KillTarget, ProcessInfo, ProtectedList } from "./lib/types";
import { findRedundantIds } from "./lib/duplicates";
import { formatBytes } from "./lib/format";
import { folderLabel, KIND_ORDER } from "./lib/viewmodel";
import { useKeyboardShortcuts } from "./lib/useKeyboardShortcuts";
import { useColumnResize } from "./lib/useColumnResize";
import { TitleBar } from "./components/TitleBar";
import { Toolbar } from "./components/Toolbar";
import { ViewToggle, type GroupSort } from "./components/ViewToggle";
import { ProfileBar } from "./components/ProfileBar";
import { DuplicateBanner } from "./components/DuplicateBanner";
import { GroupedView, buildGroups } from "./components/GroupedView";
import { FlatView, type SortColumn } from "./components/FlatView";
import { DetailPanel } from "./components/DetailPanel";
import { LogViewer } from "./components/LogViewer";
import { AiPanel } from "./components/AiPanel";
import { SettingsModal } from "./components/SettingsModal";
import { HistoryPanel } from "./components/HistoryPanel";
import { ConfirmDialog, type ConfirmState } from "./components/ConfirmDialog";
import { Toast } from "./components/Toast";
import { TYPE_META } from "./lib/viewmodel";
import "./App.css";

const AUTO_REFRESH_MS = 4000;
const CLOCK_TICK_MS = 1000;
const SETTINGS_KEY = "np.ai.settings";
const PROFILES_KEY = "np.cleanup.profiles";

const DEFAULT_SETTINGS: AiSettings = { provider: "demo", apiKey: "", model: "" };

function loadSettings(): AiSettings {
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      provider: parsed.provider ?? "demo",
      apiKey: parsed.apiKey ?? "",
      model: parsed.model ?? "",
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function loadProfiles(): CleanupProfile[] {
  try {
    const raw = window.localStorage.getItem(PROFILES_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function normalizeFolder(folder: string): string {
  return folder.trim().replace(/[\\/]+$/, "").toLowerCase();
}

function toKillTarget(p: ProcessInfo): KillTarget {
  return {
    kind: p.kind,
    pid: p.pid,
    container_id: p.container_id,
    registry_key: p.registry_key,
    folder: p.folder,
    name: p.name,
    memory_bytes: p.memory_bytes,
  };
}

function App() {
  const [processes, setProcesses] = useState<ProcessInfo[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState<Set<Kind>>(new Set());
  const [now, setNow] = useState(() => Date.now());
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [grouped, setGrouped] = useState(true);
  const [groupSort, setGroupSort] = useState<GroupSort>("weight");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [sortColumn, setSortColumn] = useState<SortColumn>("folder");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const { startResize, cssVars } = useColumnResize();

  const [detailProcess, setDetailProcess] = useState<ProcessInfo | null>(null);
  const [logProcess, setLogProcess] = useState<ProcessInfo | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [aiSettings, setAiSettings] = useState<AiSettings>(loadSettings);
  const [confirm, setConfirm] = useState<ConfirmState & { ids: string[] }>();
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const [protectedList, setProtectedList] = useState<ProtectedList>({ folders: [], pids: [] });
  const [profiles, setProfiles] = useState<CleanupProfile[]>(loadProfiles);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const list = await listProcesses();
      setProcesses(list);
      setError(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshProtected = useCallback(async () => {
    try {
      setProtectedList(await getProtected());
    } catch {
      // segue com o que ja tem em memoria se o comando falhar
    }
  }, []);

  useEffect(() => {
    refresh();
    refreshProtected();
  }, [refresh, refreshProtected]);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(refresh, AUTO_REFRESH_MS);
    return () => clearInterval(id);
  }, [autoRefresh, refresh]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), CLOCK_TICK_MS);
    return () => clearInterval(id);
  }, []);

  function flash(msg: string) {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2400);
  }

  const byId = useMemo(() => new Map(processes.map((p) => [p.id, p])), [processes]);

  const protectedPids = useMemo(() => new Set(protectedList.pids), [protectedList]);
  const protectedFolders = useMemo(
    () => new Set(protectedList.folders.map(normalizeFolder)),
    [protectedList]
  );

  function isProcessProtected(p: ProcessInfo): boolean {
    if (p.pid !== null && protectedPids.has(p.pid)) return true;
    const folder = p.folder ?? p.name;
    return protectedFolders.has(normalizeFolder(folder));
  }

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return processes.filter((p) => {
      if (kindFilter.size > 0 && !kindFilter.has(p.kind)) return false;
      if (!term) return true;
      return (
        folderLabel(p).toLowerCase().includes(term) ||
        p.command.toLowerCase().includes(term) ||
        String(p.pid ?? "").includes(term) ||
        p.ports.some((port) => String(port).includes(term))
      );
    });
  }, [processes, search, kindFilter]);

  const redundantAll = useMemo(() => findRedundantIds(processes), [processes]);
  const redundantVisible = useMemo(
    () => new Set(Array.from(redundantAll).filter((id) => filtered.some((p) => p.id === id))),
    [redundantAll, filtered]
  );

  function compare(a: ProcessInfo, b: ProcessInfo, dir: number): number {
    switch (sortColumn) {
      case "kind": {
        const diff = KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind);
        return diff !== 0 ? diff * dir : folderLabel(a).localeCompare(folderLabel(b)) * dir;
      }
      case "folder":
        return folderLabel(a).localeCompare(folderLabel(b)) * dir;
      case "pid":
        return ((a.pid ?? 0) - (b.pid ?? 0)) * dir;
      case "cpu":
        return ((a.cpu_percent ?? 0) - (b.cpu_percent ?? 0)) * dir;
      case "mem":
        return ((a.memory_bytes ?? 0) - (b.memory_bytes ?? 0)) * dir;
      case "uptime":
        return ((a.started_at_epoch ?? 0) - (b.started_at_epoch ?? 0)) * dir;
      default:
        return 0;
    }
  }

  const sortedFlat = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => compare(a, b, dir));
  }, [filtered, sortColumn, sortDir]);

  const groups = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;
    const list = buildGroups(filtered);
    const withStats = list.map((g) => ({
      ...g,
      items: [...g.items].sort((a, b) => compare(a, b, dir)),
      _mem: g.items.reduce((a, p) => a + (p.memory_bytes ?? 0), 0),
      _cpu: g.items.reduce((a, p) => a + (p.cpu_percent ?? 0), 0),
    }));
    if (groupSort === "weight") withStats.sort((a, b) => b._mem - a._mem);
    else if (groupSort === "cpu") withStats.sort((a, b) => b._cpu - a._cpu);
    else if (groupSort === "count") withStats.sort((a, b) => b.items.length - a.items.length);
    else withStats.sort((a, b) => a.folder.localeCompare(b.folder));
    return withStats;
  }, [filtered, groupSort, sortColumn, sortDir]);

  function toggleSort(col: SortColumn) {
    if (sortColumn === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortColumn(col);
      setSortDir("asc");
    }
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleMany(ids: string[]) {
    setSelected((prev) => {
      const allIn = ids.length > 0 && ids.every((id) => prev.has(id));
      const next = new Set(prev);
      if (allIn) ids.forEach((id) => next.delete(id));
      else ids.forEach((id) => next.add(id));
      return next;
    });
  }

  function toggleChip(kind: Kind) {
    setKindFilter((prev) => {
      const next = new Set(prev);
      if (next.has(kind)) next.delete(kind);
      else next.add(kind);
      return next;
    });
  }

  function askKill(ids: string[], title: string, cta: string) {
    const items = ids
      .map((id) => byId.get(id))
      .filter((p): p is ProcessInfo => !!p)
      .filter((p) => {
        if (isProcessProtected(p)) {
          flash(`${folderLabel(p)} está protegido — remova a proteção para matar`);
          return false;
        }
        return true;
      });
    if (items.length === 0) {
      flash("nada a matar aqui");
      return;
    }
    const mem = items.reduce((a, p) => a + (p.memory_bytes ?? 0), 0);
    const folders = new Set(items.map((p) => folderLabel(p))).size;
    setConfirm({
      ids: items.map((p) => p.id),
      title,
      body: `SIGKILL em ${items.length} ${items.length === 1 ? "processo" : "processos"} · ${folders} ${folders === 1 ? "pasta" : "pastas"} · libera ${formatBytes(mem)}. Trabalho não salvo nesses terminais é perdido.`,
      cta,
      items: items.slice(0, 8).map((p) => ({
        cmd: p.command,
        meta: `PID ${p.pid ?? p.container_id} · ${folderLabel(p)}`,
        color: TYPE_META[p.kind].color,
      })),
      more: items.length > 8,
      moreText: `+ ${items.length - 8} outros`,
    });
  }

  async function doConfirm() {
    if (!confirm) return;
    const ids = confirm.ids;
    const targets = ids.map((id) => byId.get(id)).filter((p): p is ProcessInfo => !!p).map(toKillTarget);
    setConfirm(undefined);
    await killProcesses(targets);
    setSelected((prev) => new Set(Array.from(prev).filter((id) => !ids.includes(id))));
    if (detailProcess && ids.includes(detailProcess.id)) setDetailProcess(null);
    if (logProcess && ids.includes(logProcess.id)) setLogProcess(null);
    flash(`${ids.length} ${ids.length === 1 ? "processo encerrado" : "processos encerrados"}`);
    await refresh();
  }

  function killByPids(pids: number[]) {
    const ids = processes.filter((p) => p.pid !== null && pids.includes(p.pid)).map((p) => p.id);
    askKill(ids, pids.length === 1 ? "Matar processo recomendado?" : `Matar ${pids.length} processos recomendados?`, `matar ${pids.length}`);
  }

  async function handleToggleProtected(p: ProcessInfo) {
    if (p.pid === null) return;
    const next = await toggleProtected(null, p.pid);
    setProtectedList(next);
    flash(protectedPids.has(p.pid) ? "proteção removida" : "processo protegido");
  }

  async function handleToggleProtectedFolder(folder: string) {
    const next = await toggleProtected(folder, null);
    setProtectedList(next);
    flash(protectedFolders.has(normalizeFolder(folder)) ? "proteção da pasta removida" : "pasta protegida");
  }

  function saveProfiles(list: CleanupProfile[]) {
    setProfiles(list);
    try {
      window.localStorage.setItem(PROFILES_KEY, JSON.stringify(list));
    } catch {
      // localStorage indisponível, segue só em memória
    }
  }

  function applyProfile(p: CleanupProfile) {
    setKindFilter(new Set(p.kindFilter));
    setSearch(p.query);
    flash(`perfil "${p.name}" aplicado`);
  }

  function saveCurrentAsProfile(name: string) {
    const profile: CleanupProfile = {
      id: `profile-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name,
      kindFilter: Array.from(kindFilter),
      query: search,
    };
    saveProfiles([...profiles, profile]);
    flash(`perfil "${name}" salvo`);
  }

  function deleteProfile(id: string) {
    saveProfiles(profiles.filter((p) => p.id !== id));
  }

  const chips = KIND_ORDER.map((k) => ({
    kind: k,
    count: processes.filter((p) => p.kind === k).length,
    active: kindFilter.has(k),
  })).filter((c) => c.count > 0);

  const selectedCount = selected.size;
  const selectedMem = formatBytes(
    processes.filter((p) => selected.has(p.id)).reduce((a, p) => a + (p.memory_bytes ?? 0), 0)
  );

  const dupMem = processes
    .filter((p) => redundantVisible.has(p.id))
    .reduce((a, p) => a + (p.memory_bytes ?? 0), 0);
  const dupFolders = new Set(
    processes.filter((p) => redundantVisible.has(p.id)).map((p) => folderLabel(p))
  ).size;

  useKeyboardShortcuts({
    onFocusSearch: () => searchInputRef.current?.focus(),
    onSelectAll: () => toggleMany(filtered.map((p) => p.id)),
    onDeleteSelection: () => {
      if (selectedCount === 0) return;
      askKill(
        Array.from(selected),
        selectedCount === 1 ? "Matar o processo selecionado?" : `Matar ${selectedCount} selecionados?`,
        "matar selecionados"
      );
    },
    onEscape: () => {
      if (confirm) return setConfirm(undefined);
      if (historyOpen) return setHistoryOpen(false);
      if (settingsOpen) return setSettingsOpen(false);
      if (aiOpen) return setAiOpen(false);
      if (logProcess) return setLogProcess(null);
      if (detailProcess) return setDetailProcess(null);
    },
  });

  return (
    <div className="app-shell" style={cssVars}>
      <TitleBar />
      <div className="app-body">
        <Toolbar
          query={search}
          onQueryChange={setSearch}
          searchInputRef={searchInputRef}
          chips={chips}
          onToggleChip={toggleChip}
          auto={autoRefresh}
          onToggleAuto={() => setAutoRefresh((v) => !v)}
          onOpenAi={() => setAiOpen(true)}
          onOpenSettings={() => setSettingsOpen(true)}
          onOpenHistory={() => setHistoryOpen(true)}
        />

        <ProfileBar
          profiles={profiles}
          onApply={applyProfile}
          onSaveCurrent={saveCurrentAsProfile}
          onDelete={deleteProfile}
        />

        <ViewToggle
          grouped={grouped}
          onSetGrouped={setGrouped}
          groupSort={groupSort}
          onSetGroupSort={setGroupSort}
          onCollapseAll={() => setCollapsed(new Set(groups.map((g) => g.key)))}
          onExpandAll={() => setCollapsed(new Set())}
          hasSelection={selectedCount > 0}
          allSelected={filtered.length > 0 && filtered.every((p) => selected.has(p.id))}
          selectedCount={selectedCount}
          selectedMem={selectedMem}
          onToggleSelectAll={() => toggleMany(filtered.map((p) => p.id))}
          onClearSelection={() => setSelected(new Set())}
          onKillSelected={() =>
            askKill(
              Array.from(selected),
              selectedCount === 1 ? "Matar o processo selecionado?" : `Matar ${selectedCount} selecionados?`,
              "matar selecionados"
            )
          }
          onKillFiltered={() =>
            askKill(
              filtered.map((p) => p.id),
              filtered.length === 1 ? "Matar 1 processo?" : `Matar ${filtered.length} processos?`,
              `matar ${filtered.length}`
            )
          }
          killLabel={`${kindFilter.size || search ? "filtrados" : "todos"} (${filtered.length})`}
        />

        {redundantVisible.size > 0 && (
          <DuplicateBanner
            count={redundantVisible.size}
            folders={dupFolders}
            memText={formatBytes(dupMem)}
            onSelect={() => {
              setSelected(new Set(redundantVisible));
              flash(`${redundantVisible.size} duplicado(s) selecionado(s)`);
            }}
            onKill={() =>
              askKill(
                Array.from(redundantVisible),
                redundantVisible.size === 1 ? "Matar 1 instância redundante?" : `Matar ${redundantVisible.size} instâncias redundantes?`,
                "matar duplicados"
              )
            }
          />
        )}

        {error && <div className="error-banner">Erro: {error}</div>}

        {filtered.length === 0 && !loading && (
          <div className="empty-state">
            <div className="empty-glyph mono">{processes.length ? "0" : "∅"}</div>
            <div className="empty-title">
              {processes.length ? "Nenhum processo bate com o filtro" : "Nada rodando nesta máquina"}
            </div>
            <div className="empty-body">
              {processes.length
                ? `Ajuste a busca ou remova os chips de categoria para ver os ${processes.length} processos ativos.`
                : "Nenhum processo Node, Python, Docker ou agente de IA foi encontrado. O dev-registry.json também está vazio."}
            </div>
            {processes.length > 0 && (
              <button
                className="btn-outline"
                onClick={() => {
                  setSearch("");
                  setKindFilter(new Set());
                }}
              >
                limpar filtros
              </button>
            )}
          </div>
        )}

        {filtered.length > 0 && grouped && (
          <GroupedView
            groups={groups}
            collapsed={collapsed}
            selected={selected}
            redundant={redundantAll}
            protectedPids={protectedPids}
            protectedFolders={protectedFolders}
            now={now}
            sortColumn={sortColumn}
            sortDir={sortDir}
            onSort={toggleSort}
            onStartResize={startResize}
            onToggleCollapse={(key) =>
              setCollapsed((prev) => {
                const next = new Set(prev);
                if (next.has(key)) next.delete(key);
                else next.add(key);
                return next;
              })
            }
            onToggleGroupSelect={toggleMany}
            onToggleOne={toggleOne}
            onOpenDetail={setDetailProcess}
            onOpenLog={setLogProcess}
            onOpenFolder={openFolder}
            onOpenTerminal={openTerminal}
            onKillOne={(p) => askKill([p.id], `Matar ${p.command}?`, `matar PID ${p.pid}`)}
            onKillGroup={(ids, project) =>
              askKill(ids, `Matar tudo em ${project}?`, `matar ${ids.length} ${ids.length === 1 ? "processo" : "processos"}`)
            }
            onKillGroupDups={(ids, project) =>
              askKill(ids, `Manter só a instância mais recente de ${project}?`, `matar ${ids.length} ${ids.length === 1 ? "duplicado" : "duplicados"}`)
            }
            onSelectGroupDups={(ids, project) => {
              toggleMany(ids);
              flash(`${ids.length} duplicado(s) selecionado(s) em ${project}`);
            }}
            onToggleProtected={handleToggleProtected}
            onToggleProtectedFolder={handleToggleProtectedFolder}
          />
        )}

        {filtered.length > 0 && !grouped && (
          <FlatView
            rows={sortedFlat}
            selected={selected}
            redundant={redundantAll}
            protectedPids={protectedPids}
            now={now}
            sortColumn={sortColumn}
            sortDir={sortDir}
            allSelected={sortedFlat.length > 0 && sortedFlat.every((p) => selected.has(p.id))}
            onToggleAll={() => toggleMany(sortedFlat.map((p) => p.id))}
            onSort={toggleSort}
            onStartResize={startResize}
            onToggleOne={toggleOne}
            onOpenDetail={setDetailProcess}
            onOpenLog={setLogProcess}
            onOpenFolder={openFolder}
            onOpenTerminal={openTerminal}
            onKillOne={(p) => askKill([p.id], `Matar ${p.command}?`, `matar PID ${p.pid}`)}
            onToggleProtected={handleToggleProtected}
          />
        )}
      </div>

      <div className="status-bar mono">
        <span>
          {processes.length} processos · {new Set(processes.map(folderLabel)).size} pastas ·{" "}
          {formatBytes(processes.reduce((a, p) => a + (p.memory_bytes ?? 0), 0))}
        </span>
        <div style={{ flex: 1 }} />
        <span>
          {processes.filter((p) => p.origin === "registered").length} registrados ·{" "}
          {processes.filter((p) => p.origin === "untracked").length} órfãos · {redundantAll.size} duplicados
        </span>
        <span style={{ color: autoRefresh ? "#3ddbb0" : "#5f6875" }}>
          {autoRefresh ? "atualizado agora" : "auto-refresh pausado"}
        </span>
      </div>

      {detailProcess && (
        <DetailPanel
          process={detailProcess}
          allProcesses={processes}
          redundant={redundantAll.has(detailProcess.id)}
          now={now}
          onClose={() => setDetailProcess(null)}
          onOpenFolder={openFolder}
          onOpenTerminal={openTerminal}
          onOpenLog={(p) => {
            setDetailProcess(null);
            setLogProcess(p);
          }}
          onKill={(p) => askKill([p.id], `Matar processo ${p.pid}?`, `matar PID ${p.pid}`)}
          onKeepNewest={(ids, project) =>
            askKill(ids, `Manter só o mais recente em ${project}?`, `matar ${ids.length} ${ids.length === 1 ? "duplicado" : "duplicados"}`)
          }
        />
      )}

      {logProcess && logProcess.log_path && (
        <LogViewer
          path={logProcess.log_path}
          title={`${folderLabel(logProcess)} · ${logProcess.command}`}
          pid={logProcess.pid ?? logProcess.container_id ?? "—"}
          onClose={() => setLogProcess(null)}
        />
      )}

      {aiOpen && (
        <AiPanel
          settings={aiSettings}
          processes={processes}
          onClose={() => setAiOpen(false)}
          onOpenSettings={() => setSettingsOpen(true)}
          onKillByPids={killByPids}
        />
      )}

      {settingsOpen && (
        <SettingsModal
          settings={aiSettings}
          processCount={processes.length}
          onCancel={() => setSettingsOpen(false)}
          onSave={(s) => {
            setAiSettings(s);
            try {
              window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
            } catch {
              // localStorage indisponível, segue só em memória
            }
            setSettingsOpen(false);
            flash(s.provider !== "demo" && s.apiKey ? `consultor conectado` : "usando análise local");
          }}
        />
      )}

      {historyOpen && <HistoryPanel onClose={() => setHistoryOpen(false)} />}

      {confirm && (
        <ConfirmDialog confirm={confirm} onCancel={() => setConfirm(undefined)} onConfirm={doConfirm} />
      )}

      <Toast message={toast} />
    </div>
  );
}

export default App;
