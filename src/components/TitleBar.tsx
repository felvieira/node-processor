import { getCurrentWindow } from "@tauri-apps/api/window";
import { getVersion } from "@tauri-apps/api/app";
import { useEffect, useState } from "react";

const appWindow = getCurrentWindow();

export function TitleBar() {
  const [version, setVersion] = useState("");
  useEffect(() => { getVersion().then(setVersion).catch(() => setVersion("")); }, []);
  return (
    <div className="titlebar" data-tauri-drag-region>
      <div className="titlebar-brand">
        <div className="titlebar-logo">n</div>
        <span className="titlebar-name">node-processor</span>
        <span className="titlebar-version">{version && `v${version}`}</span>
      </div>
      <div className="titlebar-controls">
        <button
          className="titlebar-btn"
          onClick={() => appWindow.minimize()}
          aria-label="Minimizar"
        >
          &#8212;
        </button>
        <button
          className="titlebar-btn"
          onClick={() => appWindow.toggleMaximize()}
          aria-label="Maximizar"
        >
          &#9633;
        </button>
        <button
          className="titlebar-btn titlebar-btn-close"
          onClick={() => appWindow.close()}
          aria-label="Ocultar na bandeja do sistema"
          title="Ocultar na bandeja. Para encerrar, use Sair no ícone ao lado do relógio."
        >
          &#10005;
        </button>
      </div>
    </div>
  );
}
