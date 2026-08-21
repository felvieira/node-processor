import type { ProcessInfo } from "./types";

export interface TreeNode {
  process: ProcessInfo;
  depth: number;
  childCount: number;
}

/**
 * Ordena uma lista de processos em ordem de árvore (pai antes dos filhos,
 * recursivamente), anotando a profundidade de cada um. Processos cujo pai
 * não está na mesma lista (ex: pai fora do filtro atual) viram raízes.
 */
export function buildProcessTree(list: ProcessInfo[]): TreeNode[] {
  const byPid = new Map<number, ProcessInfo[]>();
  const ids = new Set(list.map((p) => p.id));
  const pidPresent = new Set(list.filter((p) => p.pid !== null).map((p) => p.pid as number));

  for (const p of list) {
    const parentPid = p.parent_pid;
    const isRoot = parentPid === null || !pidPresent.has(parentPid);
    const key = isRoot ? -1 : (parentPid as number);
    const bucket = byPid.get(key) ?? [];
    bucket.push(p);
    byPid.set(key, bucket);
  }

  const result: TreeNode[] = [];
  const visited = new Set<string>();

  function visit(parentKey: number, depth: number) {
    const children = byPid.get(parentKey) ?? [];
    for (const p of children) {
      if (visited.has(p.id) || !ids.has(p.id)) continue;
      visited.add(p.id);
      const childCount = p.pid !== null ? (byPid.get(p.pid)?.length ?? 0) : 0;
      result.push({ process: p, depth, childCount });
      if (p.pid !== null) visit(p.pid, depth + 1);
    }
  }

  visit(-1, 0);

  // segurança: qualquer processo não visitado (ciclo improvável) entra como raiz
  for (const p of list) {
    if (!visited.has(p.id)) {
      result.push({ process: p, depth: 0, childCount: 0 });
    }
  }

  return result;
}
