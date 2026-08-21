import { useState } from "react";
import type { CleanupProfile } from "../lib/types";

interface ProfileBarProps {
  profiles: CleanupProfile[];
  onApply: (profile: CleanupProfile) => void;
  onSaveCurrent: (name: string) => void;
  onDelete: (id: string) => void;
}

export function ProfileBar({ profiles, onApply, onSaveCurrent, onDelete }: ProfileBarProps) {
  const [naming, setNaming] = useState(false);
  const [draftName, setDraftName] = useState("");

  function confirmSave() {
    const name = draftName.trim();
    if (!name) return;
    onSaveCurrent(name);
    setDraftName("");
    setNaming(false);
  }

  return (
    <div className="profile-bar">
      <span className="profile-bar-label mono">perfis</span>
      {profiles.map((p) => (
        <div key={p.id} className="profile-chip">
          <button className="profile-chip-apply" onClick={() => onApply(p)}>
            {p.name}
          </button>
          <button className="profile-chip-remove" onClick={() => onDelete(p.id)} title="remover perfil">
            &#10005;
          </button>
        </div>
      ))}
      {naming ? (
        <div className="profile-naming">
          <input
            autoFocus
            className="profile-name-input"
            value={draftName}
            placeholder="nome do perfil"
            onChange={(e) => setDraftName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") confirmSave();
              if (e.key === "Escape") {
                setNaming(false);
                setDraftName("");
              }
            }}
          />
          <button className="btn-outline" onClick={confirmSave}>
            salvar
          </button>
        </div>
      ) : (
        <button className="btn-outline" onClick={() => setNaming(true)}>
          + salvar filtro atual
        </button>
      )}
    </div>
  );
}
