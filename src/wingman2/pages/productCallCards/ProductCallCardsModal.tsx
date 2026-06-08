import type { ReactNode } from "react";

type ProductCallCardsModalProps = {
  title: string;
  children: ReactNode;
  onClose: () => void;
};

export function ProductCallCardsModal({ title, children, onClose }: ProductCallCardsModalProps) {
  return (
    <div className="wm-pcc-modal-backdrop" role="presentation">
      <section className="wm-pcc-modal" role="dialog" aria-modal="true" aria-label={title}>
        <header className="wm-pcc-modal-header">
          <h2>{title}</h2>
          <button type="button" onClick={onClose}>
            Close
          </button>
        </header>
        <div className="wm-pcc-modal-body">{children}</div>
      </section>
    </div>
  );
}