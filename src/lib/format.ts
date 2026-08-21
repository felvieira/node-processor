export function formatBytes(bytes: number | null): string {
  if (bytes === null) return "—";
  const mb = bytes / (1024 * 1024);
  if (mb < 1024) return `${mb.toFixed(0)} MB`;
  return `${(mb / 1024).toFixed(1)} GB`;
}

export function formatCpu(percent: number | null): string {
  if (percent === null) return "—";
  return `${percent.toFixed(1)}%`;
}

export function formatUptime(startedAtEpoch: number | null, nowMs: number): string {
  if (startedAtEpoch === null) return "—";
  const seconds = Math.max(0, Math.floor(nowMs / 1000) - startedAtEpoch);
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}
