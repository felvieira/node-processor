import type { ProcessInfo } from "./types";

function normalizedCommand(cmd: string): string {
  return cmd
    .toLowerCase()
    .replace(/--port\s+\d+/g, "")
    .replace(/[-_]\d+$/g, "")
    .replace(/\d{4,5}/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function signature(p: ProcessInfo): string {
  return `${p.kind}|${normalizedCommand(p.command)}`;
}

function folderKey(p: ProcessInfo): string {
  return p.folder ?? p.name;
}

/** ids dos processos redundantes (mesma pasta + mesma assinatura de comando), mantendo o mais recente vivo */
export function findRedundantIds(list: ProcessInfo[]): Set<string> {
  const buckets = new Map<string, ProcessInfo[]>();
  for (const p of list) {
    const key = `${folderKey(p)}::${signature(p)}`;
    const bucket = buckets.get(key) ?? [];
    bucket.push(p);
    buckets.set(key, bucket);
  }

  const redundant = new Set<string>();
  for (const bucket of buckets.values()) {
    if (bucket.length < 2) continue;
    const sorted = [...bucket].sort(
      (a, b) => (a.started_at_epoch ?? 0) - (b.started_at_epoch ?? 0)
    );
    const keep = sorted[sorted.length - 1];
    for (const p of bucket) {
      if (p.id !== keep.id) redundant.add(p.id);
    }
  }
  return redundant;
}

export function siblingsOf(p: ProcessInfo, list: ProcessInfo[]): ProcessInfo[] {
  return list.filter((q) => folderKey(q) === folderKey(p) && signature(q) === signature(p));
}

export function newestOf(items: ProcessInfo[]): ProcessInfo {
  return [...items].sort((a, b) => (b.started_at_epoch ?? 0) - (a.started_at_epoch ?? 0))[0];
}
