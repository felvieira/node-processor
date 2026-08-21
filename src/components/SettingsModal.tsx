import { useState } from "react";
import type { AiProvider, AiSettings } from "../lib/types";

const PROVIDERS: Record<AiProvider, { name: string; note: string; keyHint: string; models: string[] }> = {
  openrouter: {
    name: "OpenRouter",
    note: "1 chave, vários modelos",
    keyHint: "sk-or-v1-…",
    models: ["anthropic/claude-sonnet-4.5", "openai/gpt-4.1-mini", "google/gemini-2.5-flash"],
  },
  openai: {
    name: "OpenAI",
    note: "api.openai.com",
    keyHint: "sk-…",
    models: ["gpt-4.1-mini", "gpt-4.1", "o4-mini"],
  },
  demo: { name: "Modo local", note: "heurística, sem rede", keyHint: "", models: [] },
};

interface SettingsModalProps {
  settings: AiSettings;
  processCount: number;
  onCancel: () => void;
  onSave: (s: AiSettings) => void;
}

export function SettingsModal({ settings, processCount, onCancel, onSave }: SettingsModalProps) {
  const [draft, setDraft] = useState<AiSettings>(settings);
  const providerMeta = PROVIDERS[draft.provider];
  const needsKey = draft.provider !== "demo";

  return (
    <div className="modal-overlay modal-overlay-center">
      <div className="settings-modal">
        <div className="settings-header">
          <div className="settings-title">Consultor de IA</div>
          <button className="icon-btn-plain" onClick={onCancel}>
            &#10005;
          </button>
        </div>

        <div className="settings-body">
          <div className="settings-field">
            <div className="detail-label">provedor</div>
            <div className="provider-grid">
              {(Object.keys(PROVIDERS) as AiProvider[]).map((key) => {
                const on = draft.provider === key;
                return (
                  <button
                    key={key}
                    className={`provider-card ${on ? "provider-card-active" : ""}`}
                    onClick={() =>
                      setDraft((d) => ({ ...d, provider: key, model: PROVIDERS[key].models[0] ?? "" }))
                    }
                  >
                    <span className="provider-name">{PROVIDERS[key].name}</span>
                    <span className="mono provider-note">{PROVIDERS[key].note}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {needsKey && (
            <>
              <div className="settings-field">
                <div className="settings-field-header">
                  <div className="detail-label">chave de api</div>
                  <span className="mono settings-hint">{providerMeta.keyHint}</span>
                </div>
                <input
                  type="password"
                  className="settings-input mono"
                  placeholder={providerMeta.keyHint}
                  value={draft.apiKey}
                  onChange={(e) => setDraft((d) => ({ ...d, apiKey: e.target.value }))}
                />
                <div className="settings-note">
                  Guardada localmente na sua máquina. Nunca sai daqui a não ser na chamada ao
                  provedor escolhido.
                </div>
              </div>

              <div className="settings-field">
                <div className="detail-label">modelo</div>
                <input
                  className="settings-input mono"
                  value={draft.model}
                  onChange={(e) => setDraft((d) => ({ ...d, model: e.target.value }))}
                />
                <div className="model-chip-row">
                  {providerMeta.models.map((m) => (
                    <button
                      key={m}
                      className="model-chip mono"
                      onClick={() => setDraft((d) => ({ ...d, model: m }))}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          <div className="settings-sent-box">
            <div className="settings-sent-title">O que é enviado ao modelo</div>
            <div className="mono settings-sent-lines">
              <div>pasta do projeto · comando · PID</div>
              <div>portas em escuta · CPU% · memória</div>
              <div>tempo ativo · rastreado no registry</div>
              <div>{processCount} linhas de inventário por análise</div>
            </div>
            <div className="settings-note">
              Nunca é enviado: conteúdo de arquivos, código-fonte, variáveis de ambiente ou o
              corpo dos logs.
            </div>
          </div>
        </div>

        <div className="settings-footer">
          <button
            className="settings-clear"
            onClick={() => setDraft((d) => ({ ...d, apiKey: "", provider: "demo" }))}
          >
            apagar chave
          </button>
          <div className="settings-footer-actions">
            <button className="btn-outline" onClick={onCancel}>
              cancelar
            </button>
            <button className="btn-primary" onClick={() => onSave(draft)}>
              salvar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export { PROVIDERS };
