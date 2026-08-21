import type { Kind, ProcessInfo } from "./types";

export const TYPE_META: Record<Kind, { label: string; color: string; glow: string; bg: string }> = {
  node: { label: "Node", color: "#86d95c", glow: "rgba(134,217,92,0.5)", bg: "#16240f" },
  python: { label: "Python", color: "#56a8ff", glow: "rgba(86,168,255,0.5)", bg: "#0f1c2e" },
  docker: { label: "Docker", color: "#2fc4e8", glow: "rgba(47,196,232,0.5)", bg: "#0d2129" },
  ai_agent: { label: "Agente IA", color: "#c08cff", glow: "rgba(192,140,255,0.5)", bg: "#1d1330" },
};

export const KIND_ORDER: Kind[] = ["docker", "node", "python", "ai_agent"];

export function folderLabel(p: ProcessInfo): string {
  return p.folder ?? p.name;
}

export function cpuColor(cpu: number | null): string {
  const v = cpu ?? 0;
  if (v > 25) return "#ff8079";
  if (v > 8) return "#f2b13c";
  return "#9aa5b4";
}

export function cpuBarWidth(cpu: number | null): string {
  const v = cpu ?? 0;
  return `${Math.min(100, Math.round(v * 2.6))}%`;
}

function baseName(token: string): string {
  return token.split(/[\\/]/).pop() || token;
}

/**
 * Comandos "não rastreados" vem do argv bruto do processo (via sysinfo) e
 * frequentemente repetem o caminho do executavel duas vezes (ex: node.exe
 * seguido do path completo pra node.exe de novo antes do script real).
 * Aqui reduzimos pra "executavel arquivo-final", mantendo `full` intacto
 * pro tooltip/detalhe.
 */
export function formatCommand(raw: string): { short: string; full: string } {
  const full = raw.trim();
  if (!full) return { short: "", full: "" };

  const tokens = full.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return { short: full, full };

  const exeToken = tokens[0];
  const exeName = baseName(exeToken);

  const dedupedRest = tokens.slice(1).filter((t) => baseName(t).toLowerCase() !== exeName.toLowerCase());

  if (dedupedRest.length === 0) return { short: exeName, full };

  const lastArg = dedupedRest[dedupedRest.length - 1];
  const lastArgShort = baseName(lastArg);

  return { short: `${exeName} ${lastArgShort}`, full };
}
