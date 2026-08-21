import { invoke } from "@tauri-apps/api/core";
import type {
  AiVerdictItem,
  KillHistoryEntry,
  KillResult,
  KillTarget,
  ProcessInfo,
  ProcessSnapshotDto,
  ProtectedList,
} from "./types";

export function listProcesses(): Promise<ProcessInfo[]> {
  return invoke("list_processes");
}

export function killProcesses(targets: KillTarget[]): Promise<KillResult[]> {
  return invoke("kill_processes", { targets });
}

export function openFolder(path: string): Promise<void> {
  return invoke("open_folder", { path });
}

export function openTerminal(path: string): Promise<void> {
  return invoke("open_terminal", { path });
}

export function tailLog(path: string, lines: number): Promise<string> {
  return invoke("tail_log", { path, lines });
}

export function runAiAnalysis(
  provider: string,
  apiKey: string,
  model: string,
  snapshot: ProcessSnapshotDto[]
): Promise<AiVerdictItem[]> {
  return invoke("run_ai_analysis", { provider, apiKey, model, snapshot });
}

export function getProtected(): Promise<ProtectedList> {
  return invoke("get_protected");
}

export function toggleProtected(folder: string | null, pid: number | null): Promise<ProtectedList> {
  return invoke("toggle_protected", { folder, pid });
}

export function getKillHistory(): Promise<KillHistoryEntry[]> {
  return invoke("get_kill_history");
}
