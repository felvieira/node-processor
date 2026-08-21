export type Kind = "node" | "python" | "docker" | "ai_agent";
export type Origin = "registered" | "untracked";

export interface ProcessInfo {
  id: string;
  kind: Kind;
  origin: Origin;
  pid: number | null;
  container_id: string | null;
  name: string;
  folder: string | null;
  command: string;
  ports: number[];
  started_at_epoch: number | null;
  started_label: string | null;
  log_path: string | null;
  registry_key: string | null;
  cpu_percent: number | null;
  memory_bytes: number | null;
  parent_pid: number | null;
}

export interface KillTarget {
  kind: Kind;
  pid: number | null;
  container_id: string | null;
  registry_key: string | null;
  folder: string | null;
  name: string;
  memory_bytes: number | null;
}

export interface KillResult {
  name: string;
  ok: boolean;
  error: string | null;
}

export interface ProtectedList {
  folders: string[];
  pids: number[];
}

export interface KillHistoryEntry {
  command: string;
  folder: string | null;
  pid: number | null;
  memory_freed_bytes: number | null;
  timestamp_epoch: number;
}

export interface CleanupProfile {
  id: string;
  name: string;
  kindFilter: Kind[];
  query: string;
}

export type AiVerdict = "safe" | "careful" | "keep";

export interface AiVerdictItem {
  pid: number;
  verdict: AiVerdict;
  reason: string;
}

export type AiProvider = "openrouter" | "openai" | "demo";

export interface AiSettings {
  provider: AiProvider;
  apiKey: string;
  model: string;
}

export interface ProcessSnapshotDto {
  pid: number;
  tipo: string;
  pasta: string;
  comando: string;
  portas: number[];
  cpu: number;
  memoria_mb: number;
  ativo: string;
  rastreado: boolean;
}
