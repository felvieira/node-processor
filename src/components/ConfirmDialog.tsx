export interface ConfirmItem {
  cmd: string;
  meta: string;
  color: string;
}

export interface ConfirmState {
  title: string;
  body: string;
  cta: string;
  items: ConfirmItem[];
  more: boolean;
  moreText: string;
}

interface ConfirmDialogProps {
  confirm: ConfirmState;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmDialog({ confirm, onCancel, onConfirm }: ConfirmDialogProps) {
  return (
    <div className="modal-overlay">
      <div className="confirm-dialog">
        <div className="confirm-header">
          <div className="confirm-title">{confirm.title}</div>
          <div className="confirm-body">{confirm.body}</div>
        </div>
        <div className="confirm-items">
          {confirm.items.map((item, i) => (
            <div key={i} className="confirm-item">
              <span className="confirm-item-dot" style={{ background: item.color }} />
              <span className="mono confirm-item-cmd">{item.cmd}</span>
              <div style={{ flex: 1 }} />
              <span className="mono confirm-item-meta">{item.meta}</span>
            </div>
          ))}
          {confirm.more && <div className="mono confirm-more">{confirm.moreText}</div>}
        </div>
        <div className="confirm-footer">
          <button className="btn-outline" onClick={onCancel}>
            cancelar
          </button>
          <button className="btn-danger" onClick={onConfirm}>
            {confirm.cta}
          </button>
        </div>
      </div>
    </div>
  );
}
