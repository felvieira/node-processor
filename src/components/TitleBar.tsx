import { getCurrentWindow } from "@tauri-apps/api/window";

const appWindow = getCurrentWindow();

export function TitleBar() {
  return (
    <div className="titlebar" data-tauri-drag-region>
      <div className="titlebar-brand">
        <div className="titlebar-logo">n</div>
        <span className="titlebar-name">node-processor</span>
        <span className="titlebar-version">v0.5.0</span>
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
          aria-label="Fechar"
        >
          &#10005;
        </button>
      </div>
    </div>
  );
}
