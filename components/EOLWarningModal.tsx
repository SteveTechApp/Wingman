import React from 'react';
import InfoModal from './InfoModal';

interface EOLWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  message: string;
}

const EOLWarningModal: React.FC<EOLWarningModalProps> = ({ isOpen, onClose, onConfirm, message }) => {
  const footer = (
    <>
      <button type="button" onClick={onClose} className="bg-background hover:bg-border-color text-text-primary font-medium py-2 px-4 rounded-md">
        Cancel
      </button>
      <button type="button" onClick={onConfirm} className="bg-destructive hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md">
        Add Anyway
      </button>
    </>
  );

  return (
    <InfoModal isOpen={isOpen} onClose={onClose} className="max-w-md" title="Legacy Product Warning" footer={footer}>
      <div className="flex items-start gap-4">
          <div className="flex-shrink-0 h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
          </div>
          <div>
              <p className="text-sm text-text-secondary mt-2">{message}</p>
          </div>
      </div>
    </InfoModal>
  );
};

export default EOLWarningModal;