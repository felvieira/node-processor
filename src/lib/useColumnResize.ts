import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";

const STORAGE_KEY = "np.column.widths";

export type ColumnKey = "pid" | "ports" | "cpu" | "mem" | "uptime" | "type";

const DEFAULTS: Record<ColumnKey, number> = {
  type: 96,
  pid: 78,
  ports: 112,
  cpu: 96,
  mem: 92,
  uptime: 84,
};

const MIN_WIDTH = 50;
const MAX_WIDTH = 400;

function loadWidths(): Record<ColumnKey, number> {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw);
    return { ...DEFAULTS, ...parsed };
  } catch {
    return { ...DEFAULTS };
  }
}

export function useColumnResize() {
  const [widths, setWidths] = useState<Record<ColumnKey, number>>(loadWidths);
  const dragState = useRef<{ col: ColumnKey; startX: number; startWidth: number } | null>(null);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(widths));
    } catch {
      // localStorage indisponível, largura fica só em memória
    }
  }, [widths]);

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      const drag = dragState.current;
      if (!drag) return;
      const delta = e.clientX - drag.startX;
      const next = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, drag.startWidth + delta));
      setWidths((prev) => ({ ...prev, [drag.col]: next }));
    }

    function onMouseUp() {
      dragState.current = null;
    }

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  function startResize(col: ColumnKey, e: ReactMouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    dragState.current = { col, startX: e.clientX, startWidth: widths[col] };
  }

  const cssVars = Object.fromEntries(
    Object.entries(widths).map(([k, v]) => [`--w-${k}`, `${v}px`])
  ) as Record<string, string>;

  return { widths, startResize, cssVars };
}
