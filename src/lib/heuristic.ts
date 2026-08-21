import type { AiVerdictItem, ProcessInfo } from "./types";
import { findRedundantIds, siblingsOf, newestOf } from "./duplicates";

export function runLocalHeuristic(list: ProcessInfo[]): AiVerdictItem[] {
  const redundant = findRedundantIds(list);

  return list
    .filter((p) => p.pid !== null)
    .map((p): AiVerdictItem => {
      const pid = p.pid as number;

      if (redundant.has(p.id)) {
        const sibling = newestOf(siblingsOf(p, list));
        return {
          pid,
          verdict: "safe",
          reason: `Instância redundante do mesmo comando nesta pasta. A mais recente (PID ${sibling.pid}) já está servindo — esta só está prendendo porta e memória.`,
        };
      }

      if (
        p.kind === "node" &&
        (p.cpu_percent ?? 0) < 0.5 &&
        p.ports.length === 0 &&
        p.origin === "untracked"
      ) {
        return {
          pid,
          verdict: "safe",
          reason: "Processo auxiliar órfão: sem portas, sem CPU e fora de qualquer projeto do registry. Sobrou de uma sessão anterior.",
        };
      }

      if (p.kind === "ai_agent") {
        return {
          pid,
          verdict: "careful",
          reason: "Agente de IA ativo. Pode estar no meio de uma tarefa — matar descarta o contexto da sessão.",
        };
      }

      if (p.kind === "docker") {
        return {
          pid,
          verdict: "keep",
          reason: "Container com estado. Encerrar por SIGKILL pode deixar conexões abertas e migrações pela metade — use docker stop se precisar.",
        };
      }

      if ((p.cpu_percent ?? 0) > 20) {
        return {
          pid,
          verdict: "keep",
          reason: `Consumindo ${(p.cpu_percent ?? 0).toFixed(1)}% de CPU: está trabalhando de verdade agora, não é sobra de sessão.`,
        };
      }

      if (p.origin === "untracked") {
        return {
          pid,
          verdict: "careful",
          reason: "Não rastreado pelo registry — não há como saber qual comando original o iniciou. Confira as portas antes.",
        };
      }

      return {
        pid,
        verdict: "careful",
        reason: "Único processo desse tipo na pasta. Provavelmente é o dev server que você está usando.",
      };
    });
}
