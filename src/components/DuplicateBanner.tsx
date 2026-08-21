interface DuplicateBannerProps {
  count: number;
  folders: number;
  memText: string;
  onSelect: () => void;
  onKill: () => void;
}

export function DuplicateBanner({ count, folders, memText, onSelect, onKill }: DuplicateBannerProps) {
  if (count === 0) return null;

  return (
    <div className="dup-banner">
      <div className="dup-banner-icon">!</div>
      <div className="dup-banner-text">
        <div className="dup-banner-title">
          {folders} {folders === 1 ? "pasta" : "pastas"} com instâncias duplicadas da mesma app
        </div>
        <div className="dup-banner-body">
          {count} {count === 1 ? "processo repete" : "processos repetem"} um comando que já está
          rodando · prendendo {memText}
        </div>
      </div>
      <div className="dup-banner-actions">
        <button className="btn-outline" onClick={onSelect}>
          selecionar duplicados
        </button>
        <button className="btn-warn" onClick={onKill}>
          matar {count}
        </button>
      </div>
    </div>
  );
}
