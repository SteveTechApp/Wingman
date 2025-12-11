import React, { ReactNode, useEffect, useRef } from 'react';

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  title?: ReactNode;
  footer?: ReactNode;
}

const InfoModal: React.FC<InfoModalProps> = ({ isOpen, onClose, children, className, title, footer }) => {
  // Use ref to avoid re-creating event listeners when onClose changes
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            onCloseRef.current();
        }
    };
    if (isOpen) {
        window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
        window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]); // Removed onClose from dependencies

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
        onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-modal-backdrop z-50 animate-fade-in-fast flex items-center justify-center p-4 sm:p-6 md:p-8"
      role="dialog"
      aria-modal="true"
      onClick={handleBackdropClick}
    >
      <div 
        className={`bg-background rounded-lg shadow-2xl w-full flex flex-col max-h-[90vh] border border-border-color ${className || ''}`} 
        onClick={e => e.stopPropagation()}
      >
        {title && (
            <div className="flex justify-between items-center p-4 border-b border-border-color flex-shrink-0">
                <div className="text-xl sm:text-2xl font-bold text-text-primary truncate pr-4">{title}</div>
                <button type="button" onClick={onClose} className="text-text-secondary hover:text-text-primary p-2 rounded-full hover:bg-input-bg transition-colors">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
        )}
        <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar flex-grow min-h-0">
            {children}
        </div>
        {footer && (
            <div className="p-4 flex justify-end gap-3 border-t border-border-color flex-shrink-0 bg-background-secondary rounded-b-lg">
                {footer}
            </div>
        )}
      </div>
    </div>
  );
};

export default InfoModal;